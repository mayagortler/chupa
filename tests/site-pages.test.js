'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

var pages = fs.readdirSync(root).filter(function (f) {
  return /\.html$/.test(f) && f.charAt(0) !== '_';
});
assert.ok(pages.length >= 15, 'expected at least 15 pages, found ' + pages.length);

var versions = {}; /* asset file -> {n: true} */
pages.forEach(function (page) {
  var html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(!/fridge\.css/.test(html), page + ': still loads fridge.css');
  assert.ok(/family=Frank\+Ruhl\+Libre:wght@300;400;500/.test(html), page + ': missing Frank Ruhl Libre');
  assert.ok(/family=Heebo:wght@300;400;500/.test(html), page + ': missing Heebo');
  assert.ok(!/family=Assistant/.test(html), page + ': still loads Assistant');
  assert.match(html, /<html lang="he" dir="rtl">/, page + ': html lang/dir');
  var re = /assets\/([A-Za-z0-9_.-]+)\?v=(\d+)/g, m;
  while ((m = re.exec(html))) {
    (versions[m[1]] = versions[m[1]] || {})[m[2]] = true;
  }
});

/* shared header/footer: no fridge wrapper or letter-tile logo on any page */
pages.forEach(function (page) {
  var html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(!/class="fridge/.test(html), page + ': still has the fridge wrapper');
  assert.ok(!/class="vr"/.test(html), page + ': header still has the .vr divider');
  assert.ok(!/lt-icon/.test(html), page + ': header still has the letter-tile logo');
  assert.match(html, /<a class="logo" href="index\.html"[^>]*>צ׳ופה<\/a>/, page + ': logo is not the word צ׳ופה');
  assert.match(html, /class="btn btn-ghost bar-cta"/, page + ': header CTA is not a ghost button');
});

/* home: the rope of polaroids is the only events listing */
(function () {
  var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  var cards = html.match(/<a class="rope-card"[^>]*>/g) || [];
  assert.strictEqual(cards.length, 10, 'index.html: expected 10 rope cards, found ' + cards.length);
  cards.forEach(function (tag) {
    var href = (tag.match(/href="([^"]+)"/) || [])[1];
    assert.ok(/^event-[a-z-]+\.html$/.test(href || ''), 'rope card href: ' + href);
    assert.ok(fs.existsSync(path.join(root, href)), 'rope card links to a missing page: ' + href);
    assert.ok(!/tabindex="-1"/.test(tag), 'rope card is not keyboard reachable: ' + href);
  });
  var lights = (html.match(/class="rope-light"/g) || []).length;
  assert.ok(lights >= 8, 'index.html: expected at least 8 rope lights, found ' + lights);
  assert.ok(/<symbol id="sprig-poppy"/.test(html) && /<symbol id="sprig-corn"/.test(html), 'index.html: sprig symbols missing');
  assert.ok(!/assets\/magnets\//.test(html), 'index.html: still references assets/magnets/');
  assert.ok(!/logo-magnet\.webp/.test(html), 'index.html: still references logo-magnet.webp');
  assert.ok(!/id="events-strip"/.test(html), 'index.html: #events-strip should be replaced by the rope');
  assert.ok(!/class="freezer"|class="door-main"/.test(html), 'index.html: freezer/door wrappers still present');
})();

/* one version per asset across all pages */
Object.keys(versions).forEach(function (file) {
  var vs = Object.keys(versions[file]);
  assert.strictEqual(vs.length, 1, file + ': multiple versions site-wide: ' + vs.join(', '));
});

/* no hex colors in styles.css outside the first :root block */
var ENABLE_HEX_CHECK = true;
if (ENABLE_HEX_CHECK) {
  var css = fs.readFileSync(path.join(root, 'assets', 'styles.css'), 'utf8');
  css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\(\s*["']?data:[^)]*\)/g, 'url()');
  var start = css.indexOf(':root');
  var open = css.indexOf('{', start);
  var depth = 0, end = open;
  for (var i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  var rest = css.slice(0, start) + css.slice(end + 1);
  /* only look inside declaration blocks (innermost {...}), so id selectors like #add are not flagged */
  var hex = (rest.match(/\{[^{}]*\}/g) || []).join('').match(/#[0-9a-fA-F]{3,8}\b/g);
  assert.ok(!hex, 'styles.css has hex outside :root: ' + (hex || []).slice(0, 5).join(', '));
}

console.log('site-pages: ok (' + pages.length + ' pages)');
