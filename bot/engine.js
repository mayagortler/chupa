'use strict';
/* מנוע השיחה: פונקציה טהורה. step(state, input) -> { state, out, notify }. בלי רשת ובלי DOM. */
var data = require('./site-data.js');
var C = require('./copy.js');
var D = data.D, L = data.L, Dir = data.Dir;

var FIRST_PAGE = 9; /* ברשימה של וואטסאפ יש מקום ל-10 שורות, אחת מהן "עוד" */

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function cut(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function text(body) { return { kind: 'text', body: body }; }

function newState(phone) {
  return {
    v: 1, phone: phone, phase: 'event', ev: null, S: null, dir: Dir.emptyState(D.direction),
    dirIdx: 0, multi: [], retries: 0, name: '', handedOff: false, greeted: false
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
      st.phase = 'date';
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
      st.phase = m[1] === 'build' ? 'items' : 'date';
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
        st.phase = 'date';
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
    ask: function () { return [text(C.datePlaceholder)]; },
    accept: function () { return false; }
  }
};

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
  if (!prev) {
    var fresh = newState(input.from);
    var out0 = ask(fresh);
    fresh.greeted = true;
    return { state: fresh, out: out0, notify: null };
  }
  var st = clone(prev);
  if (st.phase === 'done') { return { state: st, out: [], notify: null }; }
  var res = PH[st.phase].accept(st, input);
  if (res === true) { st.retries = 0; return { state: st, out: ask(st), notify: null }; }
  if (res === false) { st.retries += 1; return { state: st, out: [text(C.retry)].concat(ask(st)), notify: null }; }
  return { state: st, out: res, notify: null };
}

module.exports = { step: step };
