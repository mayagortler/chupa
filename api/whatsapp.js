'use strict';
/* נקודת הכניסה של Vercel ל-webhook של וואטסאפ. כל הלוגיקה ב-bot/handler.js. */
var handler = require('../bot/handler.js');
var store = require('../bot/store.js');
var meta = require('../bot/meta.js');

/* החתימה של מטא מחושבת על הגוף הגולמי, לכן קוראים אותו כמו שהוא מהזרם. */
function readRaw(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(Buffer.from(c)); });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

module.exports = function whatsapp(req, res) {
  var env = process.env;
  return readRaw(req).then(function (rawBody) {
    var deps = {
      env: env,
      store: store.createStore(env, fetch),
      send: function (to, msg) { return meta.send(env, fetch, to, msg); },
      sendTemplate: function (to, name, text) { return meta.sendTemplate(env, fetch, to, name, text); }
    };
    return handler.handle({ method: req.method, query: req.query || {}, headers: req.headers || {}, rawBody: rawBody }, deps);
  }).then(function (out) {
    res.statusCode = out.status;
    res.end(out.body);
  }).catch(function (e) {
    console.error('bot: handler crashed: ' + (e && e.message));
    res.statusCode = 200; /* מטא שולחת שוב על כל תשובה שאינה 200, וזה רק יוצר כפילויות */
    res.end('error');
  });
};
module.exports.config = { api: { bodyParser: false } };
