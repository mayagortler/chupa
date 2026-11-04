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
  assert.ok(/family=Bona\+Nova:wght@400;700/.test(html), page + ': missing Bona Nova');
  assert.ok(/family=Assistant:wght@300;400;500;600/.test(html), page + ': missing Assistant');
  assert.ok(!/Frank\+Ruhl/.test(html), page + ': still loads Frank Ruhl Libre');
  assert.ok(/<link rel="preload" href="assets\/fonts\/OHRinatZigdon-Regular\.woff2"/.test(html), page + ': handwriting font not preloaded');
  assert.ok(/class="credit">כתב היד באתר: רינת זיגדון ז״ל/.test(html), page + ': handwriting font credit missing from the footer');
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
  assert.match(html, /<a class="logo" href="index\.html" aria-label="צ׳ופה, לדף הבית"><img src="assets\/logo\.svg\?v=\d+" alt=""/, page + ': header logo is not the forget-me-not logo image');
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

/* home: section surfaces in a fixed order, at most two dark, no unseparated repeats */
(function () {
  var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  var main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  var secs = (main.match(/<section\b[^>]*>/g) || []).map(function (tag) {
    var cls = ((tag.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);
    var surf = cls.filter(function (c) { return /^surface-/.test(c) && c !== 'surface-dark'; });
    assert.strictEqual(surf.length, 1, 'index.html: section needs exactly one surface: ' + tag);
    return { surface: surf[0].slice(8), dark: cls.indexOf('surface-dark') !== -1, rule: cls.indexOf('rule-top') !== -1 };
  });
  assert.deepStrictEqual(secs.map(function (s) { return s.surface; }),
    ['paper', 'paper', 'cream', 'paper', 'cream', 'mist', 'paper', 'olive'], 'index.html: surface order');
  var darks = secs.filter(function (s) { return s.dark; });
  assert.ok(darks.length <= 2, 'index.html: more than two dark sections');
  secs.forEach(function (s, i) {
    var isDarkColor = ['olive', 'mist', 'petal', 'apricot'].indexOf(s.surface) !== -1;
    assert.strictEqual(s.dark, isDarkColor, 'index.html: section ' + i + ' surface-dark must match a dark surface');
    if (i === 0) { return; }
    var prev = secs[i - 1];
    if (prev.surface === s.surface) {
      assert.ok(s.rule, 'index.html: sections ' + (i - 1) + ' and ' + i + ' share ' + s.surface + ' without .rule-top');
    }
    assert.ok(!(prev.dark && s.dark), 'index.html: two adjacent dark sections');
  });
  assert.ok(secs[1].rule, 'index.html: "for you" section needs .rule-top');

  /* fridge leftovers are gone from the home page */
  assert.ok(!/class="[^"]*\b(stuck|mag|mag-bar|planner|note-card|notes|svc-print|polaroid|std)\b/.test(main), 'index.html: fridge classes still in <main>');
  assert.ok(/<symbol id="sprig-leafy"/.test(html), 'index.html: sprig-leafy symbol missing');
  assert.ok(/<use href="#sprig-leafy"\/>/.test(main), 'index.html: closing section has no leafy sprig');
  /* services: six white sheets in .svcs */
  assert.strictEqual((main.match(/<li class="svc sheet"/g) || []).length, 6, 'index.html: expected six .svc.sheet cards');
  assert.ok(/<ul class="svcs"/.test(main), 'index.html: .svcs list missing');
  /* how: six accordion buttons, each controlling an existing dl */
  var togs = main.match(/<button type="button" class="pc-tog" aria-expanded="false" aria-controls="step-\d"/g) || [];
  assert.strictEqual(togs.length, 6, 'index.html: expected six .pc-tog buttons');
  togs.forEach(function (t) {
    var id = t.match(/aria-controls="([^"]+)"/)[1];
    assert.ok(new RegExp('<dl class="pc-dl" id="' + id + '"').test(main), 'index.html: missing dl#' + id);
  });
  /* reviews and about */
  assert.ok(/<div class="rev"/.test(main) && (main.match(/<figure class="chat"/g) || []).length === 3, 'index.html: reviews changed');
  assert.ok(/<figure class="pol pol-solo[^"]*"[^>]*><span class="peg"/.test(main), 'index.html: about photo is not a .pol-solo with peg');
  assert.ok(/<a class="[^"]*pol-solo[^"]*" href="assets\/cert-miluim-full\.webp" target="_blank" rel="noopener" aria-label="[^"]+"/.test(main), 'index.html: certificate link lost its href/target/label');
  /* FAQ uses the plain .faq component, closing CTA is a primary button */
  assert.ok(/<div class="faq">/.test(main), 'index.html: FAQ is not the plain .faq component');
  assert.ok(/surface-olive surface-dark[\s\S]*class="btn btn-primary big"/.test(main), 'index.html: closing has no .btn-primary');
})();

/* no fridge magnets anywhere: no magnet images, no .mag or .stuck classes */
pages.forEach(function (page) {
  var html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(!/assets\/magnets\//.test(html), page + ': still references assets/magnets/');
  assert.ok(!/logo-magnet\.webp/.test(html), page + ': still references logo-magnet.webp');
  assert.ok(!/class="mag/.test(html), page + ': still has a class="mag…" element');
  assert.ok(!/class="[^"]*\bstuck\b[^"]*"/.test(html), page + ': still has a .stuck class');
});

/* inner pages: every section in <main> has one surface; at most two dark, never adjacent,
   no adjacent cream, adjacent paper separated by .rule-top */
function surfaces(page) {
  var html = fs.readFileSync(path.join(root, page), 'utf8');
  var main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  var secs = (main.match(/<section\b[^>]*>/g) || []).map(function (tag) {
    var cls = ((tag.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);
    var surf = cls.filter(function (c) { return /^surface-/.test(c) && c !== 'surface-dark'; });
    assert.strictEqual(surf.length, 1, page + ': section needs exactly one surface: ' + tag);
    return { surface: surf[0].slice(8), dark: cls.indexOf('surface-dark') !== -1, rule: cls.indexOf('rule-top') !== -1 };
  });
  assert.ok(secs.length > 0, page + ': no sections in <main>');
  assert.ok(secs.filter(function (s) { return s.dark; }).length <= 2, page + ': more than two dark sections');
  secs.forEach(function (s, i) {
    if (i === 0) { return; }
    var prev = secs[i - 1];
    assert.ok(!(prev.dark && s.dark), page + ': two adjacent dark sections');
    assert.ok(!(prev.surface === 'cream' && s.surface === 'cream'), page + ': two adjacent cream sections');
    if (prev.surface === 'paper' && s.surface === 'paper') { assert.ok(s.rule, page + ': adjacent paper sections without .rule-top'); }
  });
  return { main: main, secs: secs.map(function (s) { return s.surface; }) };
}

/* events: paper head with kicker + h1, eleven polaroids with pegs, cream closing section */
(function () {
  var r = surfaces('events.html');
  assert.deepStrictEqual(r.secs, ['paper', 'cream'], 'events.html: surface order');
  assert.ok(/<span class="kicker">[^<]+<\/span><h1>/.test(r.main), 'events.html: head needs .kicker before h1');
  var cards = r.main.match(/<a class="ev pol pol-solo" href="event-[a-z-]+\.html"><span class="peg"><\/span><div class="pol-sway">/g) || [];
  assert.strictEqual(cards.length, 11, 'events.html: expected 11 polaroid event cards, found ' + cards.length);
  assert.ok(!/class="cloud"/.test(r.main), 'events.html: sky cloud still in the closing box');
})();

/* works: paper, the ceremony video unchanged inside a framed sheet */
(function () {
  var r = surfaces('works.html');
  assert.deepStrictEqual(r.secs, ['paper'], 'works.html: surface order');
  assert.ok(/<article class="sheet sheet-framed sample" data-sample /.test(r.main), 'works.html: sample is not a .sheet-framed card');
  assert.ok(/<video src="assets\/samples\/01-graduation-reel\.mp4\?v=1" poster="assets\/samples\/01-graduation-poster\.webp\?v=1" muted loop playsinline preload="metadata"/.test(r.main), 'works.html: video source/poster/attributes changed');
})();

/* contact: paper head, the form in a .sheet on a cream section */
(function () {
  var r = surfaces('contact.html');
  assert.deepStrictEqual(r.secs, ['paper', 'cream'], 'contact.html: surface order');
  var cream = r.main.slice(r.main.indexOf('surface-cream'));
  assert.ok(/<div class="sheet cf-card">\s*<form id="cf"/.test(cream), 'contact.html: form is not inside a .sheet on the cream section');
  assert.ok(/<h1 id="contact-h">/.test(r.main.slice(0, r.main.indexOf('surface-cream'))), 'contact.html: h1 is not in the paper head');
})();

/* styles.css: warm shadows only, loaded weights only, scroll reveal is a plain fade/rise */
(function () {
  var css = fs.readFileSync(path.join(root, 'assets', 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  var body = css.slice(css.indexOf('}', css.indexOf(':root{')) + 1); /* skip the token block */
  body = body.slice(body.indexOf('}') + 1); /* and its reduced-motion override line */
  assert.ok(!/rgba\(\s*(16,\s*24,\s*40|17,\s*24,\s*39)/.test(css), 'styles.css: cold grey-blue shadow left');
  assert.ok(!/var\(--fw-(semibold|bold)\)/.test(body), 'styles.css: uses --fw-semibold/--fw-bold (weights not loaded)');
  assert.ok(!/font-weight:\s*(600|700|800|bold)/.test(body), 'styles.css: font-weight 600+ (not loaded)');
  var stick = (css.match(/\.rv-hide\.rv-stick\{[^}]*\}/) || [''])[0];
  assert.ok(!/rotate|scale/.test(stick), 'styles.css: .rv-hide.rv-stick still tilts or scales');
  var mo = (css.match(/@keyframes mo-stick\{[^}]*\}\}?/) || [''])[0];
  assert.ok(!/rotate|scale/.test(mo), 'styles.css: mo-stick still tilts or scales');
  /* reduced motion: the rope becomes a static row that scrolls inside itself, so all 10 cards stay reachable */
  var reduce = (css.match(/@media \(prefers-reduced-motion:reduce\)\{[^@]*\.rope-track\{[^}]*\}[^@]*/) || [''])[0];
  assert.ok(/\.rope-track\{[^}]*overflow-x:auto/.test(reduce), 'styles.css: reduced motion keeps the rope-track from scrolling');
  assert.ok(/\.rope-card\{[^}]*offset-path:none/.test(reduce), 'styles.css: reduced motion leaves rope cards on the offset path');
  assert.ok(/\.rope\{[^}]*pointer-events:auto/.test(reduce), 'styles.css: reduced motion leaves the rope without pointer events');
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
