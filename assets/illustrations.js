/* צ׳ופה – איורי המוצרים לערכה. באותה שפה של האיורים בדף הבית (צורות שטוחות, צל מוזז, ניצוצות),
   עם פחות צבעים ופרטים. מפתח: מזהה הפריט ב-data.js. */
(function (root) {
  'use strict';

  /* בעיקר גווני לבן ונייר. תכלת (BLUE) רק כנגיעה */
  var NAVY = '#2F4F73', SKY = '#E4DED3', LSKY = '#EEEAE3', PAPER = '#FFFEFB', GOLD = '#D9B064', LGOLD = '#F9E2A0', PINK = '#E8A9A3', BLUE = '#BFD9F2', TILE = '#F6F3EE';

  /* צל מוזז כמו בדף הבית: אותה צורה בשחור 10%, מוזזת קצת למטה */
  function sh(el) { return '<g fill="#1C1C1E" fill-opacity=".1" transform="translate(1.5 3)">' + el.replace(/ fill="[^"]*"/g, '') + '</g>' + el; }
  function bar(x, y, w, h, c) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + c + '"/>'; }
  function spark(x, y, r, c) {
    var q = r * 0.18;
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + q) + ' ' + (y - q) + ' ' + (x + r) + ' ' + y + 'Q' + (x + q) + ' ' + (y + q) + ' ' + x + ' ' + (y + r) + 'Q' + (x - q) + ' ' + (y + q) + ' ' + (x - r) + ' ' + y + 'Q' + (x - q) + ' ' + (y - q) + ' ' + x + ' ' + (y - r) + 'Z" fill="' + (c || '#FFFFFF') + '"/>';
  }
  function heart(x, y, s, c) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 6C-4 3.4-7 .8-7-2.4a3.6 3.6 0 0 1 7-1.2 3.6 3.6 0 0 1 7 1.2C7 .8 4 3.4 0 6z" fill="' + (c || PINK) + '"/>';
  }

  /* מסך עם כפתור נגן, משותף לכל הסרטונים. badge: תוכן התג העגול בפינה */
  function video(badge) {
    return '<rect x="56" y="80" width="8" height="10" fill="' + NAVY + '"/>' + bar(44, 89, 32, 6, NAVY) +
      sh('<rect x="20" y="30" width="80" height="52" rx="8" fill="' + NAVY + '"/>') +
      '<rect x="25" y="35" width="70" height="42" rx="4" fill="' + BLUE + '"/>' +
      sh('<circle cx="60" cy="56" r="12" fill="' + PAPER + '"/>') +
      '<path d="M56.5 50.5v11l9.5-5.5z" fill="' + NAVY + '" stroke="' + NAVY + '" stroke-width="2" stroke-linejoin="round"/>' +
      (badge ? sh('<circle cx="96" cy="32" r="12" fill="' + PAPER + '"/>') + badge : '');
  }
  var ENV_BACK = '<path d="M24 60L60 34l36 26z" fill="' + NAVY + '"/>';
  var ENV_FRONT = sh('<path d="M24 60h72v32a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4z" fill="' + SKY + '"/>') +
    '<path d="M26 94l34-22 34 22" fill="none" stroke="' + LSKY + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  function card(rot, inner) {
    return '<g transform="rotate(' + rot + ' 60 62)">' + sh('<rect x="32" y="24" width="56" height="74" rx="4" fill="' + PAPER + '"/>') + inner + '</g>';
  }

  var ART = {
    'video-short': video('<circle cx="96" cy="32" r="7" fill="' + LSKY + '"/><path d="M96 28v4.5l3 1.8" fill="none" stroke="' + NAVY + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    'video-full': video('') + bar(31, 70, 58, 3, PAPER) + '<circle cx="72" cy="71.5" r="3.5" fill="' + NAVY + '"/>' + spark(98, 26, 6) + spark(18, 22, 4, GOLD),
    'video-invite': video('<rect x="89" y="27" width="14" height="10" rx="1.5" fill="' + SKY + '"/><path d="M89.8 28l6.2 4.4 6.2-4.4" fill="none" stroke="' + PAPER + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    'video-evening': video('<path d="M97.5 24.8a7.5 7.5 0 1 0 6 11.3 6 6 0 0 1-6-11.3z" fill="' + GOLD + '"/>'),
    'video-opening': video(spark(96, 32, 7.5, GOLD)),
    'video-summary': video(heart(96, 32, 0.95)),

    'invite': ENV_BACK + sh('<rect x="36" y="28" width="48" height="46" rx="3" fill="' + PAPER + '"/>') + heart(60, 42, 0.8) + bar(46, 53, 28, 4, NAVY) + bar(51, 61, 18, 3, LSKY) + ENV_FRONT + spark(102, 30, 6) + '<circle cx="18" cy="44" r="2.5" fill="' + GOLD + '"/>',
    'save-date': '<rect x="40" y="22" width="6" height="14" rx="3" fill="' + NAVY + '"/><rect x="74" y="22" width="6" height="14" rx="3" fill="' + NAVY + '"/>' +
      sh('<rect x="28" y="28" width="64" height="66" rx="6" fill="' + PAPER + '"/>') + '<path d="M28 34a6 6 0 0 1 6-6h52a6 6 0 0 1 6 6v10H28z" fill="' + SKY + '"/>' +
      heart(60, 64, 1.5) + bar(48, 82, 24, 3, LSKY) + spark(102, 26, 6) + '<circle cx="18" cy="70" r="2.5" fill="' + GOLD + '"/>',
    'surprise': sh('<rect x="24" y="48" width="72" height="46" rx="4" fill="' + SKY + '"/>') +
      '<path d="M24 52a4 4 0 0 1 4-4h64a4 4 0 0 1 4 4L60 76z" fill="' + LSKY + '"/>' + sh('<circle cx="60" cy="74" r="6" fill="' + GOLD + '"/>') +
      '<rect x="34" y="22" width="4" height="10" rx="2" fill="' + NAVY + '" transform="rotate(-25 36 27)"/><rect x="58" y="14" width="4" height="10" rx="2" fill="' + GOLD + '"/>' +
      '<rect x="80" y="20" width="4" height="10" rx="2" fill="' + PINK + '" transform="rotate(30 82 25)"/>' + '<circle cx="48" cy="34" r="2.5" fill="' + SKY + '"/><circle cx="72" cy="34" r="2.5" fill="' + NAVY + '"/>' + spark(100, 40, 5),

    'slides': '<path d="M50 82l-8 18M70 82l8 18" stroke="' + NAVY + '" stroke-width="4" stroke-linecap="round"/>' +
      sh('<rect x="20" y="26" width="80" height="56" rx="4" fill="' + PAPER + '"/>') + '<rect x="55" y="21" width="10" height="6" rx="2" fill="' + NAVY + '"/>' +
      bar(32, 38, 32, 5, NAVY) + '<rect x="34" y="58" width="9" height="14" rx="1.5" fill="' + LSKY + '"/><rect x="47" y="50" width="9" height="22" rx="1.5" fill="' + BLUE + '"/><rect x="60" y="54" width="9" height="18" rx="1.5" fill="' + LSKY + '"/>' +
      '<circle cx="84" cy="60" r="8" fill="' + LGOLD + '"/>' + spark(108, 22, 5) ,
    'slides-pair': sh('<rect x="40" y="24" width="62" height="42" rx="4" fill="' + SKY + '"/>') + bar(50, 34, 24, 4, PAPER) +
      sh('<rect x="18" y="48" width="62" height="42" rx="4" fill="' + PAPER + '"/>') + bar(28, 60, 30, 5, NAVY) + bar(28, 70, 20, 3, LSKY) +
      spark(66, 78, 5, GOLD) + spark(104, 82, 5),

    'thanks': card(-4, '<polygon points="60,38 63.5,46 72,46.6 65.5,52 67.6,60.4 60,56 52.4,60.4 54.5,52 48,46.6 56.5,46" fill="' + GOLD + '" stroke="' + GOLD + '" stroke-width="2" stroke-linejoin="round"/>' + bar(44, 70, 32, 5, NAVY) + bar(50, 80, 20, 3, LSKY)) + spark(100, 30, 6),
    'greeting': card(4, '<path d="M60 64c0 4 -3 5 -2 10" fill="none" stroke="' + NAVY + '" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="60" cy="50" rx="9" ry="11" fill="' + BLUE + '"/><path d="M58 60.5h4l-2 3z" fill="' + BLUE + '"/><ellipse cx="56.5" cy="46" rx="2" ry="3.2" fill="#FFFFFF" fill-opacity=".7"/>' + bar(44, 78, 32, 5, NAVY) + bar(50, 87, 20, 3, LSKY)) + spark(20, 34, 6) + '<circle cx="102" cy="40" r="2.5" fill="' + GOLD + '"/>',
    'love': card(-3, heart(60, 50, 2) + bar(44, 72, 32, 5, NAVY) + bar(50, 82, 20, 3, LSKY)) + spark(102, 30, 6) + heart(20, 40, 0.7),

    'menu': sh('<rect x="34" y="18" width="52" height="84" rx="4" fill="' + PAPER + '"/>') + bar(44, 30, 32, 5, NAVY) + spark(60, 44, 4, GOLD) +
      bar(42, 54, 36, 3, LSKY) + bar(46, 62, 28, 3, LSKY) + bar(42, 72, 36, 3, LSKY) + bar(48, 80, 24, 3, LSKY) + bar(52, 90, 16, 3, SKY) + spark(102, 30, 6),
    'seating': (function () {
      var c = '', a;
      for (var i = 0; i < 6; i++) { a = i * Math.PI / 3 - Math.PI / 2; c += sh('<circle cx="' + (60 + 31 * Math.cos(a)).toFixed(1) + '" cy="' + (62 + 31 * Math.sin(a)).toFixed(1) + '" r="7" fill="' + BLUE + '"/>'); }
      return c + sh('<circle cx="60" cy="62" r="22" fill="' + PAPER + '"/>') + '<circle cx="60" cy="62" r="16" fill="' + LSKY + '"/>' + bar(52, 60, 16, 5, NAVY) + spark(104, 22, 5) + '<circle cx="16" cy="100" r="2.5" fill="' + GOLD + '"/>';
    })(),
    'birth': '<path d="M30 62L24 44h-8" fill="none" stroke="' + NAVY + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      sh('<path d="M62 34a28 28 0 0 1 28 28H62z" fill="' + NAVY + '"/>') + sh('<path d="M28 62h64a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20z" fill="' + SKY + '"/>') +
      sh('<circle cx="46" cy="92" r="7" fill="' + NAVY + '"/>') + sh('<circle cx="74" cy="92" r="7" fill="' + NAVY + '"/>') + '<circle cx="46" cy="92" r="2.5" fill="' + PAPER + '"/><circle cx="74" cy="92" r="2.5" fill="' + PAPER + '"/>' +
      spark(36, 30, 6, GOLD) + spark(102, 28, 5) ,
    'sign': '<path d="M60 22L32 46M60 22l28 24" stroke="' + GOLD + '" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="22" r="3.5" fill="' + NAVY + '"/>' +
      sh('<rect x="20" y="44" width="80" height="48" rx="5" fill="' + PAPER + '"/>') + bar(36, 60, 48, 7, NAVY) + bar(46, 74, 28, 3, LSKY) + spark(104, 30, 5) + spark(16, 100, 4, GOLD),
    'item': sh('<rect x="32" y="48" width="56" height="44" rx="4" fill="' + SKY + '"/>') + sh('<rect x="28" y="38" width="64" height="14" rx="3" fill="' + NAVY + '"/>') +
      '<rect x="56" y="38" width="8" height="54" fill="' + LGOLD + '"/>' + spark(100, 28, 6)
  };

  var BY_ITEM = {
    vs: 'video-short', vf: 'video-full', vi: 'video-invite', ve: 'video-evening', vo: 'video-opening', vsum: 'video-summary',
    inv: 'invite', std: 'save-date', sur: 'surprise',
    pres: 'slides', slides: 'slides-pair',
    thx: 'thanks', card: 'greeting', love: 'love',
    menu: 'menu', seat: 'seating', ann: 'birth', wel: 'sign', sign: 'sign'
  };

  /* איור דקורטיבי (aria-hidden). השם של הפריט תמיד מופיע לידו כטקסט. tile: רקע תכלת מעוגל */
  function art(itemId, size, tile) {
    var s = size || 96;
    return '<svg class="art" aria-hidden="true" focusable="false" width="' + s + '" height="' + s + '" viewBox="0 0 120 120">' +
      (tile ? '<rect width="120" height="120" rx="22" fill="' + TILE + '"/>' : '') + ART[BY_ITEM[itemId] || 'item'] + '</svg>';
  }

  var API = { art: art, ART: ART, BY_ITEM: BY_ITEM };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; } else { root.ChopaArt = API; }
})(typeof window !== 'undefined' ? window : this);
