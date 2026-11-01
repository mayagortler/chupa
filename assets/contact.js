/* צ׳ופה – טופס "בואו נדבר": בונה הודעה מוכנה ופותח אותה בוואטסאפ. שום דבר לא נשמר באתר */
(function () {
  'use strict';
  var form = document.getElementById('cf');
  if (!form) { return; }
  var CFG = window.SITE_CONFIG || {};
  var done = document.getElementById('cf-done');
  var waLink = document.getElementById('cf-wa');
  var name = document.getElementById('cf-name');
  var ev = document.getElementById('cf-event');
  var date = document.getElementById('cf-date');
  var msg = document.getElementById('cf-msg');
  var svcs = Array.prototype.slice.call(form.querySelectorAll('input[name="svc"]'));
  var svcSet = form.querySelector('fieldset');

  function waUrl(text) {
    var phone = String(CFG.phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
  }

  /* "עוד לא יודעים" עומד לבד */
  svcs.forEach(function (c) {
    c.addEventListener('change', function () {
      if (!c.checked) { return; }
      svcs.forEach(function (o) {
        if (o !== c && (c.hasAttribute('data-solo') || o.hasAttribute('data-solo'))) { o.checked = false; }
      });
      showErr(svcSet, 'cf-svc-err', false);
    });
  });

  function showErr(el, id, on) {
    var e = document.getElementById(id);
    e.hidden = !on;
    if (el.tagName === 'FIELDSET') { el.classList.toggle('cf-bad', on); }
    else { el.setAttribute('aria-invalid', on ? 'true' : 'false'); }
  }
  name.addEventListener('input', function () { if (name.value.trim()) { showErr(name, 'cf-name-err', false); } });
  ev.addEventListener('change', function () { if (ev.value) { showErr(ev, 'cf-event-err', false); } });

  function fmtDate(v) {
    var p = v.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : v;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var picked = svcs.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    var bad = [];
    showErr(name, 'cf-name-err', !name.value.trim()); if (!name.value.trim()) { bad.push(name); }
    showErr(ev, 'cf-event-err', !ev.value); if (!ev.value) { bad.push(ev); }
    showErr(svcSet, 'cf-svc-err', !picked.length); if (!picked.length) { bad.push(svcs[0]); }
    if (bad.length) { bad[0].focus(); return; }

    var lines = ['היי, אני ' + name.value.trim() + '.', 'אירוע: ' + ev.value];
    lines.push(picked[0] === 'עוד לא יודעים' ? 'מה לעצב: עוד לא יודעים, אשמח להמלצה' : 'מה לעצב: ' + picked.join(', '));
    if (date.value) { lines.push('תאריך: ' + fmtDate(date.value)); }
    if (msg.value.trim()) { lines.push(msg.value.trim()); }
    var url = waUrl(lines.join('\n'));
    waLink.href = url;
    window.open(url, '_blank', 'noopener');
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  document.getElementById('cf-back').addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    name.focus();
  });
})();
