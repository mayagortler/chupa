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

  /* בלונים מעל ההיגדים: לחיצה מפוצצת בלון, והוא מתנפח שוב אחרי רגע */
  Array.prototype.forEach.call(document.querySelectorAll('[data-balloons] .bl-item'), function (it) {
    var btn = it.querySelector('.bl-b');
    btn.addEventListener('click', function () {
      if (it.classList.contains('popped')) { return; }
      it.classList.add('popped');
      setTimeout(function () { it.classList.remove('popped'); }, 1800);
    });
  });

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
