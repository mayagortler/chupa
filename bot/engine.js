'use strict';
/* מנוע השיחה: פונקציה טהורה. step(state, input) -> { state, out, notify }. בלי רשת ובלי DOM. */
var data = require('./site-data.js');
var C = require('./copy.js');
var summary = require('./summary.js');
var entry = require('./entry.js');
var D = data.D, L = data.L, Dir = data.Dir;

var FIRST_PAGE = 9; /* ברשימה של וואטסאפ יש מקום ל-10 שורות, אחת מהן "עוד" */

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function cut(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function text(body) { return { kind: 'text', body: body }; }

function newState(phone) {
  return {
    v: 1, phone: phone, phase: 'event', ev: null, S: null, dir: Dir.emptyState(D.direction),
    dirIdx: 0, multi: [], retries: 0, name: '', handedOff: false, greeted: false, profileName: ''
  };
}

function eventRows(keys) {
  return keys.map(function (k) { return { id: 'ev:' + k, title: cut(D.events[k].chip, 24) }; });
}

function itemRows(st) {
  var E = D.events[st.ev];
  var rows = E.items.map(function (x) {
    var on = !!st.S.sel[x.id];
    return {
      id: 'it:' + x.id,
      title: cut((on ? C.checked : '') + x.name, 24),
      description: cut(x.name + ', ' + x.detail + ', ' + L.fmt(x.price) + ' ₪', 72)
    };
  });
  rows.push({ id: 'it:done', title: C.itemsDone, description: C.itemsDoneDesc });
  return rows;
}

/* כל שלב: ask(st) -> הודעות לשליחה. accept(st, input) -> true אם התקבל ועבר שלב, false אם לא הובן, או מערך הודעות להחזרה מיידית. */
var PH = {
  event: {
    ask: function (st) {
      var first = !st.greeted;
      return [{ kind: 'list', body: (first ? C.greeting + '\n' : '') + C.eventAsk, button: C.pickButton, rows: eventRows(D.order.slice(0, FIRST_PAGE)).concat([{ id: 'ev:more', title: C.more, description: C.moreDesc }]) }];
    },
    accept: function (st, input) {
      if (input.type !== 'choice') { return false; }
      if (input.id === 'ev:more') { st.phase = 'event2'; return true; }
      return chooseEvent(st, input.id);
    }
  },
  event2: {
    ask: function () {
      return [{ kind: 'list', body: C.eventAsk, button: C.pickButton, rows: eventRows(D.order.slice(FIRST_PAGE)) }];
    },
    accept: function (st, input) { return input.type === 'choice' && chooseEvent(st, input.id); }
  },
  eventName: {
    ask: function () { return [text(C.eventNameAsk)]; },
    accept: function (st, input) {
      if (input.type !== 'text' || !input.text.trim()) { return false; }
      st.S.eventName = cut(input.text.trim(), 500);
      st.phase = st.S.date ? afterDate(st) : 'date';
      return true;
    }
  },
  mode: {
    ask: function (st) {
      var E = D.events[st.ev], q = L.quote(E, L.initialState(E));
      return [{ kind: 'buttons', body: C.modeAsk(E, q), buttons: [
        { id: 'mode:set', title: C.setButton(L.fmt(q.price)) },
        { id: 'mode:build', title: C.buildButton },
        { id: 'mode:custom', title: C.customButton }
      ] }];
    },
    accept: function (st, input) {
      var m = input.type === 'choice' && /^mode:(set|build|custom)$/.exec(input.id);
      if (!m) { return false; }
      st.S.mode = m[1];
      if (m[1] !== 'set') { st.S.sel = {}; }
      st.phase = m[1] === 'build' ? 'items' : (st.S.date ? afterDate(st) : 'date');
      return true;
    }
  },
  items: {
    ask: function (st) {
      return [{ kind: 'list', body: C.itemsAsk(L.quote(D.events[st.ev], st.S)), button: C.itemsButton, rows: itemRows(st) }];
    },
    accept: function (st, input) {
      var E = D.events[st.ev], m = input.type === 'choice' && /^it:(.+)$/.exec(input.id);
      if (!m) { return false; }
      if (m[1] === 'done') {
        var can = L.canAdvance(E, st.S, 'items');
        if (!can.ok) { return [text(can.why)].concat(PH.items.ask(st)); }
        st.phase = st.S.date ? afterDate(st) : 'date';
        return true;
      }
      var x = E.items.filter(function (i) { return i.id === m[1]; })[0];
      if (!x) { return false; }
      if (st.S.sel[x.id]) { delete st.S.sel[x.id]; return PH.items.ask(st); }
      if (x.group) { E.items.forEach(function (o) { if (o.group === x.group) { delete st.S.sel[o.id]; } }); }
      st.S.sel[x.id] = true;
      return PH.items.ask(st);
    }
  },
  date: {
    ask: function () {
      return [{ kind: 'buttons', body: C.dateAsk, buttons: [{ id: 'date:unknown', title: C.dateUnknown }] }];
    },
    accept: function (st, input, now) {
      if (input.type === 'choice' && input.id === 'date:unknown') { st.S.date = ''; st.phase = afterDate(st); return true; }
      if (input.type !== 'text') { return false; }
      var iso = parseDate(input.text, now);
      if (!iso) { return false; }
      st.S.date = iso;
      st.phase = afterDate(st);
      var note = L.dateInfo(st.S, now).note;
      return (note ? [text(note)] : []).concat(ask(st));
    }
  },
  dir: {
    ask: function (st) {
      var q = D.direction.questions[st.dirIdx];
      var rows = q.o.map(function (o, i) {
        var on = st.dir.sel[q.k].indexOf(i) >= 0;
        var row = { id: 'dq:' + q.k + ':' + i, title: cut((on ? C.checked : '') + o.n, 24) };
        if (o.cn) { row.description = cut(o.cn.join(', '), 72); }
        return row;
      });
      if (q.multi) { rows.push({ id: 'dq:' + q.k + ':done', title: C.multiDone, description: C.multiDoneDesc }); }
      return [{ kind: 'list', body: q.t, button: C.pickButton, rows: rows }];
    },
    accept: function (st, input) {
      var q = D.direction.questions[st.dirIdx];
      var m = input.type === 'choice' && /^dq:([^:]+):(\d+|done)$/.exec(input.id);
      if (!m || m[1] !== q.k) { return false; }
      if (m[2] === 'done') { if (!q.multi) { return false; } nextDir(st); return true; }
      var i = Number(m[2]);
      if (!q.o[i]) { return false; }
      Dir.pick(st.dir, q, i);
      if (q.multi) { return PH.dir.ask(st); }
      nextDir(st);
      return true;
    }
  },
  gen: {
    ask: function () {
      return [{ kind: 'buttons', body: C.genAsk(D.direction.extra), buttons: [{ id: 'skip', title: C.skip }] }];
    },
    accept: function (st, input) {
      if (input.type === 'choice' && input.id === 'skip') { st.phase = 'where'; return true; }
      if (input.type !== 'text' || !input.text.trim()) { return false; }
      st.dir.notes[D.direction.extra.k] = cut(input.text.trim(), 500);
      st.phase = 'where';
      return true;
    }
  },
  where: {
    ask: function () {
      return [{ kind: 'buttons', body: C.whereAsk, buttons: L.WHERE.map(function (w) { return { id: 'wh:' + w[0], title: w[1] }; }) }];
    },
    accept: function (st, input) {
      var m = input.type === 'choice' && /^wh:(.+)$/.exec(input.id);
      if (!m || !L.WHERE.some(function (w) { return w[0] === m[1]; })) { return false; }
      st.S.where = m[1];
      st.phase = 'have';
      return true;
    }
  },
  have: {
    ask: function (st) {
      var rows = L.HAVE.map(function (w) { return { id: 'hv:' + w[0], title: (st.S.have[w[0]] ? C.checked : '') + w[1] }; });
      rows.push({ id: 'hv:done', title: C.multiDone, description: C.multiDoneDesc });
      return [{ kind: 'list', body: C.haveAsk, button: C.haveButton, rows: rows }];
    },
    accept: function (st, input) {
      var m = input.type === 'choice' && /^hv:(.+)$/.exec(input.id);
      if (!m) { return false; }
      if (m[1] === 'done') { st.phase = 'title'; return true; }
      if (!L.HAVE.some(function (w) { return w[0] === m[1]; })) { return false; }
      if (st.S.have[m[1]]) { delete st.S.have[m[1]]; } else { st.S.have[m[1]] = true; }
      return PH.have.ask(st);
    }
  },
  title: {
    ask: function (st) {
      return [{ kind: 'buttons', body: C.titleAsk(D.events[st.ev]), buttons: [{ id: 'skip', title: C.skip }] }];
    },
    accept: function (st, input) {
      if (input.type === 'choice' && input.id === 'skip') { st.phase = 'name'; return true; }
      if (input.type !== 'text' || !input.text.trim()) { return false; }
      st.S.title = cut(input.text.trim(), 100);
      st.phase = 'name';
      return true;
    }
  },
  name: {
    ask: function (st) {
      if (!st.profileName) { return [text(C.nameAsk)]; }
      return [{ kind: 'buttons', body: C.nameAsk, buttons: [{ id: 'name:profile', title: cut(st.profileName, 20) }] }];
    },
    accept: function (st, input) {
      if (input.type === 'choice' && input.id === 'name:profile' && st.profileName) { st.name = st.profileName; }
      else if (input.type === 'text' && input.text.trim()) { st.name = cut(input.text.trim(), 100); }
      else { return false; }
      return finish(st);
    }
  }
};

function nextDir(st) {
  var qs = D.direction.questions;
  st.dirIdx += 1;
  while (st.dirIdx < qs.length && st.dir.sel[qs[st.dirIdx].k].length) { st.dirIdx += 1; } /* כבר נענתה (למשל בהודעה מהאתר) */
  if (st.dirIdx >= qs.length) { st.phase = 'gen'; }
}

function retryFor(phase) {
  if (phase === 'date') { return C.retryDate; }
  return FREE_TEXT[phase] ? C.retryText : C.retry;
}

function finish(st) {
  st.phase = 'done';
  st.handedOff = true;
  return { notify: { kind: 'complete', summary: summary.build(st, 'complete') }, out: [text(C.closing)] };
}

/* d/m/yyyy, d.m.yyyy או d/m (המופע הבא). מחזיר yyyy-mm-dd או ''. */
function parseDate(t, now) {
  var m = /^\s*(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?\s*$/.exec(t);
  if (!m) { return ''; }
  var d = Number(m[1]), mo = Number(m[2]), y = m[3] ? Number(m[3]) : 0;
  if (y && y < 100) { y += 2000; }
  var today = new Date(now);
  if (!y) {
    y = today.getUTCFullYear();
    if (Date.UTC(y, mo - 1, d) < Date.UTC(y, today.getUTCMonth(), today.getUTCDate())) { y += 1; }
  }
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) { return ''; }
  return dt.toISOString().slice(0, 10);
}

var FREE_TEXT = { eventName: 1, gen: 1, title: 1, name: 1 };
var HANDOFF_EXACT = /^(מאיה|נציגה?|נציג אנושי|לדבר עם מאיה|אפשר לדבר עם מאיה)[\s?!.]*$/;
var HANDOFF_ANY = /מאיה|נציג/;
function wantsHandoff(st, input) {
  if (input.type !== 'text') { return false; }
  var t = input.text.trim();
  return FREE_TEXT[st.phase] ? HANDOFF_EXACT.test(t) : HANDOFF_ANY.test(t);
}

function handoff(st, kind) {
  var sum = summary.build(st, kind); /* לפני שהשלב הופך ל-done, כדי שהסיכום ידע איפה הלקוח עצר */
  st.phase = 'done';
  st.handedOff = true;
  return { state: st, out: [text(C.handoff)], notify: { kind: kind, summary: sum } };
}

/* השלב הבא אחרי התאריך: מדלג על מה שכבר נענה (הודעה מהאתר), ובשיחה רגילה מתחיל מהשאלה הראשונה */
function afterDate(st) {
  var qs = D.direction.questions, i = 0;
  while (i < qs.length && (qs[i].multi || st.dir.sel[qs[i].k].length)) { i += 1; }
  if (i < qs.length) { st.dirIdx = i; return 'dir'; }
  return st.S.where ? 'name' : 'where';
}

function fromSite(fresh, pre) {
  var E = D.events[pre.ev], st = fresh;
  st.greeted = true;
  st.ev = pre.ev;
  st.S = L.initialState(E);
  Object.keys(pre.S).forEach(function (k) { st.S[k] = pre.S[k]; });
  if (pre.S.mode === 'custom' || pre.S.mode === 'build') { st.S.sel = pre.S.sel || {}; }
  st.dir = pre.dir;
  st.phase = !pre.S.mode ? 'mode' : !st.S.date ? 'date' : afterDate(st);
  return { state: st, out: [text(C.fromSite(L.isOther(E) ? st.S.eventName : E.what))].concat(ask(st)), notify: null };
}

function chooseEvent(st, id) {
  var m = /^ev:(.+)$/.exec(id || ''), E = m && D.events[m[1]];
  if (!E) { return false; }
  st.ev = m[1];
  st.S = L.initialState(E);
  st.phase = L.isOther(E) ? 'eventName' : 'mode';
  return true;
}

function ask(st) { return PH[st.phase] ? PH[st.phase].ask(st) : []; }

function step(prev, input) {
  var now = input.now || Date.now();
  if (!prev) {
    var fresh = newState(input.from);
    fresh.profileName = cut(input.name || '', 100);
    var pre = entry.prefill(input.text);
    if (pre) { return fromSite(fresh, pre); }
    var out0 = ask(fresh);
    fresh.greeted = true;
    return { state: fresh, out: out0, notify: null };
  }
  var st = clone(prev);
  if (st.phase === 'done') { return { state: st, out: [], notify: null }; }
  if (wantsHandoff(st, input)) { return handoff(st, 'partial'); }
  /* תמונה, הקלטה וכדומה: תשובה מיוחדת, לא נחשבת טעות ולא מעבירה למאיה */
  if (input.type === 'other') { return { state: st, out: [text(C.mediaReply)].concat(ask(st)), notify: null }; }
  var res = PH[st.phase].accept(st, input, now);
  if (res === false) {
    st.retries += 1;
    if (st.retries >= 2) { return handoff(st, 'stuck'); }
    return { state: st, out: [text(retryFor(st.phase))].concat(ask(st)), notify: null };
  }
  st.retries = 0;
  if (res === true) { return { state: st, out: ask(st), notify: null }; }
  if (Array.isArray(res)) { return { state: st, out: res, notify: null }; }
  return { state: st, out: res.out, notify: res.notify };
}

module.exports = { step: step };
