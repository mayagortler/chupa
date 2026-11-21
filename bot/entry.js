'use strict';
/* מזהה את ההודעה המוכנה שה-builder של האתר פותח בוואטסאפ (BuilderLogic.message) ומחלץ ממנה את התשובות. */
var data = require('./site-data.js');
var D = data.D, L = data.L, Dir = data.Dir;

var OPEN = 'היי, אשמח לעיצוב ל';
var OPEN_OTHER = /^היי, יש לי אירוע: ([\s\S]+?)\.(?: |\n|$)/;

function names(list) { return list.map(function (x) { return x.name; }); }

function findEvent(t) {
  var mo = OPEN_OTHER.exec(t);
  if (mo) { return { ev: 'Other', eventName: mo[1].trim() }; }
  for (var i = 0; i < D.order.length; i++) {
    var k = D.order[i];
    if (k !== 'Other' && t.indexOf(OPEN + D.events[k].what + '.') === 0) { return { ev: k }; }
  }
  return null;
}

function direction(t) {
  var s = Dir.emptyState(D.direction);
  t.split('\n').forEach(function (line) {
    D.direction.questions.forEach(function (q) {
      if (line.indexOf(q.l + ': ') !== 0) { return; }
      var rest = line.slice(q.l.length + 2).replace(/\s*\(בלי: .*\)$/, '');
      var idx = rest.split(', ').map(function (n) {
        for (var i = 0; i < q.o.length; i++) { if (q.o[i].n === n) { return i; } }
        return -1;
      }).filter(function (i) { return i >= 0; });
      s.sel[q.k] = idx.sort(function (a, b) { return a - b; });
    });
  });
  return s;
}

function prefill(text) {
  var t = String(text || ''), f = findEvent(t);
  if (!f) { return null; }
  var E = D.events[f.ev], S = {};
  if (f.eventName) { S.eventName = f.eventName; S.mode = 'custom'; }

  var d = /תאריך האירוע: (\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (d) { S.date = d[3] + '-' + d[2] + '-' + d[1]; }
  var ti = /שם האירוע: (.+?)\.(?= |\n|$)/.exec(t);
  if (ti) { S.title = ti[1]; }
  L.WHERE.forEach(function (w) { if (t.indexOf(' יוצג: ' + w[1] + '.') >= 0) { S.where = w[0]; } });
  var hv = /כבר יש לנו: (.+?)\.(?= |\n|$)/.exec(t);
  if (hv) {
    S.have = {};
    hv[1].split(', ').forEach(function (n) { L.HAVE.forEach(function (w) { if (w[1] === n) { S.have[w[0]] = true; } }); });
  }

  if (!S.mode) {
    var inc = /כולל: (.+?)\. מחיר:/.exec(t);
    if (inc) {
      var picked = inc[1].split(', ');
      if (JSON.stringify(picked) === JSON.stringify(E.bundle.ids.map(function (id) { return E.items.filter(function (x) { return x.id === id; })[0].name; }))) {
        S.mode = 'set';
      } else {
        var sel = {};
        picked.forEach(function (n) { E.items.forEach(function (x) { if (x.name === n) { sel[x.id] = true; } }); });
        if (Object.keys(sel).length === picked.length) { S.mode = 'build'; S.sel = sel; }
      }
    } else if (t.indexOf('עיצוב אישי') >= 0) { S.mode = 'custom'; }
  }
  return { ev: f.ev, S: S, dir: direction(t) };
}

module.exports = { prefill: prefill, names: names };
