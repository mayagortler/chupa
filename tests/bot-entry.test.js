'use strict';
var assert = require('assert');
var data = require('../bot/site-data.js');
var entry = require('../bot/entry.js');
var engine = require('../bot/engine.js');
var D = data.D, L = data.L, Dir = data.Dir;

var PHONE = '972501234567', NOW = Date.UTC(2026, 10, 21);
function siteMessage(key, mutate) {
  var E = D.events[key], S = L.initialState(E), d = Dir.emptyState(D.direction);
  S.date = '2027-06-10'; S.title = 'חתונת הגן'; S.where = 'both'; S.have = { photos: true, song: true };
  Dir.pick(d, D.direction.questions[0], 1);      /* mood */
  Dir.pick(d, D.direction.questions[1], 2);      /* pal */
  Dir.pick(d, D.direction.questions[2], 0);      /* font */
  Dir.pick(d, D.direction.questions[3], 0);      /* el */
  Dir.pick(d, D.direction.questions[3], 2);
  if (mutate) { mutate(E, S, d); }
  return { text: L.message(E, S, Dir.lines(d, D.direction)), S: S, d: d };
}

/* round trip for every event and every mode */
D.order.forEach(function (k) {
  var E = D.events[k];
  var modes = L.isOther(E) ? [null] : ['set', 'build', 'custom'];
  modes.forEach(function (mode) {
    var m = siteMessage(k, function (E2, S) {
      if (L.isOther(E2)) { S.eventName = 'יום הולדת סודי'; return; }
      S.mode = mode;
      S.sel = mode === 'build' ? (function () { var o = {}; o[E2.items[0].id] = true; return o; })() : (mode === 'set' ? S.sel : {});
    });
    var p = entry.prefill(m.text);
    var tag = k + '/' + mode;
    assert.ok(p, tag + ': no match for: ' + m.text);
    assert.strictEqual(p.ev, k, tag);
    assert.strictEqual(p.S.date, '2027-06-10', tag);
    assert.strictEqual(p.S.title, 'חתונת הגן', tag);
    assert.strictEqual(p.S.where, 'both', tag);
    assert.deepStrictEqual(p.S.have, { photos: true, song: true }, tag);
    assert.deepStrictEqual(p.dir.sel, m.d.sel, tag);
    if (L.isOther(E)) { assert.strictEqual(p.S.eventName, 'יום הולדת סודי', tag); assert.strictEqual(p.S.mode, 'custom', tag); }
    else {
      assert.strictEqual(p.S.mode, mode, tag);
      if (mode === 'build') { assert.deepStrictEqual(p.S.sel, m.S.sel, tag); }
    }
  });
});

/* unrelated or altered text is not a site message */
assert.strictEqual(entry.prefill('היי'), null);
assert.strictEqual(entry.prefill(''), null);
assert.strictEqual(entry.prefill('היי, אשמח לעיצוב לדבר שלא קיים.'), null);

/* a message with nothing filled in: only the event is known */
var bare = entry.prefill('היי, אשמח לעיצוב ל' + D.events.Wedding.what + '. אשמח לשמוע אפשרויות.');
assert.strictEqual(bare.ev, 'Wedding');
assert.ok(!('mode' in bare.S) && !bare.S.date);

/* engine: a full site message skips event, mode, date and direction, and asks for the name */
var full = siteMessage('Wedding', function (E, S) { S.mode = 'set'; });
var r = engine.step(null, { from: PHONE, type: 'text', text: full.text, now: NOW });
assert.strictEqual(r.state.ev, 'Wedding');
assert.strictEqual(r.state.S.date, '2027-06-10');
assert.strictEqual(r.state.phase, 'name');
assert.strictEqual(r.out[0].kind, 'text');
assert.ok(r.out[0].body.indexOf(D.events.Wedding.what) >= 0, r.out[0].body);
assert.ok(r.out.length >= 2);

/* engine: the first missing piece decides where the bot starts */
var noDate = siteMessage('Wedding', function (E, S) { S.mode = 'set'; S.date = ''; });
assert.strictEqual(engine.step(null, { from: PHONE, type: 'text', text: noDate.text, now: NOW }).state.phase, 'date');
var onlyEvent = 'היי, אשמח לעיצוב ל' + D.events.Wedding.what + '. אשמח לשמוע אפשרויות.';
assert.strictEqual(engine.step(null, { from: PHONE, type: 'text', text: onlyEvent, now: NOW }).state.phase, 'mode');
var noDir = siteMessage('Wedding', function (E, S, d) { S.mode = 'set'; d.sel.mood = []; });
var nd = engine.step(null, { from: PHONE, type: 'text', text: noDir.text, now: NOW }).state;
assert.strictEqual(nd.phase, 'dir');
assert.strictEqual(nd.dirIdx, 0);
var noWhere = siteMessage('Wedding', function (E, S) { S.mode = 'set'; S.where = ''; S.have = {}; });
assert.strictEqual(engine.step(null, { from: PHONE, type: 'text', text: noWhere.text, now: NOW }).state.phase, 'where');

/* "היי" still starts the event list */
var hi = engine.step(null, { from: PHONE, type: 'text', text: 'היי', now: NOW });
assert.strictEqual(hi.state.phase, 'event');
assert.strictEqual(hi.out[hi.out.length - 1].kind, 'list');

console.log('bot-entry: ok');
