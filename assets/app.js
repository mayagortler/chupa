/* צ׳ופה – עיצוב גרפי ומדיה לאירועים: וואטסאפ והבילדר של דפי האירועים */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG || {};
  var D = window.SITE_DATA || {};

  function waUrl(text) {
    var phone = String(CFG.phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* קישורי וואטסאפ סטטיים והקישורים בפוטר */
  Array.prototype.forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
    a.setAttribute('href', waUrl(a.getAttribute('data-wa')));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-cfg]'), function (a) {
    var v = CFG[a.getAttribute('data-cfg')];
    if (v) { a.setAttribute('href', v); a.hidden = false; }
  });

  /* בלונים מעל ההיגדים: לחיצה מפוצצת בלון, והוא מתנפח שוב אחרי רגע */
  Array.prototype.forEach.call(document.querySelectorAll('[data-balloons] .bl-item'), function (it) {
    var btn = it.querySelector('.bl-b');
    btn.addEventListener('click', function () {
      if (it.classList.contains('popped')) { return; }
      it.classList.add('popped');
      setTimeout(function () { it.classList.remove('popped'); }, 1800);
    });
  });

  var root = document.getElementById('builder');
  if (!root) { return; }
  var key = root.getAttribute('data-event');
  var E = (D.events || {})[key];
  if (!E) { return; }
  var evc = (D.evc || {})[key] || (D.evc || {})._;
  var isOther = key === 'Other';

  var TICK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"></path></svg>';
  var TICK_DARK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1C1C1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M4 10.5l4 4 8-9"></path></svg>';
  var WA_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l1.2-3.6A7 7 0 1 1 7 15.8L3 17z"></path></svg>';

  var PV = [
    { bg: 'linear-gradient(180deg,' + evc.bg + ' 0%,' + evc.soft + ' 100%)', color: '#1C1C1E', ph: '#3F4651', weight: '600', border: '1px solid transparent', font: "'Heebo',sans-serif" },
    { bg: '#FFFFFF', color: '#1C1C1E', ph: '#5B616B', weight: '500', border: '1px solid rgba(17,24,39,.12)', font: "'Rubik',sans-serif" },
    { bg: '#1C1C1E', color: '#FFFFFF', ph: '#C7C7CC', weight: '300', border: '1px solid #1C1C1E', font: "'Heebo',sans-serif" }
  ];

  function bundleSel() {
    var o = {};
    E.bundle.ids.forEach(function (id) { o[id] = true; });
    return o;
  }
  var S = { st: 0, stPicked: false, sel: isOther ? {} : bundleSel(), mode: 'set', date: '', people: '', title: '', open: {} };
  var lastFocus = null;
  var s3In = false, io = null;

  function byId(id) { return E.items.filter(function (x) { return x.id === id; })[0]; }

  function calc() {
    var B = E.bundle;
    var ids = Object.keys(S.sel).filter(function (k) { return S.sel[k]; });
    var sum = ids.reduce(function (a, id) { return a + (byId(id) ? byId(id).price : 0); }, 0);
    var isBundleSel = B.ids.length > 0 && ids.length === B.ids.length && B.ids.every(function (id) { return S.sel[id]; });
    var bundleSum = B.ids.reduce(function (a, id) { return a + byId(id).price; }, 0);
    var saving = bundleSum - B.price;
    var price = 0, hasChoice = false;
    if (S.mode === 'set') { price = B.price; hasChoice = B.ids.length > 0; }
    else if (S.mode === 'build') { price = isBundleSel ? B.price : sum; hasChoice = ids.length > 0; }
    else { hasChoice = true; }
    var custom = S.mode === 'custom';
    var names = S.mode === 'set'
      ? B.ids.map(function (id) { return byId(id).name; })
      : ids.map(function (id) { return byId(id).name; });
    var peopleN = parseInt(S.people, 10);
    var showPer = E.group && peopleN > 0 && !custom && price > 0;
    var perText = showPer ? 'בערך ' + fmt(Math.round(price / peopleN)) + ' ₪ למשתתף' : '';
    var dateFmt = '', dateNote = '';
    if (S.date) {
      var p = S.date.split('-');
      dateFmt = p[2] + '/' + p[1] + '/' + p[0];
      var days = Math.ceil((new Date(S.date).getTime() - Date.now()) / 86400000);
      if (days < 0) { dateNote = 'התאריך כבר עבר.'; }
      else if (days <= 10) { dateNote = 'האירוע בעוד ' + days + ' ימים. כתבו לי עכשיו ואבדוק אם אספיק. עבודה דחופה (פחות מ-5 ימים) בתוספת 30%.'; }
      else { dateNote = 'מצוין, יש זמן. חומרים עד 10 ימים לפני האירוע.'; }
    }
    var nudge = '';
    if (S.mode === 'build' && !isBundleSel) {
      var inB = ids.filter(function (id) { return B.ids.indexOf(id) >= 0; });
      var extra = ids.filter(function (id) { return B.ids.indexOf(id) < 0; });
      if (inB.length >= 1 && extra.length === 0) {
        var missing = B.ids.filter(function (id) { return !S.sel[id]; }).map(function (id) { return byId(id).name; });
        nudge = 'הוסיפו ' + missing.join(', ') + ' וקבלו את הסט התואם ב-' + fmt(B.price) + ' ₪ (חיסכון של ' + fmt(saving) + ' ₪).';
      }
    }
    var totalText = '—', noteText = 'בחרו מה לכלול, והמחיר יתעדכן כאן.';
    if (custom) { totalText = 'החל מ-' + fmt(E.frm) + ' ₪'; noteText = 'הצעת מחיר אחרי שאלון קצר.'; }
    else if (hasChoice) {
      totalText = fmt(price) + ' ₪';
      noteText = (S.mode === 'set' || isBundleSel)
        ? 'מחיר סט: חיסכון של ' + fmt(saving) + ' ₪. מחיר סגור, ללא הפתעות.'
        : 'מחיר לפי פריטים. מחיר סגור, ללא הפתעות.';
    }
    var styleName = E.styles.length ? E.styles[S.st].name : '';
    var lines = ['אירוע: ' + E.what];
    if (S.title) { lines.push('שם: ' + S.title); }
    if (S.stPicked) { lines.push('סגנון: ' + styleName); }
    if (custom) { lines.push('עיצוב אישי מאפס'); } else { names.forEach(function (n) { lines.push(n); }); }
    if (dateFmt) { lines.push('תאריך: ' + dateFmt); }
    if (peopleN > 0 && E.group) { lines.push('משתתפים: ' + peopleN); }

    var m = 'היי, מעוניינת בעיצוב ל' + E.what + '.';
    var s = 'הצעה לאירוע (' + E.what + ').';
    if (S.title) { m += ' שם האירוע: ' + S.title + '.'; s += ' שם: ' + S.title + '.'; }
    if (dateFmt) { m += ' תאריך האירוע: ' + dateFmt + '.'; s += ' תאריך: ' + dateFmt + '.'; }
    if (S.stPicked) { m += ' סגנון: ' + styleName + '.'; s += ' סגנון: ' + styleName + '.'; }
    if (custom) { m += ' אני רוצה עיצוב אישי ואשמח לשאלון קצר.'; s += ' עיצוב אישי מאפס, החל מ-' + fmt(E.frm) + ' ₪.'; }
    else if (hasChoice) {
      m += ' כולל: ' + names.join(', ') + '. סה״כ: ' + fmt(price) + ' ₪.';
      s += ' כולל: ' + names.join(', ') + '. סה״כ: ' + fmt(price) + ' ₪.';
    } else { m += ' אשמח לשמוע אפשרויות.'; }
    if (peopleN > 0 && E.group) { m += ' מספר משתתפים: ' + peopleN + '.'; if (showPer) { s += ' ' + perText + '.'; } }
    s += ' מה דעתכם? אפשר לאשר ולהתקדם.';
    return {
      B: B, ids: ids, isBundleSel: isBundleSel, bundleSum: bundleSum, saving: saving, price: price, hasChoice: hasChoice,
      custom: custom, perText: perText, dateNote: dateNote, nudge: nudge, totalText: totalText, noteText: noteText,
      lines: lines, wa: waUrl(m), share: waUrl(s), ready: hasChoice
    };
  }

  function other() {
    var href = waUrl('היי, יש לי אירוע שלא מצאתי באתר. אשמח לספר לך עליו.');
    root.innerHTML =
      '<div class="card other"><p>כותבים לי כמה מילים על האירוע, ואני חוזרת עם כיוון ועם הצעת מחיר סגורה.</p>' +
      '<a class="btn big" href="' + href + '">' + WA_ICON + 'לספר לי על האירוע</a></div>';
  }

  function itemBtn(x, on) {
    return '<button type="button" class="item" data-k="it-' + x.id + '" data-act="item" data-id="' + x.id + '" aria-pressed="' + on + '">' +
      '<span class="bx" aria-hidden="true">' + TICK + '</span>' +
      '<span class="tx"><strong>' + esc(x.name) + '</strong><span class="ds">' + esc(x.detail) + '</span></span>' +
      '<span class="pr">' + fmt(x.price) + ' ₪</span></button>';
  }

  function render() {
    if (isOther) { other(); return; }
    var c = calc();
    var pv = PV[S.st % 3];
    var pvText = S.title || 'השם של האירוע שלכם';
    var pvColor = S.title ? pv.color : pv.ph;
    var minVideo = Math.min.apply(null, E.items.filter(function (x) { return x.group === 'video'; }).map(function (x) { return x.price; }).concat([9999]));
    var h = '<div class="b-col">';

    /* 1. שם וסגנון */
    h += '<section class="card b-card" aria-labelledby="s1"><h2 id="s1">1. איך זה ייראה עם השם שלכם?</h2>' +
      '<label class="sr-only" for="title">שם האירוע (אופציונלי)</label>' +
      '<input id="title" class="field" type="text" maxlength="40" value="' + esc(S.title) + '" placeholder="' + esc(E.titleEx || '') + '" data-input="title" autocomplete="off">' +
      '<div class="pv" role="img" aria-label="תצוגה מקדימה של כרטיס הפתיחה: ' + esc(pvText) + '" style="background:' + pv.bg + ';border:' + pv.border + '">' +
      '<span class="pv-chip" aria-hidden="true">' + esc(E.what) + '</span>' +
      '<strong class="pv-text" aria-hidden="true" style="color:' + pvColor + ';font-weight:' + pv.weight + ';font-family:' + pv.font + '">' + esc(pvText) + '</strong>' +
      '<svg aria-hidden="true" viewBox="0 0 400 70" preserveAspectRatio="none"><ellipse cx="40" cy="62" rx="90" ry="34" fill="#FFFFFF" fill-opacity="0.75"></ellipse><ellipse cx="360" cy="64" rx="100" ry="36" fill="#FFFFFF" fill-opacity="0.75"></ellipse></svg></div>' +
      '<div class="styles" role="group" aria-label="בחירת סגנון">';
    E.styles.forEach(function (st, i) {
      var p = PV[i % 3], on = S.stPicked && S.st === i;
      h += '<button type="button" class="opt-style" data-k="st-' + i + '" data-act="style" data-i="' + i + '" aria-pressed="' + on + '">' +
        '<span class="sw" aria-hidden="true" style="background:' + p.bg + ';color:' + p.color + ';font-family:' + p.font + ';font-weight:' + p.weight + '">אב</span>' +
        '<span><span class="sn" style="display:block">' + esc(st.name) + '</span><span class="sd" style="display:block">' + esc(st.desc) + '</span><span class="sm" style="display:block">' + (on ? 'נבחר' : 'לבחור') + '</span></span></button>';
    });
    h += '</div><span class="note">תצוגה לדוגמה של כרטיס הפתיחה, לא הסרטון המלא. כל סגנון מגיע כסט שלם.</span></section>';

    /* 2. כמה לעשות */
    var modes = [
      { k: 'build', t: 'אני מרכיבה בעצמי', d: 'בוחרים סרטון ותוספות, ומשלמים רק על מה שצריך.', p: 'מ-' + fmt(minVideo) + ' ₪', b: '' },
      { k: 'set', t: c.B.name, d: c.B.names, p: fmt(c.B.price) + ' ₪', b: 'מומלץ · חיסכון ' + fmt(c.saving) + ' ₪' },
      { k: 'custom', t: 'עיצוב אישי מאפס', d: 'שאלון קצר, ועיצוב של הכול מאפס.', p: 'החל מ-' + fmt(E.frm) + ' ₪', b: '' }
    ];
    h += '<section class="card b-card" aria-labelledby="s2"><h2 id="s2">2. כמה אתם רוצים שאעשה בשבילכם?</h2><div class="modes" role="group" aria-label="סוג ההזמנה">';
    modes.forEach(function (m) {
      h += '<button type="button" class="opt" data-k="m-' + m.k + '" data-act="mode" data-mode="' + m.k + '" aria-pressed="' + (S.mode === m.k) + '">' +
        '<span class="tx">' + (m.b ? '<span class="bd">' + esc(m.b) + '</span>' : '') + '<strong>' + esc(m.t) + '</strong><span class="ds">' + esc(m.d) + '</span></span>' +
        '<span class="pr">' + esc(m.p) + '</span></button>';
    });
    h += '</div>';
    if (S.mode === 'set') {
      h += '<ul class="inc">';
      c.B.ids.forEach(function (id) { h += '<li>' + TICK_DARK + '<span>' + esc(byId(id).name) + '</span></li>'; });
      h += '</ul><span class="note">רוצים לשנות משהו? בחרו "אני מרכיבה בעצמי".</span>';
    } else if (S.mode === 'build') {
      h += '<div class="items">';
      E.items.filter(function (x) { return x.group === 'video'; }).forEach(function (x) { h += itemBtn(x, !!S.sel[x.id]); });
      E.items.filter(function (x) { return x.group !== 'video'; }).forEach(function (x) { h += itemBtn(x, !!S.sel[x.id]); });
      if (c.nudge) { h += '<div class="nudge">' + esc(c.nudge) + '</div>'; }
      h += '</div>';
    } else {
      h += '<p class="note" style="margin:0">מתחילים בשאלון קצר, ואני מעצבת הכול מאפס, לפי האירוע והסגנון שלכם. <strong>החל מ-' + fmt(E.frm) + ' ₪</strong></p>';
    }
    h += '</section>';

    /* 3. שליחה */
    h += '<section class="card b-card" aria-labelledby="s3"><h2 id="s3">3. שולחים לי</h2><ul class="sum">';
    c.lines.forEach(function (l) { h += '<li>' + esc(l) + '</li>'; });
    h += '</ul><div class="total" aria-live="polite"><strong>' + esc(c.totalText) + '</strong><span class="note">' + esc(c.noteText) + '</span>' +
      (c.perText ? '<span class="note">' + esc(c.perText) + '</span>' : '') + '</div>' +
      '<div class="sub-actions"><a class="btn big" href="' + c.wa + '">' + WA_ICON + (c.ready ? 'לשלוח לי בוואטסאפ' : 'לשאול בוואטסאפ') + '</a>' +
      (c.ready ? '<a class="link" href="' + c.share + '">שיתוף הבחירה עם הוועד או המשפחה</a>' : '') + '</div>' +
      '<details class="details" data-d="dp"' + (S.open.dp ? ' open' : '') + '><summary>תאריך ומספר משתתפים (אופציונלי)</summary><div class="in">' +
      '<label>מתי האירוע?<input class="field" id="date" type="date" value="' + esc(S.date) + '" data-input="date"></label>' +
      (c.dateNote ? '<span class="note">' + esc(c.dateNote) + '</span>' : '') +
      (E.group ? '<label>כמה משתתפים או משפחות?<input class="field" id="people" type="number" inputmode="numeric" min="1" max="1000" value="' + esc(S.people) + '" data-input="people"></label>' : '') +
      '</div></details>' +
      '<span class="note">בלי התחייבות עד שמאשרים הצעת מחיר. את היתרה משלמים אחרי שראיתם את הטיוטה.</span></section>';

    /* נספח: מה צריך ושאלות */
    if (E.needs.length || E.faq.length) {
      h += '<section class="card more">';
      if (E.needs.length) {
        h += '<details data-d="needs"' + (S.open.needs ? ' open' : '') + '><summary>מה אני צריכה ממכם</summary><ul>';
        E.needs.forEach(function (n) { h += '<li>' + TICK_DARK + '<span>' + esc(n.text) + '</span></li>'; });
        h += '</ul><p class="note" style="margin:0 0 14px">לא צריך שיהיה מושלם. מה שיש, מספיק כדי להתחיל.</p></details>';
      }
      if (E.faq.length) {
        h += '<details data-d="faq"' + (S.open.faq ? ' open' : '') + '><summary>שאלות על האירוע הזה</summary><div class="q">';
        E.faq.forEach(function (f) { h += '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; });
        h += '</div></details>';
      }
      h += '</section>';
    }
    h += '</div>';
    h += '<div class="sticky' + (c.ready && c.totalText !== '—' ? ' on' : '') + '" id="sticky" aria-hidden="' + !(c.ready && c.totalText !== '—') + '"><span class="p">' + esc(c.totalText) + '</span>' +
      '<a class="btn" href="' + c.wa + '"' + (c.ready ? '' : ' tabindex="-1"') + '>' + WA_ICON + 'לשלוח בוואטסאפ</a></div>';

    root.innerHTML = h;
    document.body.classList.add('has-sticky');
    if ('IntersectionObserver' in window) {
      if (io) { io.disconnect(); }
      io = new IntersectionObserver(function (en) {
        s3In = en[0].isIntersecting;
        var st = document.getElementById('sticky');
        if (st) { st.classList.toggle('off', s3In); }
      }, { threshold: 0.15 });
      var s3 = document.getElementById('s3');
      if (s3) { io.observe(s3.parentNode); }
      var st0 = document.getElementById('sticky');
      if (st0) { st0.classList.toggle('off', s3In); }
    }
  }

  function rerender() {
    var ae = document.activeElement, id = ae && ae.id, ss = null, se = null;
    if (ae && ae.tagName === 'INPUT') { try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) { ss = null; } }
    render();
    var el = null;
    if (id) { el = document.getElementById(id); }
    else if (lastFocus) { el = root.querySelector('[data-k="' + lastFocus + '"]'); }
    if (el) {
      el.focus({ preventScroll: true });
      if (ss !== null) { try { el.setSelectionRange(ss, se); } catch (e2) { /* type=date / number */ } }
    }
  }

  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !root.contains(b)) { return; }
    lastFocus = b.getAttribute('data-k');
    var act = b.getAttribute('data-act');
    if (act === 'style') { S.st = parseInt(b.getAttribute('data-i'), 10); S.stPicked = true; }
    else if (act === 'mode') {
      S.mode = b.getAttribute('data-mode');
      if (S.mode === 'set') { S.sel = bundleSel(); }
    } else if (act === 'item') {
      var id = b.getAttribute('data-id'), x = byId(id), sel = Object.assign({}, S.sel);
      if (sel[id]) { delete sel[id]; }
      else {
        if (x.group) { E.items.forEach(function (o) { if (o.group === x.group) { delete sel[o.id]; } }); }
        sel[id] = true;
      }
      S.sel = sel;
    }
    rerender();
  });
  root.addEventListener('input', function (ev) {
    var f = ev.target.getAttribute && ev.target.getAttribute('data-input');
    if (!f) { return; }
    S[f] = ev.target.value;
    rerender();
  });
  root.addEventListener('toggle', function (ev) {
    var d = ev.target.getAttribute && ev.target.getAttribute('data-d');
    if (d) { S.open[d] = ev.target.open; }
  }, true);

  render();
})();
