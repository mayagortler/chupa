/* צ׳ופה – שאלון הכיוון ולוח ההשראה של הבילדר: מצב, שורות שנפתחות ולוח חי. בלי תמונות ובלי ייצוא. */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function allKeys(cfg) { return cfg.questions.map(function (q) { return q.k; }).concat([cfg.extra.k]); }
  function byKey(cfg, k) { return cfg.questions.filter(function (q) { return q.k === k; })[0]; }
  function num(a, b) { return a - b; }

  /* ---------- מצב ולוגיקה ---------- */
  function emptyState(cfg) {
    var s = { sel: {}, dropped: [], notes: {}, open: {} };
    cfg.questions.forEach(function (q) { s.sel[q.k] = []; });
    allKeys(cfg).forEach(function (k) { s.notes[k] = ''; });
    return s;
  }

  /* בחירה בשאלה: אחת או כמה, ואפשרות "solo" שעומדת לבד. בחירת פלטה אחרת מאפסת צבעים שהוסרו. */
  function pick(s, q, i) {
    var cur = s.sel[q.k], at = cur.indexOf(i);
    if (q.k === 'pal') { s.dropped = []; }
    if (at >= 0) { cur.splice(at, 1); return s; }
    if (!q.multi || q.solo === i) { s.sel[q.k] = [i]; return s; }
    if (q.solo != null) { var so = cur.indexOf(q.solo); if (so >= 0) { cur.splice(so, 1); } }
    cur.push(i); cur.sort(num);
    return s;
  }

  /* הסרה והחזרה של צבע מהפלטה שנבחרה */
  function toggleDrop(s, i) {
    var at = s.dropped.indexOf(i);
    if (at >= 0) { s.dropped.splice(at, 1); } else { s.dropped.push(i); s.dropped.sort(num); }
    return s;
  }

  function hasAny(s) {
    return Object.keys(s.sel).some(function (k) { return s.sel[k].length > 0; }) || s.dropped.length > 0 ||
      Object.keys(s.notes).some(function (k) { return s.notes[k].trim() !== ''; });
  }

  function chosenPalette(s, cfg) {
    var pq = byKey(cfg, 'pal');
    return s.sel.pal.length ? pq.o[s.sel.pal[0]] : null;
  }
  function droppedNames(s, cfg) {
    var p = chosenPalette(s, cfg);
    return p && p.cn ? s.dropped.map(function (i) { return p.cn[i]; }) : [];
  }

  /* השורות שנכנסות להודעה בוואטסאפ */
  function lines(s, cfg) {
    var out = [], drop = droppedNames(s, cfg);
    cfg.questions.forEach(function (q) {
      var names = s.sel[q.k].map(function (i) { return q.o[i].n; });
      if (!names.length) { return; }
      out.push(q.l + ': ' + names.join(', ') + (q.k === 'pal' && drop.length ? ' (בלי: ' + drop.join(', ') + ')' : ''));
    });
    var notes = cfg.questions.concat([cfg.extra])
      .filter(function (q) { return s.notes[q.k].trim() !== ''; })
      .map(function (q) { return q.l + ': "' + s.notes[q.k].trim() + '"'; });
    if (notes.length) { out.push('הערות: ' + notes.join('; ')); }
    return out;
  }

  /* ---------- אייקונים ---------- */
  var ICONS = {
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 21l5-3 5 3-1.5-7"/>',
    diamond: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M7 13h10a5 5 0 0 1-10 0zM9 9h.01M15 9h.01"/>',
    balloon: '<path d="M12 3a6 6 0 0 0-6 6c0 4 3 7 6 7s6-3 6-7a6 6 0 0 0-6-6z"/><path d="M12 16v5"/>',
    wand: '<path d="M4 20 16 8M14 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>',
    shapes: '<rect x="3" y="13" width="8" height="8"/><circle cx="17" cy="17" r="4"/><path d="M12 3l4 7H8z"/>',
    text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    note: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>'
  };
  function icon(n, size) {
    size = size || 20;
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  }

  /* ---------- שורות שנפתחות אחת-אחת ---------- */
  /* שורה כללית: כותרת עם התשובה הנוכחית, וגוף שנפתח. משמשת גם לשורות המעשיות של הבילדר. */
  function row(k, label, summary, open, bodyHtml) {
    return '<div class="row' + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="row-h" data-k="r-' + k + '" data-act="row" data-row="' + k + '" aria-expanded="' + !!open + '" aria-controls="rb-' + k + '">' +
      '<span class="row-l">' + esc(label) + '</span>' +
      '<span class="row-v' + (summary ? '' : ' row-v-empty') + '">' + esc(summary || 'לא חובה') + '</span>' + icon('chevron', 18) + '</button>' +
      '<div class="row-b" id="rb-' + k + '"' + (open ? '' : ' hidden') + '>' + bodyHtml + '</div></div>';
  }

  function noteTool(s, k, ph) {
    var h = '<button type="button" class="dq-tool" data-k="dn-' + k + '" data-act="dnote" data-q="' + k + '" aria-expanded="' + !!s.open[k] + '">' +
      icon('note', 16) + (s.notes[k] ? 'עריכת הערה' : 'הוספת הערה') + '</button>';
    if (s.open[k]) {
      h += '<label class="sr-only" for="note-' + k + '">הערה</label>' +
        '<textarea class="field dq-note" id="note-' + k + '" maxlength="120" rows="2" data-note="' + k + '" placeholder="' + esc(ph || '') + '">' + esc(s.notes[k]) + '</textarea>';
    }
    return h;
  }

  /* צבעי הפלטה שנבחרה, ולכל צבע כפתור הסרה. צבע שהוסר אפשר להחזיר. */
  function paletteChips(s, cfg) {
    var p = chosenPalette(s, cfg);
    if (!p || !p.c) { return ''; }
    var h = '<div class="chips" role="group" aria-label="הצבעים בפלטה">';
    p.c.forEach(function (c, i) {
      var gone = s.dropped.indexOf(i) >= 0;
      h += '<span class="chip' + (gone ? ' chip-gone' : '') + '"><span class="chip-sw" style="background:' + c + '"></span>' + esc(p.cn[i]) +
        '<button type="button" class="chip-x" data-k="dd-' + i + '" data-act="ddrop" data-i="' + i + '" aria-label="' + (gone ? 'החזרת הצבע ' : 'הסרת הצבע ') + esc(p.cn[i]) + '">' + (gone ? '↺' : '✕') + '</button></span>';
    });
    return h + '</div>';
  }

  function summaryOf(s, cfg, q) {
    var names = s.sel[q.k].map(function (i) { return q.o[i].n; });
    if (q.k === 'pal' && names.length) {
      var d = droppedNames(s, cfg);
      return names.join(', ') + (d.length ? ' (בלי: ' + d.join(', ') + ')' : '');
    }
    return names.join(' · ');
  }

  /* כל שאלות הכיוון כשורות. openKey: השורה הפתוחה כרגע. afterQuestions: שורות נוספות שנכנסות לפני שורת "משהו נוסף". */
  function renderRows(s, cfg, openKey, afterQuestions) {
    var h = '';
    cfg.questions.forEach(function (q) {
      var body = '<div class="dq-opts" role="group" aria-label="' + esc(q.t) + '">';
      q.o.forEach(function (o, i) {
        var on = s.sel[q.k].indexOf(i) >= 0;
        var st = o.f ? ' style="font-family:' + o.f + ';font-weight:' + o.w + '"' : '';
        body += '<button type="button" class="dq-opt' + (o.f ? ' dq-font' : '') + '" data-k="d-' + q.k + '-' + i + '" data-act="dpick" data-q="' + q.k + '" data-i="' + i + '" aria-pressed="' + on + '"' + st + '>' + esc(o.n) + '</button>';
      });
      body += '</div>' + (q.k === 'pal' ? paletteChips(s, cfg) : '') + noteTool(s, q.k, q.ph);
      h += row(q.k, q.l, summaryOf(s, cfg, q), openKey === q.k, body);
    });
    h += afterQuestions || '';
    var x = cfg.extra;
    h += row(x.k, x.t, s.notes[x.k].trim() ? '"' + s.notes[x.k].trim() + '"' : '', openKey === x.k,
      '<label class="sr-only" for="note-' + x.k + '">' + esc(x.t) + '</label><textarea class="field dq-note" id="note-' + x.k + '" maxlength="120" rows="2" data-note="' + x.k + '" placeholder="' + esc(x.ph || '') + '">' + esc(s.notes[x.k]) + '</textarea>');
    return h;
  }

  /* ---------- לוח ההשראה ---------- */
  function cellExtra(s, k) {
    return s.notes[k].trim() ? '<span class="mb-note">' + esc(s.notes[k].trim()) + '</span>' : '';
  }

  function renderBoard(s, cfg, title) {
    var name = title || 'השם של האירוע';
    var fq = byKey(cfg, 'font'), f = s.sel.font.length ? fq.o[s.sel.font[0]] : null;
    var pq = byKey(cfg, 'pal'), p = chosenPalette(s, cfg);
    var h = '<div class="mb" id="board" role="img" aria-label="לוח ההשראה: ' + esc(lines(s, cfg).join('. ') || 'עוד לא נבחר כלום') + '">';

    h += '<div class="mb-cell mb-wide mb-name"><span class="mb-lab">' + esc(fq.l) + '</span>' +
      (f ? '<span class="mb-title" style="font-family:' + f.f + ';font-weight:' + f.w + ';font-size:' + Math.round(30 * f.s) + 'px">' + esc(name) + '</span>'
         : '<span class="mb-title mb-title-empty">' + esc(name) + '</span><span class="mb-ph">בחרו כתב</span>') +
      cellExtra(s, 'font') + '</div>';

    var sw;
    if (!p) { sw = '<span class="mb-ph">בחרו צבעים</span>'; }
    else if (!p.c) { sw = '<span class="mb-sws">' + [0, 1, 2, 3].map(function () { return '<span class="mb-sw mb-sw-own"></span>'; }).join('') + '</span><span class="mb-ph">הצבעים שלכם, תשלחו לי</span>'; }
    else {
      sw = '<span class="mb-sws">' + p.c.map(function (c, i) {
        return s.dropped.indexOf(i) >= 0 ? '' : '<span class="mb-sw" style="background:' + c + '"></span>';
      }).join('') + '</span><span class="mb-val">' + esc(p.n) + '</span>';
    }
    h += '<div class="mb-cell mb-wide"><span class="mb-lab">' + esc(pq.l) + '</span>' + sw + cellExtra(s, 'pal') + '</div>';

    ['mood', 'el'].forEach(function (k) {
      var q = byKey(cfg, k), sel = s.sel[k];
      h += '<div class="mb-cell"><span class="mb-lab">' + esc(q.l) + '</span>' +
        (sel.length
          ? '<span class="mb-icons">' + sel.map(function (i) { return icon(q.o[i].i, 26); }).join('') + '</span><span class="mb-val">' + esc(sel.map(function (i) { return q.o[i].n; }).join(' · ')) + '</span>'
          : '<span class="mb-ph">' + esc(q.empty) + '</span>') +
        cellExtra(s, k) + '</div>';
    });

    var xk = cfg.extra.k;
    if (s.notes[xk].trim()) {
      h += '<div class="mb-cell mb-wide"><span class="mb-lab">' + esc(cfg.extra.l) + '</span>' + cellExtra(s, xk) + '</div>';
    }
    h += '<div class="mb-sign">לוח ההשראה של ' + esc(name) + ' · צ׳ופה</div></div>';
    return h;
  }

  var API = {
    emptyState: emptyState, pick: pick, toggleDrop: toggleDrop, hasAny: hasAny, lines: lines,
    row: row, renderRows: renderRows, renderBoard: renderBoard, icon: icon
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; } else { root.Direction = API; }
})(typeof window !== 'undefined' ? window : this);
