'use strict';
var assert = require('assert');
var crypto = require('crypto');
var meta = require('../bot/meta.js');

/* toPayload */
var p = meta.toPayload('972501234567', { kind: 'text', body: 'שלום' });
assert.deepStrictEqual(p, { messaging_product: 'whatsapp', recipient_type: 'individual', to: '972501234567', type: 'text', text: { body: 'שלום' } });

p = meta.toPayload('972501234567', { kind: 'buttons', body: 'בחרו', buttons: [{ id: 'a', title: 'א' }, { id: 'b', title: 'ב' }] });
assert.strictEqual(p.type, 'interactive');
assert.strictEqual(p.interactive.type, 'button');
assert.strictEqual(p.interactive.body.text, 'בחרו');
assert.deepStrictEqual(p.interactive.action.buttons, [{ type: 'reply', reply: { id: 'a', title: 'א' } }, { type: 'reply', reply: { id: 'b', title: 'ב' } }]);

p = meta.toPayload('972501234567', { kind: 'list', body: 'בחרו', button: 'לבחירה', rows: [{ id: 'r1', title: 'שורה', description: 'תיאור' }, { id: 'r2', title: 'שורה 2' }] });
assert.strictEqual(p.interactive.type, 'list');
assert.strictEqual(p.interactive.action.button, 'לבחירה');
assert.deepStrictEqual(p.interactive.action.sections, [{ rows: [{ id: 'r1', title: 'שורה', description: 'תיאור' }, { id: 'r2', title: 'שורה 2' }] }]);

/* limits are enforced */
function rows(n, len) { var a = []; for (var i = 0; i < n; i++) { a.push({ id: 'r' + i, title: new Array(len + 1).join('א') }); } return a; }
assert.throws(function () { meta.toPayload('1', { kind: 'buttons', body: 'x', buttons: [1, 2, 3, 4].map(function (i) { return { id: 'b' + i, title: 'כפתור' }; }) }); }, /buttons/);
assert.throws(function () { meta.toPayload('1', { kind: 'list', body: 'x', button: 'ב', rows: rows(11, 5) }); }, /rows/);
assert.throws(function () { meta.toPayload('1', { kind: 'list', body: 'x', button: 'ב', rows: rows(2, 25) }); }, /title/);
assert.throws(function () { meta.toPayload('1', { kind: 'buttons', body: 'x', buttons: [{ id: 'b', title: new Array(22).join('א') }] }); }, /title/);
assert.throws(function () { meta.toPayload('1', { kind: 'text', body: new Array(4098).join('א') }); }, /body/);

/* signature */
var raw = '{"entry":[]}', secret = 'app-secret';
var good = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
assert.strictEqual(meta.verifySignature(raw, good, secret), true);
assert.strictEqual(meta.verifySignature(Buffer.from(raw), good, secret), true);
assert.strictEqual(meta.verifySignature(raw, good, 'other-secret'), false);
assert.strictEqual(meta.verifySignature(raw, undefined, secret), false);
assert.strictEqual(meta.verifySignature(raw, 'sha256=abc', secret), false);
assert.strictEqual(meta.verifySignature(raw + ' ', good, secret), false);

/* parseIncoming */
function hook(messages, extra) {
  var value = { messaging_product: 'whatsapp', contacts: [{ wa_id: '972501234567', profile: { name: 'דנה' } }], messages: messages };
  Object.keys(extra || {}).forEach(function (k) { value[k] = extra[k]; });
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: value }] }] };
}
var inc = meta.parseIncoming(hook([
  { id: 'm1', from: '972501234567', type: 'text', text: { body: 'היי' } },
  { id: 'm2', from: '972501234567', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'mode:set', title: 'סט' } } },
  { id: 'm3', from: '972501234567', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'ev:Wedding', title: 'חתונה' } } },
  { id: 'm4', from: '972501234567', type: 'image', image: { id: 'x' } },
  { id: 'm5', from: '972501234567', type: 'sticker', sticker: { id: 'y' } }
]));
assert.deepStrictEqual(inc[0], { id: 'm1', from: '972501234567', name: 'דנה', type: 'text', text: 'היי' });
assert.deepStrictEqual(inc[1], { id: 'm2', from: '972501234567', name: 'דנה', type: 'choice', text: 'סט', choiceId: 'mode:set' });
assert.deepStrictEqual(inc[2], { id: 'm3', from: '972501234567', name: 'דנה', type: 'choice', text: 'חתונה', choiceId: 'ev:Wedding' });
assert.strictEqual(inc[3].type, 'other');
assert.strictEqual(inc[4].type, 'other');
/* reactions and system notices are not customer input */
var ign = meta.parseIncoming(hook([
  { id: 'r1', from: '972501234567', type: 'reaction', reaction: { message_id: 'm1', emoji: '👍' } },
  { id: 'r2', from: '972501234567', type: 'system', system: { body: 'changed number' } },
  { id: 'r3', from: '972501234567', type: 'text', text: { body: 'כן' } }
]));
assert.deepStrictEqual(ign.map(function (x) { return x.id; }), ['r3']);
assert.deepStrictEqual(meta.parseIncoming(hook(undefined, { statuses: [{ id: 's', status: 'delivered' }] })), []);
assert.deepStrictEqual(meta.parseIncoming({}), []);
assert.deepStrictEqual(meta.parseIncoming(null), []);

/* send and sendTemplate, with a fake fetch */
var env = { WHATSAPP_PHONE_ID: '555', WHATSAPP_TOKEN: 'tok' };
var calls = [];
function fakeFetch(res) { return function (url, opts) { calls.push({ url: url, opts: opts }); return Promise.resolve(res); }; }
var okRes = { ok: true, json: function () { return Promise.resolve({ messages: [{ id: 'wamid' }] }); } };
var errRes = { ok: false, json: function () { return Promise.resolve({ error: { code: 131047, message: 're-engagement' } }); } };

Promise.all([
  meta.send(env, fakeFetch(okRes), '972501234567', { kind: 'text', body: 'שלום' }),
  meta.send(env, fakeFetch(errRes), '972509999999', { kind: 'text', body: 'שלום' }),
  meta.sendTemplate(env, fakeFetch(okRes), '972509999999', 'chopa_summary', 'שורה א | שורה ב')
]).then(function (res) {
  assert.deepStrictEqual(res[0], { ok: true });
  assert.deepStrictEqual(res[1], { ok: false, code: 131047 });
  assert.deepStrictEqual(res[2], { ok: true });
  assert.strictEqual(calls[0].url, 'https://graph.facebook.com/v21.0/555/messages');
  assert.strictEqual(calls[0].opts.method, 'POST');
  assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer tok');
  assert.strictEqual(JSON.parse(calls[0].opts.body).text.body, 'שלום');
  var t = JSON.parse(calls[2].opts.body);
  assert.strictEqual(t.type, 'template');
  assert.strictEqual(t.template.name, 'chopa_summary');
  assert.strictEqual(t.template.language.code, 'he');
  assert.deepStrictEqual(t.template.components, [{ type: 'body', parameters: [{ type: 'text', text: 'שורה א | שורה ב' }] }]);
  console.log('bot-meta: ok');
}).catch(function (e) { console.error(e); process.exit(1); });
