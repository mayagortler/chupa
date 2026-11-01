/* צ׳ופה – איורי המוצרים (קו נקי בצבע אחד, גריד 24). מפתח: מזהה הפריט ב-data.js. */
(function (root) {
  'use strict';

  /* תג קטן בפינת המסך של הסרטונים. הרקע שלו מכסה את פינת המסך, ונלקח מ---icon-bg של המיכל. */
  function badge(glyph) {
    return '<circle cx="18.5" cy="17.5" r="5" stroke="none" style="fill:var(--icon-bg,#fff)"></circle>' + glyph;
  }
  var SCREEN = '<rect x="2.5" y="4.5" width="16" height="12" rx="2.5"></rect><path d="M8.6 8.2v4.6l3.9-2.3z"></path>';
  var HEART = function (x, y, s) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 3.4S-3 1.6-3-.4a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8C3 1.6 0 3.4 0 3.4z"></path>';
  };
  var CARD = '<rect x="4.5" y="3.5" width="15" height="17" rx="2"></rect><path d="M4.5 7.5h15"></path>';

  var SHAPES = {
    /* סרטונים */
    'video-short': SCREEN + badge('<circle cx="18.5" cy="17.5" r="3.6"></circle><path d="M18.5 15.6v1.9l1.2.9"></path>'),
    'video-full': '<rect x="2.5" y="3.5" width="19" height="13" rx="2.5"></rect><path d="M10.2 7.7v4.6l3.9-2.3z"></path><path d="M3 20.5h18"></path><circle cx="14" cy="20.5" r="1.4"></circle>',
    'video-invite': SCREEN + badge('<rect x="14.8" y="14.9" width="7.4" height="5.3" rx="1"></rect><path d="M15.2 15.4l3.3 2.3 3.3-2.3"></path>'),
    'video-evening': SCREEN + badge('<path d="M20.3 14.1a3.6 3.6 0 1 0 1.9 5.6 3.4 3.4 0 0 1-1.9-5.6z"></path>'),
    'video-opening': SCREEN + badge('<path d="M18.5 13.6c.4 2.4 1.2 3.3 3.8 3.9-2.6.6-3.4 1.5-3.8 3.9-.4-2.4-1.2-3.3-3.8-3.9 2.6-.6 3.4-1.5 3.8-3.9z"></path>'),
    'video-summary': SCREEN + badge('<path d="M21.9 17.5a3.4 3.4 0 1 1-1.2-2.6"></path><path d="M21 13.6v1.6h-1.6"></path>'),
    /* הזמנות */
    'invite': '<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3.5 7l8.5 6.5L20.5 7"></path>',
    'save-date': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"></rect><path d="M3.5 9.5h17M8 3v4M16 3v4"></path>' + HEART(12, 14, 1),
    'surprise': '<rect x="3" y="9" width="18" height="12" rx="2"></rect><path d="M3.5 10l8.5 6 8.5-6"></path><path d="M6.5 3.5l1 2.5M12 2.5v3M17.5 3.5l-1 2.5"></path>',
    /* מצגות */
    'slides': '<rect x="3" y="3.5" width="18" height="12" rx="1.8"></rect><path d="M12 15.5v2M8 21l2.2-3.5h3.6L16 21"></path><path d="M7 12l3-3 2.5 2.5L17 7"></path>',
    'slides-pair': '<path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h11A1.5 1.5 0 0 1 21 5.5v8a1.5 1.5 0 0 1-1.5 1.5H18"></path><rect x="3" y="9" width="15" height="11" rx="1.5"></rect><path d="M6.5 13h8M6.5 16h5"></path>',
    /* כרטיסים */
    'thanks': CARD + '<path d="M12 10.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"></path>',
    'greeting': CARD + '<path d="M12 9.6a3.1 3.5 0 0 0-3.1 3.5c0 2.1 1.5 3.5 3.1 3.5s3.1-1.4 3.1-3.5A3.1 3.5 0 0 0 12 9.6z"></path><path d="M11.5 16.6h1M12 16.6c0 1-.9 1.3-.6 2.4"></path>',
    'love': CARD + HEART(12, 13.2, 1.25),
    /* עוד */
    'menu': '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M8.5 8h7M8.5 12h7M8.5 16h4"></path>',
    'seating': '<circle cx="12" cy="12" r="4.3"></circle><circle cx="12" cy="3.8" r="1.6"></circle><circle cx="20.2" cy="12" r="1.6"></circle><circle cx="12" cy="20.2" r="1.6"></circle><circle cx="3.8" cy="12" r="1.6"></circle>',
    'birth': '<path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5H12z"></path><path d="M4.5 12h15a5.5 5.5 0 0 1-5.5 5h-4a5.5 5.5 0 0 1-5.5-5zM4.5 12L3.2 7.5H2"></path><circle cx="8.5" cy="19.6" r="1.4"></circle><circle cx="15.5" cy="19.6" r="1.4"></circle>',
    'sign': '<circle cx="12" cy="3.2" r=".9"></circle><path d="M11.3 3.8L5 9.5M12.7 3.8L19 9.5"></path><rect x="3" y="9.5" width="18" height="10.5" rx="2"></rect><path d="M7.5 14.8h9"></path>',
    'item': '<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 12h6M12 9v6"></path>'
  };

  var BY_ITEM = {
    vs: 'video-short', vf: 'video-full', vi: 'video-invite', ve: 'video-evening', vo: 'video-opening', vsum: 'video-summary',
    inv: 'invite', std: 'save-date', sur: 'surprise',
    pres: 'slides', slides: 'slides-pair',
    thx: 'thanks', card: 'greeting', love: 'love',
    menu: 'menu', seat: 'seating', ann: 'birth', wel: 'sign', sign: 'sign'
  };

  /* מחזיר SVG דקורטיבי (aria-hidden). השם של הפריט תמיד מופיע לידו כטקסט. */
  function icon(itemId, size) {
    var s = size || 24;
    return '<svg class="ic" aria-hidden="true" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      SHAPES[BY_ITEM[itemId] || 'item'] + '</svg>';
  }

  var API = { icon: icon, SHAPES: SHAPES, BY_ITEM: BY_ITEM };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; } else { root.ChopaIcons = API; }
})(typeof window !== 'undefined' ? window : this);
