'use strict';
/* המתאם ל-Meta Cloud API: בניית הודעות, אימות חתימה, קריאת הודעות נכנסות ושליחה. */
var crypto = require('crypto');

var GRAPH = 'https://graph.facebook.com/v21.0/';

function fail(what) { throw new Error('whatsapp limit: ' + what); }

function toPayload(to, msg) {
  var base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: to };
  if (msg.kind === 'text') {
    if (msg.body.length > 4096) { fail('text body over 4096'); }
    return Object.assign(base, { type: 'text', text: { body: msg.body } });
  }
  if (msg.body.length > 1024) { fail('body over 1024'); }
  if (msg.kind === 'buttons') {
    if (msg.buttons.length > 3) { fail('buttons over 3'); }
    msg.buttons.forEach(function (b) { if (b.title.length > 20) { fail('button title over 20: ' + b.title); } });
    return Object.assign(base, { type: 'interactive', interactive: {
      type: 'button', body: { text: msg.body },
      action: { buttons: msg.buttons.map(function (b) { return { type: 'reply', reply: { id: b.id, title: b.title } }; }) }
    } });
  }
  if (msg.kind === 'list') {
    if (msg.rows.length > 10) { fail('rows over 10'); }
    if (msg.button.length > 20) { fail('list button over 20'); }
    msg.rows.forEach(function (r) {
      if (r.title.length > 24) { fail('row title over 24: ' + r.title); }
      if (r.description && r.description.length > 72) { fail('row description over 72'); }
    });
    return Object.assign(base, { type: 'interactive', interactive: {
      type: 'list', body: { text: msg.body },
      action: { button: msg.button, sections: [{ rows: msg.rows.map(function (r) {
        var row = { id: r.id, title: r.title };
        if (r.description) { row.description = r.description; }
        return row;
      }) }] }
    } });
  }
  throw new Error('unknown message kind: ' + msg.kind);
}

function verifySignature(rawBody, header, secret) {
  if (!header || !secret || String(header).indexOf('sha256=') !== 0) { return false; }
  var expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  var given = Buffer.from(String(header).slice(7), 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function parseIncoming(body) {
  var out = [];
  var entries = (body && body.entry) || [];
  entries.forEach(function (e) {
    (e.changes || []).forEach(function (c) {
      var v = c && c.value;
      if (!v || !v.messages) { return; }
      var names = {};
      (v.contacts || []).forEach(function (k) { names[k.wa_id] = (k.profile && k.profile.name) || ''; });
      v.messages.forEach(function (m) {
        var item = { id: m.id, from: m.from, name: names[m.from] || '', type: 'other', text: '' };
        if (m.type === 'text' && m.text) { item.type = 'text'; item.text = m.text.body || ''; }
        else if (m.type === 'interactive' && m.interactive) {
          var r = m.interactive.button_reply || m.interactive.list_reply;
          if (r) { item.type = 'choice'; item.text = r.title || ''; item.choiceId = r.id; }
        }
        out.push(item);
      });
    });
  });
  return out;
}

function post(env, fetchFn, payload) {
  return fetchFn(GRAPH + env.WHATSAPP_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.WHATSAPP_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (res.ok) { return { ok: true }; }
    return res.json().then(function (j) { return { ok: false, code: j && j.error && j.error.code }; }, function () { return { ok: false }; });
  });
}

function send(env, fetchFn, to, msg) { return post(env, fetchFn, toPayload(to, msg)); }

function sendTemplate(env, fetchFn, to, name, oneLineText) {
  return post(env, fetchFn, {
    messaging_product: 'whatsapp', to: to, type: 'template',
    template: { name: name, language: { code: 'he' }, components: [{ type: 'body', parameters: [{ type: 'text', text: oneLineText }] }] }
  });
}

module.exports = { toPayload: toPayload, verifySignature: verifySignature, parseIncoming: parseIncoming, send: send, sendTemplate: sendTemplate };
