/* צ׳ופה – עיצוב גרפי ומדיה לאירועים: וואטסאפ והבילדר של דפי האירועים */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG || {};
  var D = window.SITE_DATA || {};

  function waUrl(text) {
    var phone = String(CFG.phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  window.Chopa = { waUrl: waUrl, esc: esc, fmt: fmt };

  /* קישורי וואטסאפ סטטיים והקישורים בפוטר */
  Array.prototype.forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
    a.setAttribute('href', waUrl(a.getAttribute('data-wa')));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-cfg]'), function (a) {
    var v = CFG[a.getAttribute('data-cfg')];
    if (v) { a.setAttribute('href', v); a.hidden = false; }
  });

  /* איך זה עובד: לחיצה על כרטיס פותחת את הפירוט (בלי JavaScript הפירוט פשוט פתוח) */
  Array.prototype.forEach.call(document.querySelectorAll('.pc-tog'), function (b) {
    var dl = document.getElementById(b.getAttribute('aria-controls'));
    if (!dl) { return; }
    dl.hidden = true;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      dl.hidden = !open;
      var lbl = b.querySelector('.pc-more-t');
      if (lbl) { lbl.textContent = open ? 'לסגור' : 'לפרטים'; }
    });
  });

  /* חשיפה בגלילה: רק מה שמתחת לקפל מוסתר, כדי שמה שכבר על המסך לא יהבהב.
     פריטים שנכנסים יחד נכנסים בהשהיה קטנה זה אחרי זה, ו-.rv יורד בסוף כדי להחזיר את המעברים של ה-hover */
  (function () {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var rise = '.section-head, .about, .faq';
    var stick = '.svcs > li, .rev > .chat';
    var io = new IntersectionObserver(function (es) {
      var n = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        var el = e.target;
        io.unobserve(el);
        el.style.transitionDelay = Math.min(n++, 5) * 70 + 'ms';
        el.classList.remove('rv-hide');
        el.addEventListener('transitionend', function done(ev) {
          if (ev.target !== el || ev.propertyName !== 'opacity') { return; }
          el.removeEventListener('transitionend', done);
          el.classList.remove('rv', 'rv-stick');
          el.style.transitionDelay = '';
        });
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    function prep(sel, isStick) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        if (el.getBoundingClientRect().top <= window.innerHeight) { return; }
        el.classList.add('rv', 'rv-hide');
        if (isStick) { el.classList.add('rv-stick'); }
        io.observe(el);
      });
    }
    prep(rise, false);
    prep(stick, true);
  })();

  /* איך זה עובד: הכרטיסים נכנסים בגלילה */
  Array.prototype.forEach.call(document.querySelectorAll('[data-path]'), function (ol) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('pc-hide'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(ol.querySelectorAll('.pc'), function (c) {
      if (c.getBoundingClientRect().top > window.innerHeight) { c.classList.add('pc-hide'); io.observe(c); }
    });
  });

  /* כפתור צף: בדף הבית "למעלה" אחרי שגוללים, בשאר העמודים "לדף הבית" אחרי שעוברים את הכותרת */
  (function () {
    var home = /(^|\/)(index\.html)?$/.test(location.pathname);
    var up = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M5 9l5-5 5 5"/></svg>';
    var house = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L10 3.5l7 6"/><path d="M5 8.2V16.5h10V8.2"/><path d="M8.3 16.5v-4.3h3.4v4.3"/></svg>';
    var b = document.createElement('a');
    b.className = 'float-nav';
    b.href = home ? '#top' : 'index.html';
    b.setAttribute('aria-label', home ? 'חזרה לראש העמוד' : 'חזרה לדף הבית');
    b.innerHTML = (home ? up : house) + '<span>' + (home ? 'למעלה' : 'לדף הבית') + '</span>';
    if (home) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        var logo = document.querySelector('.logo'); if (logo) { logo.focus({ preventScroll: true }); }
      });
    }
    document.body.appendChild(b);
    var limit = function () { return home ? window.innerHeight * 0.9 : 260; };
    var tick = false;
    function update() {
      tick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;          /* עמוד קצר: מופיע כשמגיעים לתחתית */
      b.classList.toggle('is-on', window.scrollY > Math.min(limit(), Math.max(40, max - 40)));
      var bar = document.getElementById('bar');            /* סרגל ההצעה התחתון בעמודי האירועים */
      b.style.bottom = bar && bar.offsetHeight ? (bar.offsetHeight + 12) + 'px' : '';
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();
})();
