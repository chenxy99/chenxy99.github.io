/* chenxy99.github.io: theme, menu, filters, copy buttons. Everything works without it. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var BG = { light: '#F8F9FB', dark: '#0B0F17' };
  var $$ = function (s, el) { return [].slice.call((el || d).querySelectorAll(s)); };
  var status = d.getElementById('status');
  function say(msg) { if (status) { status.textContent = ''; setTimeout(function () { status.textContent = msg; }, 50); } }

  /* ---- Theme: Auto (OS) / Light / Dark, stored in localStorage.theme ---- */
  var pref = 'auto';
  try { var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') pref = t; } catch (e) {}
  function resolved() { return pref === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : pref; }
  function syncTheme() {
    var r = resolved();
    $$('meta[name="theme-color"]').forEach(function (m) {
      var own = (m.getAttribute('media') || '').indexOf('dark') > -1 ? BG.dark : BG.light;
      m.setAttribute('content', pref === 'auto' ? own : BG[r]);
    });
    $$('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-label', r === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    $$('input[name="theme"]').forEach(function (i) { i.checked = i.value === pref; });
  }
  function setTheme(p) {
    pref = p;
    if (p === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', p);
    try { if (p === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', p); } catch (e) {}
    syncTheme();
  }
  $$('.theme-toggle').forEach(function (b) {
    b.addEventListener('click', function () { setTheme(resolved() === 'dark' ? 'light' : 'dark'); });
  });
  $$('input[name="theme"]').forEach(function (i) {
    i.addEventListener('change', function () { if (i.checked) setTheme(i.value); });
  });
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', syncTheme); else if (mq.addListener) mq.addListener(syncTheme);
  }
  syncTheme();

  /* ---- Small-screen menu (a <details>; works without JS) ---- */
  var menu = d.querySelector('details.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    d.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }

  /* ---- Copy buttons (BibTeX, short bio) ---- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = d.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      d.body.appendChild(ta); ta.select();
      var done = false;
      try { done = d.execCommand('copy'); } catch (e) {}
      d.body.removeChild(ta);
      if (done) ok(); else fail();
    });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var src = d.getElementById(b.getAttribute('data-copy'));
    if (!src) return;
    var label = b.lastChild, old = label.textContent;
    copyText(src.textContent.trim()).then(function () {
      b.classList.add('ok'); label.textContent = 'Copied'; say('Copied to clipboard');
      setTimeout(function () { b.classList.remove('ok'); label.textContent = old; }, 1800);
    }, function () {
      var r = d.createRange(); r.selectNodeContents(src);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      say('Text selected. Press Control+C or Command+C to copy.');
    });
  });

  /* ---- Publications: First author × Type (collapsed groups open while a filter is on) ---- */
  var fb = d.querySelector('[data-filters]');
  var pats = $$('details.pat');
  if (fb) {
    var entries = $$('.entry'), count = d.getElementById('pub-count'), empty = d.getElementById('pub-empty');
    var reset = fb.querySelector('[data-reset]'), first = fb.querySelector('[data-first]');
    var on = function (sel) { return $$(sel + '[aria-pressed="true"]', fb); };
    var wasFiltered = false, openBefore = null;
    var apply = function () {
      var types = on('[data-type]').map(function (b) { return b.getAttribute('data-type'); });
      var topics = on('[data-topic]').map(function (b) { return b.getAttribute('data-topic'); });
      var fa = first.getAttribute('aria-pressed') === 'true', n = 0;
      entries.forEach(function (el) {
        var tp = ' ' + el.getAttribute('data-topics') + ' ';
        var ok = (!types.length || types.indexOf(el.getAttribute('data-type')) > -1) &&
          (!topics.length || topics.some(function (x) { return tp.indexOf(' ' + x + ' ') > -1; })) &&
          (!fa || el.getAttribute('data-first') === '1');
        el.hidden = !ok; if (ok) n++;
      });
      $$('[data-group]').reverse().forEach(function (g) { g.hidden = !g.querySelector('.entry:not([hidden])'); });
      var active = !!(types.length || topics.length || fa);
      if (active && !wasFiltered) openBefore = pats.map(function (p) { return p.open; });   // remember collapsed state
      pats.forEach(function (p) { if (active && !p.parentNode.hidden) p.open = true; });
      if (!active && wasFiltered && openBefore) pats.forEach(function (p, i) { p.open = openBefore[i]; });   // restore it on reset
      wasFiltered = active;
      count.textContent = 'Showing ' + n + ' of ' + entries.length;
      count.hidden = !active;
      empty.hidden = n > 0;
      reset.disabled = !active;
    };
    fb.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b === reset) $$('button[aria-pressed]', fb).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      else b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      apply();
    });
  }

  /* ---- Deep links into closed <details> (e.g. #P13, #C11-bib) ---- */
  function reveal() {
    var id = decodeURIComponent(location.hash.slice(1));
    var el = id && d.getElementById(id);
    if (!el) return;
    var opened = false, p;
    if (el.closest('[hidden]') && reset && !reset.disabled) { reset.click(); opened = true; }   // reset first: it restores collapsed state
    p = el.closest('details');
    while (p) { if (!p.open) { p.open = true; opened = true; } p = p.parentElement && p.parentElement.closest('details'); }
    var top = el.getBoundingClientRect().top;
    if (opened || top < 0 || top > innerHeight / 2) el.scrollIntoView();
  }
  window.addEventListener('hashchange', reveal);
  reveal();

  /* ---- Print the full lists (earlier work, patents) ---- */
  if (pats.length) {
    var was = [];
    window.addEventListener('beforeprint', function () { was = pats.map(function (p) { return p.open; }); pats.forEach(function (p) { p.open = true; }); });
    window.addEventListener('afterprint', function () { pats.forEach(function (p, i) { p.open = was[i]; }); });
  }
})();
