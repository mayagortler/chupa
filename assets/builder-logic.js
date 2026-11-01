/* צ׳ופה – הלוגיקה הטהורה של הבילדר: מחיר, ולידציה והודעה לוואטסאפ. בלי DOM, נבדקת ב-node. */
(function (root) {
  'use strict';

  var WHERE = [['screen', 'מסך באולם'], ['wa', 'שליחה בוואטסאפ'], ['both', 'גם וגם']];
  var HAVE = [['photos', 'תמונות'], ['song', 'שיר'], ['logo', 'לוגו או סמל'], ['names', 'שמות וטקסטים']];

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function isOther(E) { return !E.items.length; }
  function byId(E, id) { return E.items.filter(function (x) { return x.id === id; })[0]; }
  function bundleSel(E) {
    var o = {};
    E.bundle.ids.forEach(function (id) { o[id] = true; });
    return o;
  }

  function initialState(E) {
    return {
      mode: isOther(E) ? 'custom' : 'set',
      sel: isOther(E) ? {} : bundleSel(E),
      eventName: '',
      title: '',
      where: '',
      have: {},
      date: ''
    };
  }

  /* מחיר ותיאור הבחירה. כל מחיר הוא "החל מ-" והסכום הסופי נקבע לפי היקף העבודה. */
  function quote(E, S) {
    var out = { price: 0, hasChoice: false, custom: S.mode === 'custom', saving: 0, bundleSum: 0, names: [], nudge: '', totalText: '—', noteText: 'בחרו מה לכלול, והמחיר יתעדכן כאן.' };
    if (isOther(E)) {
      out.custom = true; out.hasChoice = true;
      out.totalText = 'החל מ-' + fmt(E.frm) + ' ₪';
      out.noteText = 'הצעת מחיר אחרי שאלון קצר.';
      return out;
    }
    var B = E.bundle;
    var ids = Object.keys(S.sel).filter(function (k) { return S.sel[k]; });
    var sum = ids.reduce(function (a, id) { return a + (byId(E, id) ? byId(E, id).price : 0); }, 0);
    var isBundleSel = B.ids.length > 0 && ids.length === B.ids.length && B.ids.every(function (id) { return S.sel[id]; });
    out.bundleSum = B.ids.reduce(function (a, id) { return a + byId(E, id).price; }, 0);
    out.saving = out.bundleSum - B.price;
    if (S.mode === 'set') { out.price = B.price; out.hasChoice = B.ids.length > 0; }
    else if (S.mode === 'build') { out.price = isBundleSel ? B.price : sum; out.hasChoice = ids.length > 0; }
    else { out.hasChoice = true; }
    out.names = (S.mode === 'set' ? B.ids : ids).map(function (id) { return byId(E, id).name; });
    if (S.mode === 'build' && !isBundleSel) {
      var inB = ids.filter(function (id) { return B.ids.indexOf(id) >= 0; });
      var extra = ids.filter(function (id) { return B.ids.indexOf(id) < 0; });
      if (inB.length >= 1 && extra.length === 0) {
        var missing = B.ids.filter(function (id) { return !S.sel[id]; }).map(function (id) { return byId(E, id).name; });
        out.nudge = 'הוסיפו ' + missing.join(', ') + ' וקבלו את הסט התואם החל מ-' + fmt(B.price) + ' ₪ (חיסכון של ' + fmt(out.saving) + ' ₪).';
      }
    }
    if (out.custom) {
      out.totalText = 'החל מ-' + fmt(E.frm) + ' ₪';
      out.noteText = 'הצעת מחיר אחרי שאלון קצר.';
    } else if (out.hasChoice) {
      out.totalText = 'החל מ-' + fmt(out.price) + ' ₪';
      out.noteText = (S.mode === 'set' || isBundleSel)
        ? 'מחיר סט: חיסכון של ' + fmt(out.saving) + ' ₪. המחיר הסופי נקבע לפי היקף העבודה.'
        : 'מחיר לפי הפריטים שבחרתם. המחיר הסופי נקבע לפי היקף העבודה.';
    }
    return out;
  }

  /* האם אפשר להמשיך מהמסך. page: 'mode' | 'items' | 'dir' | 'send'. רק שני המסכים הראשונים יכולים להיחסם. */
  function canAdvance(E, S, page) {
    if (page === 'mode' && isOther(E) && !S.eventName.trim()) { return { ok: false, why: 'כתבו איזה אירוע זה' }; }
    if (page === 'items' && !isOther(E) && S.mode === 'build' && !quote(E, S).hasChoice) { return { ok: false, why: 'בחרו לפחות פריט אחד' }; }
    return { ok: true, why: '' };
  }

  function dateInfo(S, now) {
    if (!S.date) { return { fmt: '', note: '' }; }
    var p = S.date.split('-');
    var days = Math.ceil((new Date(S.date).getTime() - (now || Date.now())) / 86400000);
    var note = days < 0 ? 'התאריך כבר עבר.'
      : days <= 10 ? 'האירוע בעוד ' + days + ' ימים. כתבו לי עכשיו ואבדוק אם אספיק. עבודה דחופה (פחות מ-5 ימים) בתוספת 30%.'
      : 'מצוין, יש זמן. חומרים עד 10 ימים לפני האירוע.';
    return { fmt: p[2] + '/' + p[1] + '/' + p[0], note: note };
  }

  /* השורות המעשיות לסיכום ולהודעה */
  function practicalLines(S) {
    var out = [], d = dateInfo(S);
    var where = '', have = [];
    WHERE.forEach(function (w) { if (S.where === w[0]) { where = w[1]; } });
    HAVE.forEach(function (w) { if (S.have[w[0]]) { have.push(w[1]); } });
    if (S.title.trim()) { out.push('שם: ' + S.title.trim()); }
    if (where) { out.push('יוצג: ' + where); }
    if (have.length) { out.push('כבר יש לנו: ' + have.join(', ')); }
    if (d.fmt) { out.push('תאריך: ' + d.fmt); }
    return out;
  }

  /* ההודעה לוואטסאפ. dirLines: שורות הכיוון העיצובי מ-direction.js */
  function message(E, S, dirLines) {
    var q = quote(E, S), m;
    var other = isOther(E);
    m = other ? 'היי, יש לי אירוע: ' + S.eventName.trim() + '.' : 'היי, מעוניינת בעיצוב ל' + E.what + '.';
    var pl = practicalLines(S);
    pl.forEach(function (l) {
      if (l.indexOf('שם: ') === 0) { m += ' שם האירוע: ' + l.slice(4) + '.'; }
      else if (l.indexOf('תאריך: ') === 0) { m += ' תאריך האירוע: ' + l.slice(7) + '.'; }
      else { m += ' ' + l + '.'; }
    });
    if (dirLines && dirLines.length) { m += '\n' + dirLines.join('\n') + '\n'; }
    if (other) { m += ' אשמח לשאלון קצר. מחיר: ' + q.totalText + '.'; }
    else if (q.custom) { m += ' אני רוצה עיצוב אישי ואשמח לשאלון קצר.'; }
    else if (q.hasChoice) { m += ' כולל: ' + q.names.join(', ') + '. מחיר: ' + q.totalText + '.'; }
    else { m += ' אשמח לשמוע אפשרויות.'; }
    return m.replace(/\n /g, '\n');
  }

  var API = {
    WHERE: WHERE, HAVE: HAVE, fmt: fmt, isOther: isOther,
    initialState: initialState, quote: quote, canAdvance: canAdvance,
    dateInfo: dateInfo, practicalLines: practicalLines, message: message
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; } else { root.BuilderLogic = API; }
})(typeof window !== 'undefined' ? window : this);
