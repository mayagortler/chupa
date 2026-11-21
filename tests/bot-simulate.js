'use strict';
/* שיחה עם הבוט בטרמינל, בלי Meta ובלי רשת. לא בדיקה: מריצים ידנית.
   node tests/bot-simulate.js
   מספר = בחירה באפשרות ברשימה האחרונה. כל טקסט אחר נשלח כהודעה חופשית. */
var readline = require('readline');
var engine = require('../bot/engine.js');

var state = null, options = [];

function show(m) {
  if (m.kind === 'text') { console.log('\n[בוט] ' + m.body); return; }
  console.log('\n[בוט] ' + m.body);
  var items = m.kind === 'buttons' ? m.buttons : m.rows;
  items.forEach(function (x, i) { console.log('   ' + (i + 1) + '. ' + x.title + (x.description ? '  (' + x.description + ')' : '')); });
  options = items;
}

function feed(input) {
  input.from = '972500000000';
  var r = engine.step(state, input);
  state = r.state;
  options = [];
  r.out.forEach(show);
  if (r.notify) { console.log('\n----- ' + (r.notify.kind === 'complete' ? 'סיכום למאיה' : 'סיכום חלקי למאיה') + ' -----\n' + r.notify.summary + '\n-----'); }
  if (state.phase === 'done') { console.log('\n(השיחה הסתיימה)'); }
}

feed({ type: 'text', text: 'היי' });
var rl = readline.createInterface({ input: process.stdin });
rl.on('line', function (line) {
  var n = Number(line);
  if (options.length && Number.isInteger(n) && n >= 1 && n <= options.length) { feed({ type: 'choice', id: options[n - 1].id, text: options[n - 1].title }); }
  else { feed({ type: 'text', text: line }); }
});
