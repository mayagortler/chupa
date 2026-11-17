/* מצגות בעבודות: מעבר בין שקפים בחצים, במקלדת ובהחלקה */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-deck]'), function (box) {
    var slides = box.querySelectorAll('img');
    var count = box.querySelector('.deck-count');
    var i = 0;
    function show(n) {
      i = (n + slides.length) % slides.length;
      Array.prototype.forEach.call(slides, function (s, k) { s.hidden = k !== i; });
      count.textContent = (i + 1) + ' / ' + slides.length;
      /* טוען מראש את השקף הבא */
      var nx = slides[(i + 1) % slides.length]; nx.loading = 'eager';
    }
    function next() { show(i + 1); }
    function prev() { show(i - 1); }
    box.querySelector('.deck-next').addEventListener('click', next);
    box.querySelector('.deck-prev').addEventListener('click', prev);
    /* בעברית השקף הבא נמצא משמאל */
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); prev(); }
    });
    var x0 = null;
    box.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { x0 = e.clientX; } });
    box.addEventListener('pointerup', function (e) {
      if (x0 === null) { return; }
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { if (dx < 0) { next(); } else { prev(); } }
    });
  });
})();
