/* צ׳ופה – הבילדר בדפי האירועים: שלושה מסכים (מה צריך, הכיוון והפרטים, שליחה) ופס תחתון קבוע. */
(function () {
  'use strict';
  var C = window.Chopa, L = window.BuilderLogic, DIR = window.Direction, D = window.SITE_DATA || {};
  var ART = window.ChopaArt || { art: function () { return ''; } };
  var root = document.getElementById('builder');
  if (!root || !C || !L || !DIR) { return; }
  var E = (D.events || {})[root.getAttribute('data-event')];
  var DC = D.direction;
  if (!E || !DC) { return; }
  var esc = C.esc, fmt = L.fmt;

  var S = L.initialState(E);
  var DS = DIR.emptyState(DC);
  var other = L.isOther(E);
  var LABELS = { mode: 'מה צריך', items: 'בחירת פריטים', dir: 'הכיוון והפרטים', send: 'שליחה' };
  var TITLES = { mode: 'מה צריך וכמה זה עולה', items: 'מה אתם רוצים?', dir: 'הכיוון והפרטים', send: 'סיכום ושליחה' };
  var cur = 'mode';
  /* מסך בחירת הפריטים נוסף רק למי שבחר "אני מרכיבה בעצמי" */
  function steps() { var a = ['mode']; if (!other && S.mode === 'build') { a.push('items'); } return a.concat(['dir', 'send']); }
  var ROW_ORDER = ['title', 'mood', 'pal', 'font', 'el', 'where', 'have', 'date', DC.extra.k];
  var openRow = null, lastFocus = null, focusNote = null, showWhy = false, focusHeading = false;
  var justAdded = null; /* הפריט שנבחר עכשיו, כדי שרק האיור שלו יקפוץ */

  var TICK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"></path></svg>';
  var TICK_DARK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1C1C1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M4 10.5l4 4 8-9"></path></svg>';
  var WA_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l1.2-3.6A7 7 0 1 1 7 15.8L3 17z"></path></svg>';

  function nameOf(list, k) { var n = ''; list.forEach(function (w) { if (w[0] === k) { n = w[1]; } }); return n; }
  function nextRow(k) { var i = ROW_ORDER.indexOf(k); return i >= 0 && i + 1 < ROW_ORDER.length ? ROW_ORDER[i + 1] : null; }

  /* ---------- מסך 1: מה צריך וכמה זה עולה ---------- */
  /* כרטיס מוצר: האיור, השם והמחיר. לוחצים כדי להכניס או להוציא מהערכה */
  function itemTile(x) {
    var on = !!S.sel[x.id];
    return '<button type="button" class="tile' + (x.group ? ' is-radio' : '') + (x.id === justAdded ? ' is-new' : '') + '" data-k="it-' + x.id + '" data-act="item" data-id="' + x.id + '" aria-pressed="' + on + '">' +
      '<span class="bx" aria-hidden="true">' + TICK + '</span>' +
      '<span class="tl-art">' + ART.art(x.id, 96, true) + '</span>' +
      '<strong>' + esc(x.name) + '</strong><span class="ds">' + esc(x.detail) + '</span>' +
      '<span class="pr">החל מ-' + fmt(x.price) + ' ₪</span></button>';
  }

  function screenMode(q) {
    if (other) {
      return '<section class="card b-card" aria-labelledby="s-h">' + heading('mode') +
        '<p class="note" style="margin:0">כתבו איזה אירוע זה, ובהמשך תוכלו לספר לי על הכיוון. את ההצעה אתן אחרי שאראה את הבקשה.</p>' +
        '<div class="dq"><h3><label for="event-name">איזה אירוע?</label></h3>' +
        '<input id="event-name" class="field" type="text" maxlength="60" value="' + esc(S.eventName) + '" placeholder="למשל: יום פתיחה של העסק" data-input="eventName" autocomplete="off"></div>' +
        '<p class="note" style="margin:0"><strong>עיצוב אישי מאפס ' + esc(q.totalText) + '</strong></p></section>';
    }
    var minVideo = Math.min.apply(null, E.items.filter(function (x) { return x.group === 'video'; }).map(function (x) { return x.price; }).concat([9999]));
    var names = E.bundle.ids.map(function (id) { return E.items.filter(function (x) { return x.id === id; })[0].name; });
    var modes = [
      { k: 'build', t: 'אני מרכיבה בעצמי', d: 'בוחרים סרטון ותוספות, ומשלמים רק על מה שצריך.', p: fmt(minVideo), b: '', x: '' },
      { k: 'set', t: E.bundle.name, d: names.join('\n'), p: fmt(E.bundle.price), b: 'מומלץ', x: 'חיסכון של ' + fmt(q.saving) + ' ₪' },
      { k: 'custom', t: 'עיצוב אישי מאפס', d: 'שאלון קצר, ועיצוב של הכול מאפס.', p: fmt(E.frm), b: '', x: '' }
    ];
    var h = '<section class="card b-card" aria-labelledby="s-h">' + heading('mode') + '<div class="modes" role="group" aria-label="סוג ההזמנה">';
    modes.forEach(function (m) {
      h += '<button type="button" class="opt" data-k="m-' + m.k + '" data-act="mode" data-mode="' + m.k + '" aria-pressed="' + (S.mode === m.k) + '">' +
        (m.b ? '<span class="bd">' + esc(m.b) + '</span>' : '') + '<strong>' + esc(m.t) + '</strong>' +
        (m.k === 'set' ? '<span class="set-kit" aria-hidden="true">' + E.bundle.ids.map(function (id) { return ART.art(id, 42, true); }).join('') + '</span>' : '') +
        '<span class="ds">' + m.d.split('\n').map(function (t) { return m.k === 'set' ? '<span class="ln">' + esc(t) + '</span>' : esc(t); }).join('') + '</span>' +
        (m.x ? '<span class="sv">' + esc(m.x) + '</span>' : '') +
        '<span class="pr"><small>החל מ-</small>' + m.p + ' ₪</span></button>';
    });
    return h + '</div></section>';
  }

  function screenItems(q) {
    var videos = E.items.filter(function (x) { return x.group === 'video'; });
    var extras = E.items.filter(function (x) { return x.group !== 'video'; });
    return '<section class="card b-card" aria-labelledby="s-h">' + heading('items') +
      '<p class="note" style="margin:0">לחצו על מה שתרצו לכלול, והמחיר יתעדכן למטה.</p>' +
      '<div class="items">' +
      (videos.length ? '<h3 class="grp">סרטון <span>(אחד)</span></h3><div class="tiles">' + videos.map(itemTile).join('') + '</div>' : '') +
      (extras.length ? '<h3 class="grp">תוספות <span>(כמה שרוצים)</span></h3><div class="tiles">' + extras.map(itemTile).join('') + '</div>' : '') +
      (q.nudge ? '<div class="nudge">' + esc(q.nudge) + '</div>' : '') + '</div></section>';
  }

  /* ---------- מסך 2: הכיוון והפרטים ---------- */
  function chipRow(list, act, isOn) {
    return '<div class="dq-opts">' + list.map(function (w) {
      return '<button type="button" class="dq-opt" data-k="p-' + act + '-' + w[0] + '" data-act="' + act + '" data-v="' + w[0] + '" aria-pressed="' + isOn(w[0]) + '">' + esc(w[1]) + '</button>';
    }).join('') + '</div>';
  }

  function practicalRows() {
    var d = L.dateInfo(S);
    var have = L.HAVE.filter(function (w) { return S.have[w[0]]; }).map(function (w) { return w[1]; });
    return DIR.row('where', 'איפה יוצג', nameOf(L.WHERE, S.where), openRow === 'where',
        '<div role="group" aria-label="איפה זה יוצג?">' + chipRow(L.WHERE, 'where', function (v) { return S.where === v; }) + '</div>') +
      DIR.row('have', 'מה כבר יש לכם', have.join(', '), openRow === 'have',
        '<div role="group" aria-label="מה כבר יש לכם? אפשר לבחור כמה">' + chipRow(L.HAVE, 'have', function (v) { return !!S.have[v]; }) + '</div>') +
      DIR.row('date', 'מתי האירוע', d.fmt, openRow === 'date',
        '<label class="sr-only" for="date">מתי האירוע?</label><input class="field" id="date" type="date" value="' + esc(S.date) + '" data-input="date">' +
        (d.note ? '<span class="note">' + esc(d.note) + '</span>' : ''));
  }

  function screenDir() {
    var titleRow = DIR.row('title', 'שם האירוע', S.title.trim(), openRow === 'title',
      '<label class="sr-only" for="title">שם האירוע (לא חובה)</label><input id="title" class="field" type="text" maxlength="40" value="' + esc(S.title) + '" placeholder="' + esc(E.titleEx || '') + '" data-input="title" autocomplete="off">');
    return '<section class="card b-card" aria-labelledby="s-h">' + heading('dir') +
      '<p class="note" style="margin:0">לא חובה לענות על הכול. מה שלא תמלאו, אשאל בוואטסאפ.</p>' +
      '<div class="rows">' + titleRow + DIR.renderRows(DS, DC, openRow, practicalRows()) + '</div>' +
      '<div class="mb-wrap"><h3 class="mb-head">לוח ההשראה שלכם</h3>' + DIR.renderBoard(DS, DC, S.title.trim()) +
      '<span class="note">הוא מתעדכן תוך כדי, ובו אני מתחילה לעצב.</span></div></section>';
  }

  /* ---------- מסך 3: סיכום ושליחה ---------- */
  function screenSend(q) {
    var h = '<section class="card b-card" aria-labelledby="s-h">' + heading('send');
    h += '<div class="sum-group"><div class="sum-h"><strong>מה צריך</strong><button type="button" class="link-btn" data-k="e1" data-act="edit" data-step="' + (!other && S.mode === 'build' ? 'items' : 'mode') + '">עריכה</button></div><ul class="sum">' +
      (other ? '<li>אירוע: ' + esc(S.eventName.trim()) + '</li>' : '<li>אירוע: ' + esc(E.what) + '</li>' + (q.custom ? '<li>עיצוב אישי מאפס</li>' : q.names.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join(''))) + '</ul></div>';
    var rest = DIR.lines(DS, DC).concat(L.practicalLines(S));
    h += '<div class="sum-group"><div class="sum-h"><strong>הכיוון והפרטים</strong><button type="button" class="link-btn" data-k="e2" data-act="edit" data-step="dir">עריכה</button></div>' +
      (rest.length ? '<ul class="sum">' + rest.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '<p class="note" style="margin:0">לא מילאתם כלום, ואשאל בוואטסאפ.</p>') + '</div>';
    h += '<div class="total" aria-live="polite"><strong>' + esc(q.totalText) + '</strong><span class="note">' + esc(q.noteText) + '</span></div>' +
      '<span class="note">בלי התחייבות עד שמאשרים הצעת מחיר. אחזור אליכם עם סיכום, ומקדמה של 50% בביט מתחילה את העבודה.</span></section>';
    return h;
  }

  /* ---------- מבנה כללי ---------- */
  function heading(id) { return '<h2 id="s-h" class="s-h" tabindex="-1">' + esc(TITLES[id]) + '</h2>'; }

  function stepper() {
    var list = steps(), at = list.indexOf(cur);
    return '<ol class="stepper" style="grid-template-columns:repeat(' + list.length + ',1fr)" aria-label="התקדמות: מסך ' + (at + 1) + ' מתוך ' + list.length + '">' + list.map(function (id, i) {
      return '<li class="st' + (i === at ? ' st-on' : i < at ? ' st-done' : '') + '"' + (i === at ? ' aria-current="step"' : '') + '><span class="st-t">' + esc(LABELS[id]) + '</span></li>';
    }).join('') + '</ol>';
  }

  function bar(q) {
    var list = steps(), at = list.indexOf(cur), ca = L.canAdvance(E, S, cur), h = '<div class="bar-fixed" id="bar"><div class="bar-in">';
    h += '<span class="bar-p" aria-live="polite">' + esc(q.totalText) + '</span><span class="bar-btns">';
    if (at > 0) { h += '<button type="button" class="btn light" data-k="back" data-act="back">חזרה</button>'; }
    if (cur !== 'send') {
      h += '<button type="button" class="btn" data-k="next" data-act="next"' + (ca.ok ? '' : ' aria-disabled="true"') + '>הבא</button>';
    } else {
      h += '<a class="btn" href="' + C.waUrl(L.message(E, S, DIR.lines(DS, DC))) + '">' + WA_ICON + 'לשלוח לי בוואטסאפ</a>';
    }
    h += '</span></div>' + (!ca.ok && showWhy ? '<p class="bar-why" role="alert">' + esc(ca.why) + '</p>' : '') + '</div>';
    return h;
  }

  function render() {
    var q = L.quote(E, S);
    var screen = cur === 'mode' ? screenMode(q) : cur === 'items' ? screenItems(q) : cur === 'dir' ? screenDir() : screenSend(q);
    root.innerHTML = stepper() + screen + bar(q);
    justAdded = null;
    document.body.classList.add('has-bar');
    if (focusNote) {
      var nt = document.getElementById('note-' + focusNote);
      focusNote = null;
      if (nt) { nt.focus({ preventScroll: true }); }
    }
    if (focusHeading) {
      focusHeading = false;
      var hd = document.getElementById('s-h');
      window.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - 70));
      if (hd) { hd.focus({ preventScroll: true }); }
    }
  }

  function rerender() {
    var ae = document.activeElement, id = ae && ae.id, ss = null, se = null;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) { try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) { ss = null; } }
    render();
    var el = id ? document.getElementById(id) : (lastFocus ? root.querySelector('[data-k="' + lastFocus + '"]') : null);
    if (el && !focusHeading) {
      el.focus({ preventScroll: true });
      if (ss !== null) { try { el.setSelectionRange(ss, se); } catch (e2) { /* type=date */ } }
    }
  }

  function go(id, fromPop) {
    cur = id; showWhy = false; openRow = null; focusHeading = true; lastFocus = null;
    if (!fromPop) { history.pushState({ step: id }, '', '#' + id); }
    render();
  }

  window.addEventListener('popstate', function (ev) {
    var id = ev.state && ev.state.step && steps().indexOf(ev.state.step) >= 0 ? ev.state.step : 'mode';
    if (id !== cur) { go(id, true); }
  });
  history.replaceState({ step: 'mode' }, '', location.hash ? location.pathname + location.search : undefined);

  /* ---------- אירועים ---------- */
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !root.contains(b)) { return; }
    var act = b.getAttribute('data-act');
    lastFocus = b.getAttribute('data-k');
    if (act === 'next') {
      if (b.getAttribute('aria-disabled') === 'true') { showWhy = true; rerender(); var f = document.getElementById('event-name'); if (f) { f.focus(); } return; }
      go(steps()[steps().indexOf(cur) + 1]); return;
    }
    if (act === 'back') { go(steps()[steps().indexOf(cur) - 1]); return; }
    if (act === 'edit') { go(b.getAttribute('data-step')); return; }
    if (act === 'row') {
      var rk = b.getAttribute('data-row');
      openRow = openRow === rk ? null : rk;
    } else if (act === 'dpick') {
      var qk = b.getAttribute('data-q'), qq = DC.questions.filter(function (x) { return x.k === qk; })[0];
      DIR.pick(DS, qq, parseInt(b.getAttribute('data-i'), 10));
      if (!qq.multi && DS.sel[qk].length) { openRow = nextRow(qk); lastFocus = null; }
    } else if (act === 'ddrop') { DIR.toggleDrop(DS, parseInt(b.getAttribute('data-i'), 10)); }
    else if (act === 'dnote') { var nk = b.getAttribute('data-q'); DS.open[nk] = !DS.open[nk]; if (DS.open[nk]) { focusNote = nk; lastFocus = null; } }
    else if (act === 'where') { S.where = S.where === b.getAttribute('data-v') ? '' : b.getAttribute('data-v'); if (S.where) { openRow = nextRow('where'); lastFocus = null; } }
    else if (act === 'have') { var hv = b.getAttribute('data-v'); S.have = Object.assign({}, S.have); S.have[hv] = !S.have[hv]; }
    else if (act === 'mode') { S.mode = b.getAttribute('data-mode'); showWhy = false; if (S.mode === 'set') { S.sel = L.initialState(E).sel; } }
    else if (act === 'item') {
      var id = b.getAttribute('data-id'), x = E.items.filter(function (i) { return i.id === id; })[0], sel = Object.assign({}, S.sel);
      if (sel[id]) { delete sel[id]; }
      else {
        if (x.group) { E.items.forEach(function (o) { if (o.group === x.group) { delete sel[o.id]; } }); }
        sel[id] = true;
        justAdded = id;
      }
      S.sel = sel; showWhy = false;
    }
    rerender();
  });

  root.addEventListener('input', function (ev) {
    var nk = ev.target.getAttribute && ev.target.getAttribute('data-note');
    if (nk) { DS.notes[nk] = ev.target.value; rerender(); return; }
    var f = ev.target.getAttribute && ev.target.getAttribute('data-input');
    if (!f) { return; }
    S[f] = ev.target.value;
    if (f === 'eventName') { showWhy = false; }
    rerender();
  });

  render();
})();
