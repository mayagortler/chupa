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

})();
