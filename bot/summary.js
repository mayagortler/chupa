'use strict';
/* הסיכום שמאיה מקבלת: הודעת וואטסאפ אחת בעברית. */
var data = require('./site-data.js');
var C = require('./copy.js');
var D = data.D, L = data.L, Dir = data.Dir;

var MAX = 4000;
var HEADERS = { complete: 'פנייה חדשה מהבוט', partial: 'שיחה שנעצרה, הלקוח ביקש נציגה', stuck: 'שיחה שנתקעה, הבוט לא הצליח להבין את הלקוח' };

function build(st, kind) {
  var out = [HEADERS[kind]];
  if (st.name) { out.push('שם הלקוח: ' + st.name); }
  out.push('טלפון: https://wa.me/' + st.phone);
  if (st.ev) {
    var E = D.events[st.ev], S = st.S;
    out.push('אירוע: ' + (L.isOther(E) ? (S.eventName || E.what) : E.what));
    var pl = L.practicalLines(S);
    var dateLine = pl.filter(function (l) { return l.indexOf('תאריך: ') === 0; })[0];
    if (dateLine) { out.push(dateLine); }
    var q = L.quote(E, S);
    if (q.custom) { out.push('בחירה: עיצוב אישי (' + q.totalText + ')'); }
    else if (q.hasChoice) { out.push('בחירה: ' + q.names.join(', ') + ' (' + q.totalText + ')'); }
    out = out.concat(Dir.lines(st.dir, D.direction));
    pl.forEach(function (l) {
      if (l.indexOf('תאריך: ') === 0) { return; }
      out.push(l.indexOf('שם: ') === 0 ? 'שם האירוע: ' + l.slice(4) : l);
    });
  }
  if (kind !== 'complete') { out.push('נעצר בשלב: ' + (C.phaseLabel[st.phase] || st.phase)); }
  var text = out.join('\n');
  return text.length > MAX ? text.slice(0, MAX - 1) + '…' : text;
}

/* פרמטר בתבנית הודעה לא יכול להכיל מעברי שורה, טאבים או רצף רווחים */
function oneLine(s) {
  return String(s).replace(/[ \t]*\r?\n[ \t]*/g, ' | ').replace(/[ \t]+/g, ' ').trim();
}

module.exports = { build: build, oneLine: oneLine };
