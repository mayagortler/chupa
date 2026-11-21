'use strict';
/* כל הטקסטים של הבוט. אפשר לערוך כאן בלי לגעת בלוגיקה. */
module.exports = {
  greeting: 'שלום, כאן הבוט של צ׳ופה. כמה שאלות קצרות, ואז מאיה תחזור אליכם עם כל הפרטים.',
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
  datePlaceholder: 'ממתינה לשאלות הבאות.'
};
