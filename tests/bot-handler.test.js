'use strict';
var assert = require('assert');
var crypto = require('crypto');
var Readable = require('stream').Readable;
var handler = require('../bot/handler.js');
var store = require('../bot/store.js');

var ENV = { WHATSAPP_VERIFY_TOKEN: 'verify-me', WHATSAPP_APP_SECRET: 'secret', MAYA_PHONE: '972515590208', SUMMARY_TEMPLATE_NAME: 'chopa_summary' };
var PHONE = '972501234567';

function memStore() {
  var m = {};
  return {
    data: m,
    get: function (k) { return Promise.resolve(m[k] ? JSON.parse(m[k]) : null); },
    set: function (k, v) { m[k] = JSON.stringify(v); return Promise.resolve(); },
    claim: function (k) { if (m[k]) { return Promise.resolve(false); } m[k] = '1'; return Promise.resolve(true); }
  };
}
function makeDeps(over) {
  var sent = [], templates = [];
  var deps = {
    env: ENV, store: memStore(), sent: sent, templates: templates,
    send: function (to, msg) { sent.push({ to: to, msg: msg }); return Promise.resolve({ ok: true }); },
    sendTemplate: function (to, name, text) { templates.push({ to: to, name: name, text: text }); return Promise.resolve({ ok: true }); }
  };
  Object.keys(over || {}).forEach(function (k) { deps[k] = over[k]; });
  return deps;
}
function post(messages, extra) {
  var value = { messaging_product: 'whatsapp', contacts: [{ wa_id: PHONE, profile: { name: 'דנה' } }] };
  if (messages) { value.messages = messages; }
  Object.keys(extra || {}).forEach(function (k) { value[k] = extra[k]; });
  var raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: value }] }] });
  var sig = 'sha256=' + crypto.createHmac('sha256', ENV.WHATSAPP_APP_SECRET).update(raw).digest('hex');
  return { method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig }, rawBody: raw };
}
function textMsg(id, body) { return { id: id, from: PHONE, type: 'text', text: { body: body } }; }
function choiceMsg(id, cid) { return { id: id, from: PHONE, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: cid, title: cid } } }; }

var tests = [];
function t(name, fn) { tests.push({ name: name, fn: fn }); }

t('GET verification returns the challenge, wrong token returns 403', function () {
  return Promise.all([
    handler.handle({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '1234' }, headers: {}, rawBody: '' }, makeDeps()),
    handler.handle({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '1234' }, headers: {}, rawBody: '' }, makeDeps())
  ]).then(function (r) {
    assert.deepStrictEqual(r[0], { status: 200, body: '1234' });
    assert.strictEqual(r[1].status, 403);
  });
});

t('POST with a bad signature returns 401 and sends nothing', function () {
  var deps = makeDeps(), req = post([textMsg('m1', 'היי')]);
  req.headers['x-hub-signature-256'] = 'sha256=' + new Array(65).join('0');
  return handler.handle(req, deps).then(function (r) {
    assert.strictEqual(r.status, 401);
    assert.strictEqual(deps.sent.length, 0);
  });
});

t('first message gets the event list and saves state', function () {
  var deps = makeDeps();
  return handler.handle(post([textMsg('m1', 'היי')]), deps).then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(deps.sent.length, 1);
    assert.strictEqual(deps.sent[0].to, PHONE);
    assert.strictEqual(deps.sent[0].msg.kind, 'list');
    return deps.store.get('chat:' + PHONE);
  }).then(function (st) { assert.strictEqual(st.phase, 'event'); });
});

t('the same message id twice sends one reply set', function () {
  var deps = makeDeps();
  return handler.handle(post([textMsg('dup', 'היי')]), deps)
    .then(function () { return handler.handle(post([textMsg('dup', 'היי')]), deps); })
    .then(function () { assert.strictEqual(deps.sent.length, 1); });
});

function runFlow(deps) {
  var steps = [textMsg('a1', 'היי'), choiceMsg('a2', 'ev:Wedding'), choiceMsg('a3', 'mode:set'), textMsg('a4', '10/6/2027'),
    choiceMsg('a5', 'dq:mood:1'), choiceMsg('a6', 'dq:pal:2'), choiceMsg('a7', 'dq:font:0'), choiceMsg('a8', 'dq:el:done'), choiceMsg('a9', 'skip'),
    choiceMsg('b1', 'wh:both'), choiceMsg('b2', 'hv:done'), choiceMsg('b3', 'skip'), textMsg('b4', 'דנה')];
  return steps.reduce(function (p, m) { return p.then(function () { return handler.handle(post([m]), deps); }); }, Promise.resolve());
}

t('a completed flow sends the summary to Maya once', function () {
  var deps = makeDeps();
  return runFlow(deps).then(function () {
    var toMaya = deps.sent.filter(function (s) { return s.to === ENV.MAYA_PHONE; });
    assert.strictEqual(toMaya.length, 1);
    assert.strictEqual(toMaya[0].msg.kind, 'text');
    assert.strictEqual(toMaya[0].msg.body.split('\n')[0], 'פנייה חדשה מהבוט');
    assert.strictEqual(deps.templates.length, 0);
    return deps.store.get('lead:' + PHONE);
  }).then(function (lead) { assert.strictEqual(lead.kind, 'complete'); });
});

t('the summary falls back to the template when Meta reports 131047', function () {
  var deps = makeDeps();
  deps.send = function (to, msg) {
    deps.sent.push({ to: to, msg: msg });
    return Promise.resolve(to === ENV.MAYA_PHONE ? { ok: false, code: 131047 } : { ok: true });
  };
  return runFlow(deps).then(function () {
    assert.strictEqual(deps.templates.length, 1);
    assert.strictEqual(deps.templates[0].to, ENV.MAYA_PHONE);
    assert.strictEqual(deps.templates[0].name, 'chopa_summary');
    assert.ok(!/[\n\t]/.test(deps.templates[0].text));
    assert.ok(deps.templates[0].text.length <= 1024);
  });
});

t('a message after done sends nothing', function () {
  var deps = makeDeps();
  return runFlow(deps).then(function () {
    var before = deps.sent.length;
    return handler.handle(post([textMsg('late', 'שלום?')]), deps).then(function () { assert.strictEqual(deps.sent.length, before); });
  });
});

t('a status-only callback returns 200 and sends nothing', function () {
  var deps = makeDeps();
  return handler.handle(post(null, { statuses: [{ id: 's', status: 'delivered' }] }), deps).then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(deps.sent.length, 0);
  });
});

t('a throwing send for one message does not stop the others and still returns 200', function () {
  var deps = makeDeps(), n = 0;
  deps.send = function (to, msg) { n += 1; if (n === 1) { throw new Error('boom'); } deps.sent.push({ to: to, msg: msg }); return Promise.resolve({ ok: true }); };
  var req = post([textMsg('x1', 'היי'), { id: 'x2', from: '972509998888', type: 'text', text: { body: 'שלום' } }]);
  return handler.handle(req, deps).then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(deps.sent.length, 1);
    assert.strictEqual(deps.sent[0].to, '972509998888');
  });
});

t('store sends the Upstash command array', function () {
  var calls = [];
  var env = { UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'tk' };
  var fetchFn = function (url, opts) {
    calls.push({ url: url, opts: opts });
    var cmd = JSON.parse(opts.body);
    var result = cmd[0] === 'GET' ? JSON.stringify({ a: 1 }) : (cmd[0] === 'SET' && cmd.indexOf('NX') >= 0 ? 'OK' : 'OK');
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ result: result }); } });
  };
  var s = store.createStore(env, fetchFn);
  return s.set('k', { a: 1 }, 60).then(function () { return s.get('k'); }).then(function (v) {
    assert.deepStrictEqual(v, { a: 1 });
    return s.claim('c', 30);
  }).then(function (ok) {
    assert.strictEqual(ok, true);
    assert.strictEqual(calls[0].url, 'https://redis.example');
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer tk');
    assert.deepStrictEqual(JSON.parse(calls[0].opts.body), ['SET', 'k', '{"a":1}', 'EX', 60]);
    assert.deepStrictEqual(JSON.parse(calls[1].opts.body), ['GET', 'k']);
    assert.deepStrictEqual(JSON.parse(calls[2].opts.body), ['SET', 'c', '1', 'NX', 'EX', 30]);
  });
});

t('the Vercel adapter answers webhook verification and disables body parsing', function () {
  process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
  var adapter = require('../api/whatsapp.js');
  assert.strictEqual(typeof adapter, 'function');
  assert.strictEqual(adapter.config.api.bodyParser, false);
  var req = Readable.from([]);
  req.method = 'GET';
  req.headers = {};
  req.query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': 'abc' };
  var res = { statusCode: 0, body: null, end: function (b) { this.body = b; } };
  return adapter(req, res).then(function () {
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'abc');
  });
});

tests.reduce(function (p, x) {
  return p.then(function () { return x.fn(); }).then(function () { }, function (e) { console.error('FAIL: ' + x.name); throw e; });
}, Promise.resolve()).then(function () { console.log('bot-handler: ok'); }).catch(function (e) { console.error(e); process.exit(1); });
