/* צ׳ופה – שאלון הכיוון ולוח ההשראה של הבילדר */
(function (root) {
  'use strict';
  var MAX_PER_Q = 3, MAX_TOTAL = 6;

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
    var s = { sel: {}, avoid: [], notes: {}, imgs: {}, open: {} };
    cfg.questions.forEach(function (q) { s.sel[q.k] = []; });
    allKeys(cfg).forEach(function (k) { s.notes[k] = ''; s.imgs[k] = []; });
    return s;
  }

  /* בחירה בשאלה: אחת או כמה, ואפשרות "solo" שעומדת לבד */
  function pick(s, q, i) {
    var cur = s.sel[q.k], at = cur.indexOf(i);
    if (at >= 0) { cur.splice(at, 1); return s; }
    if (!q.multi || q.solo === i) { s.sel[q.k] = [i]; return s; }
    if (q.solo != null) { var so = cur.indexOf(q.solo); if (so >= 0) { cur.splice(so, 1); } }
    cur.push(i); cur.sort(num);
    return s;
  }

  function toggleAvoid(s, i) {
    var at = s.avoid.indexOf(i);
    if (at >= 0) { s.avoid.splice(at, 1); } else { s.avoid.push(i); s.avoid.sort(num); }
    return s;
  }

  function imgTotal(s) { return Object.keys(s.imgs).reduce(function (a, k) { return a + s.imgs[k].length; }, 0); }
  function canAddImg(s, k) { return s.imgs[k].length < MAX_PER_Q && imgTotal(s) < MAX_TOTAL; }

  function hasAny(s) {
    return Object.keys(s.sel).some(function (k) { return s.sel[k].length > 0; }) || s.avoid.length > 0 ||
      Object.keys(s.notes).some(function (k) { return s.notes[k].trim() !== ''; }) || imgTotal(s) > 0;
  }

  /* השורות שנכנסות להודעה בוואטסאפ */
  function lines(s, cfg) {
    var out = [];
    var avoidNames = s.avoid.map(function (i) { return cfg.avoid[i][0]; });
    cfg.questions.forEach(function (q) {
      var names = s.sel[q.k].map(function (i) { return q.o[i].n; });
      if (q.k === 'pal' && avoidNames.length) {
        out.push(names.length ? q.l + ': ' + names.join(', ') + ' (בלי: ' + avoidNames.join(', ') + ')' : 'בלי הצבעים: ' + avoidNames.join(', '));
        return;
      }
      if (names.length) { out.push(q.l + ': ' + names.join(', ')); }
    });
    var notes = cfg.questions.concat([cfg.extra])
      .filter(function (q) { return s.notes[q.k].trim() !== ''; })
      .map(function (q) { return q.l + ': "' + s.notes[q.k].trim() + '"'; });
    if (notes.length) { out.push('הערות: ' + notes.join('; ')); }
    if (out.length || imgTotal(s) > 0) { out.push('מצרפת את לוח ההשראה'); }
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
    note: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
  };
  function icon(n, size) {
    size = size || 20;
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  }

  /* ---------- השאלון ---------- */
  function tools(s, k, ph) {
    var h = '<div class="dq-tools">' +
      '<button type="button" class="dq-tool" data-k="dn-' + k + '" data-act="dnote" data-q="' + k + '" aria-expanded="' + !!s.open[k] + '">' + icon('note', 16) + (s.notes[k] ? 'עריכת הערה' : 'הוספת הערה') + '</button>';
    if (canAddImg(s, k)) {
      h += '<button type="button" class="dq-tool" data-k="di-' + k + '" data-act="dimg" data-q="' + k + '">' + icon('photo', 16) + 'העלאת תמונה להשראה</button>';
    }
    h += '</div>';
    if (s.open[k]) {
      h += '<label class="sr-only" for="note-' + k + '">הערה</label>' +
        '<textarea class="field dq-note" id="note-' + k + '" maxlength="120" rows="2" data-note="' + k + '" placeholder="' + esc(ph || '') + '">' + esc(s.notes[k]) + '</textarea>';
    }
    if (s.imgs[k].length) {
      h += '<div class="dq-thumbs">' + s.imgs[k].map(function (src, j) {
        return '<span class="dq-thumb"><img src="' + src + '" alt="תמונת השראה ' + (j + 1) + '">' +
          '<button type="button" class="dq-x" data-k="dx-' + k + '-' + j + '" data-act="dimgx" data-q="' + k + '" data-j="' + j + '" aria-label="הסרת תמונה ' + (j + 1) + '">✕</button></span>';
      }).join('') + '</div>';
    }
    return h;
  }

  function renderForm(s, cfg) {
    var h = '';
    cfg.questions.forEach(function (q) {
      h += '<div class="dq" role="group" aria-labelledby="dq-' + q.k + '"><h3 id="dq-' + q.k + '">' + esc(q.t) +
        (q.multi ? ' <span class="dq-hint">אפשר לבחור כמה</span>' : '') + '</h3><div class="dq-opts">';
      q.o.forEach(function (o, i) {
        var on = s.sel[q.k].indexOf(i) >= 0;
        var st = o.f ? ' style="font-family:' + o.f + ';font-weight:' + o.w + '"' : '';
        h += '<button type="button" class="dq-opt' + (o.f ? ' dq-font' : '') + '" data-k="d-' + q.k + '-' + i + '" data-act="dpick" data-q="' + q.k + '" data-i="' + i + '" aria-pressed="' + on + '"' + st + '>' + esc(o.n) + '</button>';
      });
      h += '</div>';
      if (q.k === 'pal') {
        h += '<p class="dq-sub" id="dq-avoid">יש צבע שממש לא? <span>(לא חובה)</span></p><div class="dq-avoid" role="group" aria-labelledby="dq-avoid">';
        cfg.avoid.forEach(function (a, i) {
          var on = s.avoid.indexOf(i) >= 0;
          h += '<button type="button" class="dq-dot" data-k="da-' + i + '" data-act="davoid" data-i="' + i + '" aria-pressed="' + on + '" aria-label="' + esc(a[0]) + '" title="' + esc(a[0]) + '" style="background:' + a[1] + '"></button>';
        });
        h += '</div>';
      }
      h += tools(s, q.k, q.ph) + '</div>';
    });
    var x = cfg.extra;
    h += '<div class="dq" role="group" aria-labelledby="dq-' + x.k + '"><h3 id="dq-' + x.k + '">' + esc(x.t) + '</h3>' + tools(s, x.k, x.ph) + '</div>';
    return h;
  }

  /* ---------- לוח ההשראה ---------- */
  function cellExtra(s, k) {
    var h = '';
    if (s.notes[k].trim()) { h += '<span class="mb-note">' + esc(s.notes[k].trim()) + '</span>'; }
    if (s.imgs[k].length) { h += '<span class="mb-imgs">' + s.imgs[k].map(function (src) { return '<img src="' + src + '" alt="">'; }).join('') + '</span>'; }
    return h;
  }

  function renderBoard(s, cfg, title) {
    var name = title || 'השם של האירוע';
    var fq = byKey(cfg, 'font'), f = s.sel.font.length ? fq.o[s.sel.font[0]] : null;
    var pq = byKey(cfg, 'pal'), p = s.sel.pal.length ? pq.o[s.sel.pal[0]] : null;
    var h = '<div class="mb" id="board" role="img" aria-label="לוח ההשראה: ' + esc(lines(s, cfg).join('. ') || 'עוד לא נבחר כלום') + '">';

    h += '<div class="mb-cell mb-wide mb-name"><span class="mb-lab">' + esc(fq.l) + '</span>' +
      (f ? '<span class="mb-title" style="font-family:' + f.f + ';font-weight:' + f.w + ';font-size:' + Math.round(30 * f.s) + 'px">' + esc(name) + '</span>'
         : '<span class="mb-title mb-title-empty">' + esc(name) + '</span><span class="mb-ph">בחרו כתב</span>') +
      cellExtra(s, 'font') + '</div>';

    var sw;
    if (!p) { sw = '<span class="mb-ph">בחרו צבעים</span>'; }
    else if (!p.c) { sw = '<span class="mb-sws">' + [0, 1, 2, 3].map(function () { return '<span class="mb-sw mb-sw-own"></span>'; }).join('') + '</span><span class="mb-ph">הצבעים שלכם, תשלחו לי</span>'; }
    else { sw = '<span class="mb-sws">' + p.c.map(function (c) { return '<span class="mb-sw" style="background:' + c + '"></span>'; }).join('') + '</span><span class="mb-val">' + esc(p.n) + '</span>'; }
    var av = s.avoid.length ? '<span class="mb-avoid"><span class="mb-lab">בלי</span>' + s.avoid.map(function (i) {
      return '<span class="mb-sw mb-x" style="background:' + cfg.avoid[i][1] + '"></span>';
    }).join('') + '</span>' : '';
    h += '<div class="mb-cell mb-wide"><span class="mb-lab">' + esc(pq.l) + '</span>' + sw + av + cellExtra(s, 'pal') + '</div>';

    ['mood', 'el'].forEach(function (k) {
      var q = byKey(cfg, k), sel = s.sel[k];
      h += '<div class="mb-cell"><span class="mb-lab">' + esc(q.l) + '</span>' +
        (sel.length
          ? '<span class="mb-icons">' + sel.map(function (i) { return icon(q.o[i].i, 26); }).join('') + '</span><span class="mb-val">' + esc(sel.map(function (i) { return q.o[i].n; }).join(' · ')) + '</span>'
          : '<span class="mb-ph">' + esc(q.empty) + '</span>') +
        cellExtra(s, k) + '</div>';
    });

    var xk = cfg.extra.k;
    if (s.notes[xk].trim() || s.imgs[xk].length) {
      h += '<div class="mb-cell mb-wide"><span class="mb-lab">' + esc(cfg.extra.l) + '</span>' + cellExtra(s, xk) + '</div>';
    }
    h += '<div class="mb-sign">לוח ההשראה של ' + esc(name) + ' · צ׳ופה</div></div>';
    return h;
  }

  /* ---------- תמונות ---------- */
  function readImage(file, max) {
    max = max || 600;
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) { rej(new Error('type')); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('load')); };
      im.src = url;
    });
  }

  /* ---------- ייצוא ושיתוף ---------- */
  var LIB = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
  var libP = null;
  function loadLib() {
    if (root.htmlToImage) { return Promise.resolve(root.htmlToImage); }
    if (!libP) {
      libP = new Promise(function (res, rej) {
        var sc = document.createElement('script');
        sc.src = LIB; sc.async = true;
        sc.onload = function () { res(root.htmlToImage); };
        sc.onerror = function () { libP = null; rej(new Error('lib')); };
        document.head.appendChild(sc);
      });
    }
    return libP;
  }
  function makeFile(el, name) {
    return loadLib()
      .then(function (lib) { return (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { return lib; }); })
      .then(function (lib) {
        /* בלי השוליים שממרכזים את הלוח בדף, אחרת התמונה זזה הצידה ונחתכת */
        return lib.toBlob(el, { pixelRatio: 2, backgroundColor: '#FFFFFF', width: el.offsetWidth, height: el.offsetHeight, style: { margin: '0' } });
      })
      .then(function (blob) { return new File([blob], name, { type: 'image/png' }); });
  }
  function shareFile(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file] }).then(
        function () { return 'shared'; },
        function (e) { if (e && e.name === 'AbortError') { return 'cancelled'; } throw e; }
      );
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return Promise.resolve('downloaded');
  }

  var API = {
    MAX_PER_Q: MAX_PER_Q, MAX_TOTAL: MAX_TOTAL,
    emptyState: emptyState, pick: pick, toggleAvoid: toggleAvoid, imgTotal: imgTotal, canAddImg: canAddImg,
    hasAny: hasAny, lines: lines, renderForm: renderForm, renderBoard: renderBoard,
    readImage: readImage, makeFile: makeFile, shareFile: shareFile
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; } else { root.Direction = API; }
})(typeof window !== 'undefined' ? window : this);
