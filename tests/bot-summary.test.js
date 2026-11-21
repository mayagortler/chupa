'use strict';
var assert = require('assert');
var data = require('../bot/site-data.js');
var engine = require('../bot/engine.js');
var summary = require('../bot/summary.js');
var C = require('../bot/copy.js');
var D = data.D, L = data.L, Dir = data.Dir;

var PHONE = '972501234567', NOW = Date.UTC(2026, 10, 21);
function ch(id) { return { from: PHONE, type: 'choice', id: id, text: id, now: NOW }; }
function tx(t) { return { from: PHONE, type: 'text', text: t, now: NOW }; }
function run(state, inputs) { var r = { state: state, out: [], notify: null }; inputs.forEach(function (i) { r = engine.step(r.state, i); }); return r; }

/* a full wedding conversation, set mode */
var r = run(engine.step(null, tx('היי')).state, [
  ch('ev:Wedding'), ch('mode:set'), tx('10/6/2027'),
  ch('dq:mood:1'), ch('dq:pal:2'), ch('dq:font:0'), ch('dq:el:done'), tx('בלי ורוד'),
  ch('wh:both'), ch('hv:photos'), ch('hv:done'), tx('חתונת הגן'), tx('דנה')
]);
assert.strictEqual(r.notify.kind, 'complete');
var E = D.events.Wedding, q = L.quote(E, r.state.S);
var lines = r.notify.summary.split('\n');
assert.strictEqual(lines[0], 'פנייה חדשה מהבוט');
assert.strictEqual(lines[1], 'שם הלקוח: דנה');
assert.strictEqual(lines[2], 'טלפון: https://wa.me/972501234567');
assert.strictEqual(lines[3], 'אירוע: ' + E.what);
assert.strictEqual(lines[4], 'תאריך: 10/06/2027');
assert.strictEqual(lines[5], 'בחירה: ' + q.names.join(', ') + ' (' + q.totalText + ')');
var dirLines = Dir.lines(r.state.dir, D.direction);
assert.deepStrictEqual(lines.slice(6, 6 + dirLines.length), dirLines);
assert.ok(dirLines.length >= 3, 'mood, palette and font lines are expected');
var rest = lines.slice(6 + dirLines.length);
assert.ok(rest.indexOf('שם האירוע: חתונת הגן') >= 0, rest.join('|'));
assert.ok(rest.some(function (l) { return l.indexOf('יוצג: ') === 0; }));
assert.ok(rest.some(function (l) { return l.indexOf('כבר יש לנו: ') === 0; }));
assert.ok(!rest.some(function (l) { return l.indexOf('תאריך: ') === 0; }), 'the date appears once');

/* the engine's handoff builds a partial summary that remembers where the customer stopped */
var p = run(engine.step(null, tx('היי')).state, [ch('ev:Wedding'), ch('mode:set'), tx('מאיה')]);
assert.strictEqual(p.notify.kind, 'partial');
var pl = p.notify.summary.split('\n');
assert.strictEqual(pl[0], 'שיחה שנעצרה, הלקוח ביקש נציגה');
assert.strictEqual(pl[pl.length - 1], 'נעצר בשלב: ' + C.phaseLabel.date);

/* Other shows the customer's own event name and a custom quote */
var o = run(engine.step(null, tx('היי')).state, [ch('ev:Other'), tx('יום הולדת סודי'), tx('1/1/2027'), ch('dq:mood:0'), ch('dq:pal:0'), ch('dq:font:0'), ch('dq:el:done'), ch('skip'), ch('wh:wa'), ch('hv:done'), ch('skip'), tx('נועה')]);
var ol = o.notify.summary.split('\n');
assert.ok(ol.indexOf('אירוע: יום הולדת סודי') >= 0, ol.join('|'));
assert.ok(ol.some(function (l) { return l.indexOf('בחירה: עיצוב אישי (') === 0; }), ol.join('|'));

/* a huge note is cut, the header survives */
var big = JSON.parse(JSON.stringify(r.state));
big.dir.notes.gen = new Array(10001).join('א');
var out = summary.build(big, 'complete');
assert.ok(out.length <= 4000, String(out.length));
assert.strictEqual(out.split('\n')[0], 'פנייה חדשה מהבוט');

/* template parameters must be a single line */
var one = summary.oneLine('שורה א\nשורה ב\t\tשורה   ג');
assert.ok(!/[\n\t]/.test(one), JSON.stringify(one));
assert.ok(one.indexOf('  ') < 0);
assert.ok(one.indexOf('שורה א | שורה ב') === 0, one);

console.log('bot-summary: ok');
