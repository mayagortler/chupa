'use strict';
/* כל הטקסטים של הבוט. אפשר לערוך כאן בלי לגעת בלוגיקה. */
module.exports = {
  greeting: 'שלום, כאן הבוט של צ׳ופה. כמה שאלות קצרות, ואז מאיה תחזור אליכם עם כל הפרטים.',
  fromSite: function (what) { return 'קיבלתי את הבקשה שלכם: ' + what + '. נשארו לי רק כמה שאלות.'; },
  eventAsk: 'איזה אירוע?',
  pickButton: 'לבחירה',
  more: 'עוד אפשרויות',
  moreDesc: 'אירועים נוספים',
  retry: 'לא הבנתי. אפשר לבחור מהאפשרויות.',
  eventNameAsk: 'איזה אירוע זה? כתבו במילים שלכם.',
  modeAsk: function (E, q) {
    return E.bundle.name + ': ' + E.bundle.names + '. ' + q.totalText + '.\nאפשר גם לבנות בעצמכם, או לבקש עיצוב אישי.';
  },
  setButton: function (price) { return 'סט תואם ' + price + ' ₪'; },
  buildButton: 'לבנות בעצמי',
  customButton: 'עיצוב אישי',
  itemsAsk: function (q) {
    return 'מה צריך? בחרו פריטים, ובסוף "סיימתי".' + (q.hasChoice ? '\nעד עכשיו: ' + q.names.join(', ') + ', ' + q.totalText + '.' : '');
  },
  itemsButton: 'פריטים',
  itemsDone: 'סיימתי',
  itemsDoneDesc: 'להמשיך לשלב הבא',
  checked: '✓ ',
  dateAsk: 'מתי האירוע? כתבו תאריך, למשל 10/6/2027.',
  dateUnknown: 'עוד לא קבענו',
  dirNote: 'ועכשיו כמה שאלות על העיצוב.',
  multiDone: 'סיימתי',
  multiDoneDesc: 'להמשיך לשאלה הבאה',
  genAsk: function (extra) { return extra.t + ' ' + extra.ph + '.'; },
  skip: 'דלגו',
  whereAsk: 'איפה זה יוצג?',
  haveAsk: 'מה כבר יש לכם? אפשר לבחור כמה, ובסוף "סיימתי".',
  haveButton: 'לבחירה',
  titleAsk: function (E) { return 'איך קוראים לאירוע?' + (E.titleEx ? ' ' + E.titleEx + '.' : '') + ' אפשר לדלג.'; },
  nameAsk: 'ואיך קוראים לכם?',
  closing: 'תודה! מאיה תחזור אליכם בקרוב.',
  handoff: 'בטח, מעבירה את זה למאיה. היא תחזור אליכם בקרוב.',
  phaseLabel: {
    event: 'בחירת אירוע', event2: 'בחירת אירוע', eventName: 'שם האירוע', mode: 'סוג ההזמנה', items: 'בחירת פריטים',
    date: 'תאריך', dir: 'כיוון עיצובי', gen: 'הערות', where: 'איפה יוצג', have: 'מה כבר יש', title: 'שם האירוע', name: 'שם הלקוח'
  }
};
