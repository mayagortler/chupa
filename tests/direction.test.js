'use strict';
var assert = require('assert');
global.window = {};
require('../assets/data.js');
var Dir = require('../assets/direction.js');
var cfg = window.SITE_DATA.direction;
var pal = cfg.questions.filter(function (q) { return q.k === 'pal'; })[0];

var s = Dir.emptyState(cfg);
assert.ok(!Dir.hasAny(s));

/* פלטה, הסרת צבע, והחזרה */
Dir.pick(s, pal, 0);
assert.deepStrictEqual(s.dropped, []);
Dir.toggleDrop(s, 1);
assert.deepStrictEqual(s.dropped, [1]);
assert.ok(Dir.hasAny(s));
var out = Dir.lines(s, cfg).join('\n');
assert.ok(out.indexOf('צבעים: בהירים ורכים (בלי: תכלת)') >= 0, out);
Dir.toggleDrop(s, 1);
assert.deepStrictEqual(s.dropped, []);

/* בחירת פלטה אחרת מאפסת צבעים שהוסרו */
Dir.toggleDrop(s, 2);
Dir.pick(s, pal, 3);
assert.deepStrictEqual(s.dropped, []);

/* אין זכר לתמונות או ללוח משותף */
var all = Dir.lines(s, cfg).join('\n');
assert.ok(all.indexOf('מצרפת') < 0);
assert.strictEqual(typeof Dir.shareFile, 'undefined');
assert.strictEqual(typeof Dir.makeFile, 'undefined');

/* הכול בשורות: כל שאלה ועוד שורה לפתק, השורה הפתוחה היא היחידה שגופה גלוי */
var html = Dir.renderRows(s, cfg, 'pal');
var rows = (html.match(/<div class="row( is-open)?">/g) || []).length;
assert.strictEqual(rows, cfg.questions.length + 1);
assert.strictEqual(html.split('aria-expanded="true"').length - 1, 1);
assert.ok(html.indexOf('chip-x') >= 0);
assert.ok(html.indexOf('id="rb-pal" hidden') < 0);
assert.ok(Dir.renderRows(s, cfg, 'mood').indexOf('id="rb-pal" hidden') >= 0);

console.log('direction: ok');
