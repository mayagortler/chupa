'use strict';
/* טוען את נתוני האתר והלוגיקה של הבילדר, כמו שהבדיקות עושות, כדי שהבוט ישתמש באותם נתונים בדיוק. */
if (typeof global.window === 'undefined') { global.window = {}; }
require('../assets/data.js');
var L = require('../assets/builder-logic.js');
var Dir = require('../assets/direction.js');

module.exports = { D: global.window.SITE_DATA, L: L, Dir: Dir };
