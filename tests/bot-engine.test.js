'use strict';
var assert = require('assert');
var data = require('../bot/site-data.js');
var engine = require('../bot/engine.js');
var D = data.D, L = data.L;

var PHONE = '972501234567';
function say(state, text) { return engine.step(state, { from: PHONE, type: 'text', text: text }); }
function pick(state, id) { return engine.step(state, { from: PHONE, type: 'choice', id: id, text: id }); }
function last(r) { return r.out[r.out.length - 1]; }

/* first message starts at the event list */
var r = say(null, 'היי');
assert.strictEqual(r.state.phase, 'event');
var list = last(r);
assert.strictEqual(list.kind, 'list');
assert.strictEqual(list.rows.length, 10);
assert.deepStrictEqual(list.rows.map(function (x) { return x.id; }),
  D.order.slice(0, 9).map(function (k) { return 'ev:' + k; }).concat(['ev:more']));
assert.strictEqual(r.notify, null);

/* "more" shows the remaining events */
r = pick(r.state, 'ev:more');
assert.strictEqual(r.state.phase, 'event2');
assert.deepStrictEqual(last(r).rows.map(function (x) { return x.id; }), ['ev:Corporate', 'ev:Other']);

/* Wedding offers the three modes, set button shows the bundle price from quote */
r = pick(say(null, 'היי').state, 'ev:Wedding');
assert.strictEqual(r.state.phase, 'mode');
var modes = last(r);
assert.strictEqual(modes.kind, 'buttons');
assert.deepStrictEqual(modes.buttons.map(function (b) { return b.id; }), ['mode:set', 'mode:build', 'mode:custom']);
var q = L.quote(D.events.Wedding, L.initialState(D.events.Wedding));
assert.ok(modes.buttons[0].title.indexOf(L.fmt(q.price)) >= 0, modes.buttons[0].title);

/* choosing the set skips items and goes to date */
var set = pick(r.state, 'mode:set');
assert.strictEqual(set.state.phase, 'date');
assert.strictEqual(set.state.S.mode, 'set');

/* Other asks for a free-text event name, then goes to custom with no items */
r = pick(say(null, 'היי').state, 'ev:more');
r = pick(r.state, 'ev:Other');
assert.strictEqual(r.state.phase, 'eventName');
r = say(r.state, 'יום הולדת סודי');
assert.strictEqual(r.state.S.eventName, 'יום הולדת סודי');
assert.strictEqual(r.state.S.mode, 'custom');
assert.strictEqual(r.state.phase, 'date');

/* build mode: items list with a done row; toggling marks with a check */
r = pick(pick(say(null, 'היי').state, 'ev:Wedding').state, 'mode:build');
assert.strictEqual(r.state.phase, 'items');
var items = last(r);
assert.strictEqual(items.kind, 'list');
var ids = D.events.Wedding.items.map(function (x) { return 'it:' + x.id; }).concat(['it:done']);
assert.deepStrictEqual(items.rows.map(function (x) { return x.id; }), ids);

/* done with nothing selected re-asks with the reason */
var empty = pick(r.state, 'it:done');
assert.strictEqual(empty.state.phase, 'items');
assert.ok(empty.out.some(function (m) { return m.kind === 'text' && m.body.indexOf(L.canAdvance(D.events.Wedding, empty.state.S, 'items').why) >= 0; }));

/* toggling an item re-sends the list with a check mark and then done advances */
var firstId = D.events.Wedding.items[0].id;
var tog = pick(r.state, 'it:' + firstId);
assert.strictEqual(tog.state.S.sel[firstId], true);
assert.strictEqual(tog.state.phase, 'items');
assert.ok(last(tog).rows[0].title.indexOf('✓') === 0, last(tog).rows[0].title);
var untog = pick(tog.state, 'it:' + firstId);
assert.ok(!untog.state.S.sel[firstId]);
assert.strictEqual(pick(tog.state, 'it:done').state.phase, 'date');

/* radio group: picking one video item deselects the other */
var vids = D.events.Graduation.items.filter(function (x) { return x.group === 'video'; });
r = pick(pick(say(null, 'x').state, 'ev:Graduation').state, 'mode:build');
r = pick(r.state, 'it:' + vids[0].id);
r = pick(r.state, 'it:' + vids[1].id);
assert.ok(!r.state.S.sel[vids[0].id] && r.state.S.sel[vids[1].id]);

/* row titles never exceed Meta's 24 chars */
D.order.forEach(function (k) {
  if (!D.events[k].items.length) { return; }
  var s = pick(pick(say(null, 'x').state, 'ev:' + k).state, 'mode:build').state;
  var sel = pick(s, 'it:' + D.events[k].items[0].id);
  last(sel).rows.forEach(function (row) { assert.ok(row.title.length <= 24, k + ': ' + row.title); });
});

/* input must not mutate the previous state */
var s0 = say(null, 'x').state, snap = JSON.stringify(s0);
pick(s0, 'ev:Wedding');
assert.strictEqual(JSON.stringify(s0), snap);

/* ---------- Task 2: the rest of the flow ---------- */
var NOW = Date.UTC(2026, 10, 21);
function sayAt(state, text) { return engine.step(state, { from: PHONE, type: 'text', text: text, now: NOW }); }
function toDate(ev) {
  var s = pick(say(null, 'x').state, 'ev:' + ev).state;
  return pick(s, 'mode:set').state;
}
function texts(r) { return r.out.filter(function (m) { return m.kind === 'text'; }).map(function (m) { return m.body; }).join('\n'); }

function assertLimits(m, where) {
  if (m.kind === 'text') { assert.ok(m.body.length > 0 && m.body.length <= 4096, where + ' text'); return; }
  assert.ok(m.body.length > 0 && m.body.length <= 1024, where + ' body: ' + m.body.length);
  if (m.kind === 'buttons') {
    assert.ok(m.buttons.length >= 1 && m.buttons.length <= 3, where + ' buttons count');
    m.buttons.forEach(function (b) { assert.ok(b.title.length <= 20, where + ' button title: ' + b.title); });
  } else {
    assert.strictEqual(m.kind, 'list', where);
    assert.ok(m.button.length <= 20, where + ' list button');
    assert.ok(m.rows.length >= 1 && m.rows.length <= 10, where + ' rows count: ' + m.rows.length);
    m.rows.forEach(function (x) {
      assert.ok(x.title.length <= 24, where + ' row title: ' + x.title);
      assert.ok(!x.description || x.description.length <= 72, where + ' row desc: ' + x.description);
    });
  }
}

/* date parsing */
r = sayAt(toDate('Wedding'), '10/6/2027');
assert.strictEqual(r.state.S.date, '2027-06-10');
assert.strictEqual(r.state.phase, 'dir');
r = sayAt(toDate('Wedding'), '10.6');
assert.strictEqual(r.state.S.date, '2027-06-10', 'a date without a year means the next occurrence');

/* garbled date: re-ask once, a second miss hands off */
var g1 = sayAt(toDate('Wedding'), 'בעוד חודש');
assert.strictEqual(g1.state.phase, 'date');
assert.ok(texts(g1).indexOf('לא הבנתי') >= 0);
var g2 = sayAt(g1.state, 'בקרוב');
assert.strictEqual(g2.state.phase, 'done');
assert.strictEqual(g2.notify.kind, 'stuck', 'two misses is a stuck chat, not a request for Maya');

/* a past date is accepted with the dateInfo warning */
r = sayAt(toDate('Wedding'), '1/1/2020');
assert.strictEqual(r.state.S.date, '2020-01-01');
assert.ok(texts(r).indexOf('כבר עבר') >= 0, texts(r));

/* "we have not decided yet" moves on with an empty date */
r = pick(toDate('Wedding'), 'date:unknown');
assert.strictEqual(r.state.S.date, '');
assert.strictEqual(r.state.phase, 'dir');

/* direction questions: single choice moves on, el is multi with a done row */
var dq = D.direction.questions;
r = sayAt(toDate('Wedding'), '10/6/2027');
assert.strictEqual(r.state.dirIdx, 0);
assert.strictEqual(last(r).rows[0].id, 'dq:' + dq[0].k + ':0');
r = pick(r.state, 'dq:mood:1');
assert.deepStrictEqual(r.state.dir.sel.mood, [1]);
assert.strictEqual(r.state.dirIdx, 1);
r = pick(pick(pick(r.state, 'dq:pal:2').state, 'dq:font:0').state, 'dq:el:0');
assert.strictEqual(r.state.phase, 'dir');
assert.strictEqual(r.state.dirIdx, 3);
assert.ok(last(r).rows[0].title.indexOf('✓') === 0);
r = pick(pick(r.state, 'dq:el:2').state, 'dq:el:done');
assert.deepStrictEqual(r.state.dir.sel.el, [0, 2]);
assert.strictEqual(r.state.phase, 'gen');

/* handoff words in any phase stop the bot and send a partial summary */
r = pick(pick(sayAt(toDate('Wedding'), '10/6/2027').state, 'dq:mood:1').state, 'dq:pal:1');
var h = say(r.state, 'אפשר לדבר עם מאיה?');
assert.strictEqual(h.state.phase, 'done');
assert.strictEqual(h.state.handedOff, true);
assert.strictEqual(h.notify.kind, 'partial');
/* but a name or a title that merely contains the word does not */
var free = pick(pick(pick(pick(pick(pick(pick(sayAt(toDate('Wedding'), '10/6/2027').state, 'dq:mood:1').state, 'dq:pal:1').state, 'dq:font:0').state, 'dq:el:done').state, 'skip').state, 'wh:wa').state, 'hv:done').state;
assert.strictEqual(free.phase, 'title');
var t2 = say(free, 'החתונה של מאיה ודני');
assert.strictEqual(t2.state.phase, 'name');
assert.strictEqual(t2.notify, null);

/* images and other media count as unexpected input and never throw */
var img = engine.step(say(null, 'x').state, { from: PHONE, type: 'other', text: '' });
assert.strictEqual(img.state.phase, 'event');
assert.ok(texts(img).indexOf('לקרוא רק טקסט') >= 0, texts(img));

/* a full wedding flow ends with a complete notification and a closing text */
var f = sayAt(toDate('Wedding'), '10/6/2027').state;
f = pick(pick(pick(pick(f, 'dq:mood:1').state, 'dq:pal:2').state, 'dq:font:0').state, 'dq:el:done').state;
f = pick(say(f, 'בלי הערות').state, 'wh:both').state;
f = pick(pick(f, 'hv:photos').state, 'hv:done').state;
f = pick(f, 'skip').state;
assert.strictEqual(f.phase, 'name');
r = say(f, 'דנה');
assert.strictEqual(r.state.phase, 'done');
assert.strictEqual(r.state.name, 'דנה');
assert.strictEqual(r.state.handedOff, true);
assert.strictEqual(r.notify.kind, 'complete');
assert.ok(texts(r).length > 0);

/* the profile name is offered as a button */
var withProfile = engine.step(null, { from: PHONE, type: 'text', text: 'x', name: 'דנה כהן' }).state;
assert.strictEqual(withProfile.profileName, 'דנה כהן');

/* after done the bot is silent */
var quiet = say(r.state, 'שלום?');
assert.deepStrictEqual(quiet.out, []);
assert.strictEqual(quiet.notify, null);

/* every message of every event flow respects Meta's limits */
D.order.forEach(function (k) {
  var s = say(null, 'x'), all = s.out.slice();
  function go(inp) { s = engine.step(s.state, inp); all = all.concat(s.out); }
  var ch = function (id) { return { from: PHONE, type: 'choice', id: id, text: id, now: NOW }; };
  var tx = function (t) { return { from: PHONE, type: 'text', text: t, now: NOW }; };
  go(ch('ev:' + k));
  if (s.state.phase === 'eventName') { go(tx('יום הולדת סודי')); }
  if (s.state.phase === 'mode') { go(ch('mode:build')); }
  if (s.state.phase === 'items') { D.events[k].items.forEach(function (x) { go(ch('it:' + x.id)); }); go(ch('it:done')); }
  go(tx('10/6/2027'));
  dq.forEach(function (q) { go(ch('dq:' + q.k + ':0')); if (q.multi) { go(ch('dq:' + q.k + ':done')); } });
  go(tx('הערה'));
  go(ch('wh:screen')); go(ch('hv:song')); go(ch('hv:done')); go(tx('כותרת'));
  go(tx('דנה'));
  assert.strictEqual(s.state.phase, 'done', k + ' did not finish, stuck at ' + s.state.phase);
  all.forEach(function (m, i) { assertLimits(m, k + '#' + i); });
});

/* ---------- review fixes ---------- */
/* media in a free-text step: a media-specific reply, never counted as a miss, never a handoff */
var nameState = (function () {
  var f2 = sayAt(toDate('Wedding'), '10/6/2027').state;
  f2 = pick(pick(pick(pick(f2, 'dq:mood:1').state, 'dq:pal:2').state, 'dq:font:0').state, 'dq:el:done').state;
  f2 = pick(say(f2, 'בלי הערות').state, 'wh:both').state;
  f2 = pick(pick(f2, 'hv:done').state, 'skip').state;
  return f2;
})();
assert.strictEqual(nameState.phase, 'name');
var m1 = engine.step(nameState, { from: PHONE, type: 'other', text: '' });
var m2 = engine.step(m1.state, { from: PHONE, type: 'other', text: '' });
assert.strictEqual(m2.state.phase, 'name');
assert.strictEqual(m2.notify, null);
assert.ok(texts(m2).indexOf('לקרוא רק טקסט') >= 0);
assert.strictEqual(m2.state.retries, 0);

/* the retry wording fits the step: text steps do not say "pick from the options" */
var badName = engine.step(say(nameState, '   ').state, { from: PHONE, type: 'choice', id: 'zzz', text: 'zzz' });
assert.ok(texts(badName).indexOf('לבחור מהאפשרויות') < 0, texts(badName));
var badDate = sayAt(toDate('Wedding'), 'בעוד חודש');
assert.ok(texts(badDate).indexOf('10/6/2027') >= 0, texts(badDate));
assert.ok(texts(badDate).indexOf('לבחור מהאפשרויות') < 0, texts(badDate));

/* asking for Maya in words stays a "partial" request */
assert.strictEqual(say(nameState, 'נציגה').notify.kind, 'partial');

/* a site chat that already has the palette does not get asked about it again */
(function () {
  var entryMod = require('../bot/entry.js');
  var Ev = D.events.Wedding, S = L.initialState(Ev), d = data.Dir.emptyState(D.direction);
  S.date = '2027-06-10'; S.where = 'wa';
  data.Dir.pick(d, D.direction.questions[1], 2); /* pal only */
  var msg = L.message(Ev, S, data.Dir.lines(d, D.direction));
  assert.ok(entryMod.prefill(msg));
  var st = engine.step(null, { from: PHONE, type: 'text', text: msg, now: NOW }).state;
  assert.strictEqual(st.phase, 'dir');
  assert.strictEqual(st.dirIdx, 0);
  var after = pick(st, 'dq:mood:1');
  assert.strictEqual(after.state.dirIdx, 2, 'pal is already answered: the next question is the font');
  assert.strictEqual(last(after).rows[0].id, 'dq:font:0');
})();

console.log('bot-engine: ok');
