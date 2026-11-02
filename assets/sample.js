/* סרטוני עבודות: מתנגנים בלופ בלי קול כשהם על המסך; כפתורים לעצירה ולהפעלת קול */
(function () {
  var IC_PAUSE = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>';
  var IC_PLAY = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 5 3.5z"/></svg>';
  var IC_ON = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l4-3.5v11L6 12H3z"/><path d="M13.5 7a4 4 0 0 1 0 6M15.8 4.8a7 7 0 0 1 0 10.4"/></svg>';
  var IC_OFF = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l4-3.5v11L6 12H3z"/><path d="M13.5 8l4 4M17.5 8l-4 4"/></svg>';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = [];

  Array.prototype.forEach.call(document.querySelectorAll('[data-sample]'), function (box) {
    var v = box.querySelector('video');
    var play = box.querySelector('[data-act="play"]');
    var sound = box.querySelector('[data-act="sound"]');
    var item = { v: v, stopped: false };
    all.push(item);

    function sync() {
      play.innerHTML = (v.paused ? IC_PLAY + 'לנגן' : IC_PAUSE + 'לעצור');
      play.setAttribute('aria-pressed', String(!v.paused));
      sound.innerHTML = (v.muted ? IC_OFF + 'עם קול' : IC_ON + 'בלי קול');
      sound.setAttribute('aria-pressed', String(!v.muted));
    }
    function tryPlay() { var p = v.play(); if (p && p.catch) { p.catch(sync); } }

    /* מתנגן לבד רק כשהוא על המסך, ורק אם לא ביקשו להפחית תנועה. מי שעצרה, נשאר עצור */
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (item.stopped) { return; }
        if (es[0].isIntersecting) { tryPlay(); } else { v.pause(); }
      }, { threshold: 0.5 }).observe(v);
    }

    play.addEventListener('click', function () {
      if (v.paused) { item.stopped = false; tryPlay(); } else { item.stopped = true; v.pause(); }
    });
    sound.addEventListener('click', function () {
      if (v.muted) {
        /* קול רק בסרטון אחד בכל פעם */
        all.forEach(function (o) { if (o !== item) { o.v.muted = true; } });
        v.muted = false; v.currentTime = 0; item.stopped = false; tryPlay();
      } else { v.muted = true; }
      sync();
    });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    v.addEventListener('volumechange', sync);
    sync();
  });
})();
