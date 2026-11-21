'use strict';
/* אחסון קטן על Upstash Redis דרך ה-REST API שלו. בלי תלויות: פקודה אחת בכל בקשה. */

function createStore(env, fetchFn) {
  function cmd(args) {
    return fetchFn(env.UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (res) {
      return res.json().then(function (j) {
        if (!res.ok || (j && j.error)) { throw new Error('upstash: ' + ((j && j.error) || res.status)); }
        return j.result;
      });
    });
  }
  return {
    get: function (key) {
      return cmd(['GET', key]).then(function (v) { return v == null ? null : JSON.parse(v); });
    },
    set: function (key, value, ttlSeconds) {
      return cmd(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]).then(function () { });
    },
    release: function (key) { return cmd(['DEL', key]).then(function () { }); },
    /* true רק בפעם הראשונה שהמפתח נתפס. כך מזהים הודעה שמטא שלחה פעמיים. */
    claim: function (key, ttlSeconds) {
      return cmd(['SET', key, '1', 'NX', 'EX', ttlSeconds]).then(function (r) { return r === 'OK'; });
    }
  };
}

module.exports = { createStore: createStore };
