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
