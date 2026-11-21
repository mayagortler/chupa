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

console.log('bot-engine: ok');
