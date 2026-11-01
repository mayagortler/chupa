'use strict';
var assert = require('assert');
global.window = {};
require('../assets/data.js');
var L = require('../assets/builder-logic.js');
var EV = window.SITE_DATA.events;

/* ברירת מחדל: חבילה */
var W = EV.Wedding, S = L.initialState(W);
var q = L.quote(W, S);
assert.strictEqual(q.price, 1200);
assert.strictEqual(q.totalText, 'החל מ-1,200 ₪');
assert.ok(L.canAdvance(W, S, 'mode').ok);

/* בחירה עצמית עם הזמנה בלבד: מחיר פריט והצעה להשלים לחבילה */
S.mode = 'build'; S.sel = { inv: true };
q = L.quote(W, S);
assert.strictEqual(q.price, 150);
assert.ok(q.nudge.indexOf('החל מ-1,200 ₪') >= 0, q.nudge);

/* בלי בחירה אי אפשר להמשיך */
S.sel = {};
assert.strictEqual(L.canAdvance(W, S, 'items').ok, false);
assert.ok(L.canAdvance(W, S, 'mode').ok);

/* עיצוב אישי */
S.mode = 'custom';
assert.strictEqual(L.quote(W, S).totalText, 'החל מ-1,800 ₪');
assert.ok(L.canAdvance(W, S, 'mode').ok && L.canAdvance(W, S, 'items').ok);

/* אירוע אחר: שם חובה, ומחיר 1,800 */
var O = EV.Other, SO = L.initialState(O);
assert.strictEqual(SO.mode, 'custom');
assert.strictEqual(L.canAdvance(O, SO, 'mode').ok, false);
SO.eventName = '  יום פתיחה  ';
assert.ok(L.canAdvance(O, SO, 'mode').ok);
assert.strictEqual(L.quote(O, SO).totalText, 'החל מ-1,800 ₪');
var mo = L.message(O, SO, []);
assert.ok(mo.indexOf('היי, יש לי אירוע: יום פתיחה.') === 0, mo);
assert.ok(mo.indexOf('מחיר: החל מ-1,800 ₪.') >= 0, mo);

/* ההודעה: מחיר "החל מ", שורות מעשיות, ובלי משתתפים או מאשר */
var S2 = L.initialState(W);
S2.where = 'screen'; S2.have = { photos: true, song: true }; S2.date = '2099-03-15'; S2.title = 'נועה ויובל';
var m = L.message(W, S2, ['אופי: אלגנטי']);
assert.ok(m.indexOf('מחיר: החל מ-1,200 ₪.') >= 0, m);
assert.ok(m.indexOf('יוצג: מסך באולם.') >= 0, m);
assert.ok(m.indexOf('כבר יש לנו: תמונות, שיר.') >= 0, m);
assert.ok(m.indexOf('תאריך האירוע: 15/03/2099.') >= 0, m);
assert.ok(m.indexOf('שם האירוע: נועה ויובל.') >= 0, m);
assert.ok(m.indexOf('אופי: אלגנטי') >= 0, m);
assert.ok(m.indexOf('משתתפים') < 0 && m.indexOf('מאשר') < 0, m);

/* כל האירועים עם פריטים: ברירת המחדל עוברת ומציגה "החל מ-" */
Object.keys(EV).forEach(function (k) {
  if (!EV[k].items.length) { return; }
  var s = L.initialState(EV[k]), qq = L.quote(EV[k], s);
  assert.ok(qq.hasChoice && /^החל מ-/.test(qq.totalText), k);
});

console.log('builder-logic: ok');
