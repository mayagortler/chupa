'use strict';
/* לוגיקת ה-webhook. כל התלויות (אחסון, שליחה) מגיעות מבחוץ, כך שאפשר לבדוק בלי רשת. */
var engine = require('./engine.js');
var meta = require('./meta.js');
var summary = require('./summary.js');
var C = require('./copy.js');

var DAY = 86400;
var CHAT_TTL = 7 * DAY, DEDUPE_TTL = DAY, LEAD_TTL = 90 * DAY;
var TEMPLATE_MAX = 1000; /* פרמטר בתבנית מוגבל ל-1024 תווים */
/* אם השליחה למאיה נכשלה מכל סיבה (בעיקר חלון של 24 שעות שנסגר), שולחים תבנית */

function notifyMaya(deps, phone, notify) {
  var env = deps.env;
  var lead = deps.store.set('lead:' + phone, { kind: notify.kind, summary: notify.summary, at: new Date().toISOString() }, LEAD_TTL);
  return Promise.resolve(lead).then(function () {
    return Promise.resolve().then(function () { return deps.send(env.MAYA_PHONE, { kind: 'text', body: notify.summary }); })
      .catch(function () { return { ok: false }; });
  }).then(function (r) {
    if (r && !r.ok && env.SUMMARY_TEMPLATE_NAME) {
      return deps.sendTemplate(env.MAYA_PHONE, env.SUMMARY_TEMPLATE_NAME, summary.oneLine(notify.summary).slice(0, TEMPLATE_MAX));
    }
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* הודעות של אותו לקוח רצות אחת אחרי השנייה, כדי ששתי לחיצות מהירות לא ידרסו זו את זו */
function withLock(deps, phone, fn) {
  var key = 'lock:' + phone, tries = 0, wait = deps.lockRetryMs == null ? 150 : deps.lockRetryMs;
  function acquire() {
    return deps.store.claim(key, 15).then(function (ok) {
      if (ok || ++tries >= 40) { return ok; }
      return sleep(wait).then(acquire);
    });
  }
  return acquire().then(function (held) {
    var done = function () { return held ? deps.store.release(key) : Promise.resolve(); };
    return Promise.resolve().then(fn).then(function (v) { return done().then(function () { return v; }); },
      function (e) { return done().then(function () { throw e; }); });
  });
}

/* שיחה שהמנוע לא מצליח להמשיך (למשל אחרי עדכון של data.js): מעבירים למאיה במקום לשתוק */
function safeStep(state, input) {
  try { return engine.step(state, input); }
  catch (e) {
    console.error('bot: engine failed for ' + input.from + ': ' + (e && e.message));
    var st = Object.assign({}, state || {}, { phone: input.from, phase: 'done', handedOff: true });
    var sum;
    try { sum = summary.build(Object.assign({}, state, { phone: input.from }), 'stuck'); } catch (e2) { sum = C.errorSummary(input.from); }
    return { state: st, out: [{ kind: 'text', body: C.handoff }], notify: { kind: 'stuck', summary: sum } };
  }
}

function processMessage(deps, m) {
  return deps.store.claim('msg:' + m.id, DEDUPE_TTL).then(function (fresh) {
    if (!fresh) { return; }
    return withLock(deps, m.from, function () {
      return deps.store.get('chat:' + m.from).then(function (state) {
        var r = safeStep(state, { from: m.from, name: m.name, type: m.type, text: m.text, id: m.choiceId });
        var chain = Promise.resolve();
        r.out.forEach(function (msg) { chain = chain.then(function () { return deps.send(m.from, msg); }); });
        return chain.then(function () {
          /* שיחה שהסתיימה נשמרת 90 יום, כדי שהבוט ימשיך לשתוק גם אחרי שמאיה לקחה אותה */
          return deps.store.set('chat:' + m.from, r.state, r.state.phase === 'done' ? LEAD_TTL : CHAT_TTL);
        }).then(function () {
          if (r.notify) { return notifyMaya(deps, m.from, r.notify); }
        });
      });
    });
  });
}

function handle(req, deps) {
  var env = deps.env;
  if (req.method === 'GET') {
    var q = req.query || {};
    var ok = q['hub.mode'] === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && q['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN;
    return Promise.resolve(ok ? { status: 200, body: String(q['hub.challenge'] || '') } : { status: 403, body: 'forbidden' });
  }
  if (req.method !== 'POST') { return Promise.resolve({ status: 405, body: 'method not allowed' }); }
  if (!meta.verifySignature(req.rawBody, (req.headers || {})['x-hub-signature-256'], env.WHATSAPP_APP_SECRET)) {
    return Promise.resolve({ status: 401, body: 'bad signature' });
  }
  var body;
  try { body = JSON.parse(req.rawBody); } catch (e) { return Promise.resolve({ status: 400, body: 'bad json' }); }

  /* הודעה אחרי הודעה, כדי שהסדר בתוך שיחה יישמר. תקלה בהודעה אחת לא עוצרת את האחרות, ומטא מקבלת תמיד 200. */
  return meta.parseIncoming(body).reduce(function (p, m) {
    return p.then(function () {
      return Promise.resolve().then(function () { return processMessage(deps, m); }).catch(function (e) {
        console.error('bot: message ' + m.id + ' failed: ' + (e && e.message));
      });
    });
  }, Promise.resolve()).then(function () { return { status: 200, body: 'ok' }; });
}

module.exports = { handle: handle };
