/**
 * @file
 * Hive Colab accessibility widget.
 *
 * A floating button that opens a panel of display and reading aids. Choices
 * are saved in localStorage and re-applied on every page. Document-level
 * classes are applied as soon as this file runs (it loads in the <head>) so
 * pages don't flash unstyled; everything that needs <body> waits for
 * DOMContentLoaded.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'hc-a11y-settings';
  var XHTML = 'http://www.w3.org/1999/xhtml';
  var FONT_STEP = 0.1;
  var FONT_MIN = -2;
  var FONT_MAX = 5;
  var MASK_WINDOW = 120;
  var html = document.documentElement;
  var synth = window.speechSynthesis;
  var canSpeak = !!(synth && window.SpeechSynthesisUtterance);

  var ICONS = {
    person: '<circle cx="12" cy="4" r="2"/><path d="M4 8l8 1.5L20 8M12 9.5V14m0 0l-3.5 7M12 14l3.5 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    lineHeight: '<path d="M10 6h10M10 12h10M10 18h10M4 8l2-3 2 3M4 16l2 3 2-3M6 5v14"/>',
    letterSpacing: '<path d="M5 15l3.5-9 3.5 9M6.2 12h4.6M15 6v9M3 19h18M5 17l-2 2 2 2M19 17l2 2-2 2"/>',
    font: '<path d="M3 18l4.5-12 4.5 12M4.7 14h5.6"/><circle cx="17" cy="15" r="3"/><path d="M20 12v6"/>',
    align: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    links: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    headings: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>',
    invert: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 21L21 3v15a3 3 0 0 1-3 3z" fill="currentColor"/>',
    saturation: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M6 14h12"/>',
    cursor: '<path d="M6 3l12 11h-6l3.5 7-2.5 1-3.5-7L6 19z"/>',
    guide: '<rect x="3" y="9" width="18" height="6" rx="1"/><path d="M3 4h18M3 20h18"/>',
    mask: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/>',
    still: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    images: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8M3 3l18 18"/>',
    speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a3 3 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11"/>',
    focus: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="12" cy="12" r="3"/>'
  };

  // Each feature is either a toggle or, when it has `levels`, a button that
  // cycles through them. `excludes` switches off features that clash.
  var SECTIONS = [
    {
      title: 'Content',
      items: [
        { key: 'lineHeight', label: 'Line height', icon: 'lineHeight', levels: ['Off', '1.5\u00d7', '1.8\u00d7', '2\u00d7'], values: [null, '1.5', '1.8', '2'] },
        { key: 'letterSpacing', label: 'Letter spacing', icon: 'letterSpacing', levels: ['Off', 'Small', 'Medium', 'Large'], values: [null, '.05em', '.1em', '.15em'] },
        { key: 'readableFont', label: 'Readable font', icon: 'font', cls: 'font' },
        { key: 'alignLeft', label: 'Align text left', icon: 'align', cls: 'align' },
        { key: 'highlightLinks', label: 'Highlight links', icon: 'links', cls: 'links' },
        { key: 'highlightHeadings', label: 'Highlight headings', icon: 'headings', cls: 'headings' }
      ]
    },
    {
      title: 'Colour & contrast',
      items: [
        { key: 'contrast', label: 'Contrast', icon: 'contrast', levels: ['Off', 'Dark', 'Light'], excludes: ['invert'] },
        { key: 'invert', label: 'Invert colours', icon: 'invert', cls: 'invert', excludes: ['contrast'] },
        { key: 'saturation', label: 'Saturation', icon: 'saturation', levels: ['Off', 'Low', 'Grayscale', 'High'] }
      ]
    },
    {
      title: 'Navigation & reading',
      items: [
        { key: 'bigCursor', label: 'Big cursor', icon: 'cursor', cls: 'cursor' },
        { key: 'readingGuide', label: 'Reading guide', icon: 'guide', excludes: ['readingMask'] },
        { key: 'readingMask', label: 'Reading mask', icon: 'mask', excludes: ['readingGuide'] },
        { key: 'stopAnimations', label: 'Stop animations', icon: 'still', cls: 'still' },
        { key: 'hideImages', label: 'Hide images', icon: 'images', cls: 'noimg' },
        { key: 'readAloud', label: 'Read aloud', icon: 'speak', cls: 'read', requires: canSpeak },
        { key: 'focusHighlight', label: 'Focus outline', icon: 'focus', cls: 'focus' }
      ]
    }
  ];

  var FEATURES = {};
  var DEFAULTS = { fontSize: 0 };
  SECTIONS.forEach(function (section) {
    section.items = section.items.filter(function (item) {
      return item.requires !== false;
    });
    section.items.forEach(function (item) {
      FEATURES[item.key] = item;
      DEFAULTS[item.key] = item.levels ? 0 : false;
    });
  });

  var state = loadState();
  var root, trigger, panel, live, guide, maskTop, maskBottom, fontOutput;
  var appliedScale = 1;
  var speakingEl = null;

  function loadState() {
    var saved = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    }
    catch (e) {}
    var result = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      var value = saved[key];
      var feature = FEATURES[key];
      if (key === 'fontSize') {
        result[key] = typeof value === 'number' ? clamp(value, FONT_MIN, FONT_MAX) : 0;
      }
      else if (feature.levels) {
        result[key] = typeof value === 'number' && value >= 0 && value < feature.levels.length ? value : 0;
      }
      else {
        result[key] = value === true;
      }
    });
    return result;
  }

  function saveState() {
    try {
      if (isDefault()) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }
    catch (e) {}
  }

  function isDefault() {
    return Object.keys(DEFAULTS).every(function (key) {
      return state[key] === DEFAULTS[key];
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setClass(name, on) {
    if (on) {
      html.classList.add('hc-a11y-' + name);
    }
    else {
      html.classList.remove('hc-a11y-' + name);
    }
  }

  // Everything that only needs the <html> element.
  function applyDocumentState() {
    Object.keys(FEATURES).forEach(function (key) {
      if (FEATURES[key].cls) {
        setClass(FEATURES[key].cls, state[key]);
      }
    });

    ['lineHeight', 'letterSpacing'].forEach(function (key) {
      var value = FEATURES[key].values[state[key]];
      var prop = key === 'lineHeight' ? '--hc-a11y-lh' : '--hc-a11y-ls';
      setClass(key === 'lineHeight' ? 'lh' : 'ls', !!value);
      if (value) {
        html.style.setProperty(prop, value);
      }
      else {
        html.style.removeProperty(prop);
      }
    });

    setClass('contrast-dark', state.contrast === 1);
    setClass('contrast-light', state.contrast === 2);

    var filters = [];
    if (state.invert) {
      filters.push('invert(1) hue-rotate(180deg)');
    }
    filters.push(['', 'saturate(.5)', 'grayscale(1)', 'saturate(2)'][state.saturation]);
    var filter = filters.join(' ').trim();
    html.style.filter = filter;
    html.style.webkitFilter = filter;
  }

  // Everything that needs <body> and the widget markup.
  function applyPageState() {
    scaleFonts();
    guide.hidden = !state.readingGuide;
    maskTop.hidden = maskBottom.hidden = !state.readingMask;
    if (state.stopAnimations) {
      pauseMotion();
    }
    if (!state.readAloud) {
      stopSpeaking();
    }
    renderControls();
  }

  function applyAll() {
    applyDocumentState();
    if (root) {
      applyPageState();
    }
    saveState();
  }

  /* Text size --------------------------------------------------------------
   * Most of the theme sizes text in px, so scaling the root font size does
   * little. Instead, every element that directly holds text has its original
   * computed size recorded once and is then set to original x scale. */

  function hasOwnText(el) {
    for (var node = el.firstChild; node; node = node.nextSibling) {
      if (node.nodeType === 3 && node.nodeValue.trim()) {
        return true;
      }
    }
    return false;
  }

  function isScalable(el) {
    return el.namespaceURI === XHTML &&
      !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|IFRAME|svg)$/i.test(el.tagName) &&
      !root.contains(el);
  }

  function originalSize(el) {
    var size = parseFloat(window.getComputedStyle(el).fontSize);
    var parent = el.parentElement;
    // An element added after scaling that simply inherits its size from an
    // already-scaled parent would otherwise be scaled twice.
    if (appliedScale !== 1 && parent && parent.hasAttribute('data-hc-fs') &&
        size === parseFloat(window.getComputedStyle(parent).fontSize)) {
      return parseFloat(parent.getAttribute('data-hc-fs'));
    }
    return size;
  }

  function scaleFonts() {
    var scale = Math.round((1 + state.fontSize * FONT_STEP) * 100) / 100;
    if (scale === 1 && appliedScale === 1) {
      return;
    }
    var all = document.body.getElementsByTagName('*');
    var targets = [];
    var i, el;

    // Read every original size before writing any, so writes can't skew reads.
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (el.hasAttribute('data-hc-fs')) {
        targets.push(el);
      }
      else if (scale !== 1 && isScalable(el) && hasOwnText(el)) {
        el.setAttribute('data-hc-fs', originalSize(el));
        el.setAttribute('data-hc-fs-inline', el.style.getPropertyValue('font-size') + '|' + el.style.getPropertyPriority('font-size'));
        targets.push(el);
      }
    }

    for (i = 0; i < targets.length; i++) {
      el = targets[i];
      if (scale === 1) {
        var inline = (el.getAttribute('data-hc-fs-inline') || '|').split('|');
        el.style.removeProperty('font-size');
        if (inline[0]) {
          el.style.setProperty('font-size', inline[0], inline[1]);
        }
        el.removeAttribute('data-hc-fs');
        el.removeAttribute('data-hc-fs-inline');
      }
      else {
        el.style.setProperty('font-size', (parseFloat(el.getAttribute('data-hc-fs')) * scale).toFixed(2) + 'px', 'important');
      }
    }
    appliedScale = scale;
  }

  function watchNewContent() {
    if (!window.MutationObserver) {
      return;
    }
    var timer;
    new MutationObserver(function (mutations) {
      if (appliedScale === 1) {
        return;
      }
      var relevant = mutations.some(function (m) {
        return m.addedNodes.length && !root.contains(m.target);
      });
      if (relevant) {
        clearTimeout(timer);
        timer = setTimeout(scaleFonts, 150);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* Motion, reading aids and speech --------------------------------------- */

  function pauseMotion() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (!videos[i].paused) {
        videos[i].pause();
      }
    }
    var $ = window.jQuery;
    if (!$) {
      return;
    }
    try {
      if ($.fn.carousel) {
        $('.carousel').carousel('pause');
      }
      if ($.fn.slick) {
        $('.slick-initialized').slick('slickPause');
      }
      $('.owl-carousel').trigger('stop.owl.autoplay');
      if ($.fn.flexslider) {
        $('.flexslider').each(function () {
          if ($(this).data('flexslider')) {
            $(this).flexslider('pause');
          }
        });
      }
    }
    catch (e) {}
  }

  function moveReadingAids(y) {
    if (state.readingGuide) {
      guide.style.top = (y - 7) + 'px';
    }
    if (state.readingMask) {
      var half = MASK_WINDOW / 2;
      maskTop.style.height = Math.max(0, y - half) + 'px';
      maskBottom.style.top = (y + half) + 'px';
    }
  }

  function textFor(target) {
    if (target.tagName === 'IMG') {
      return target.getAttribute('alt') || '';
    }
    var el = target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote, figcaption, caption, label, summary, button, a') || target;
    speakingTarget(el);
    return el.getAttribute('aria-label') || el.innerText || el.textContent || '';
  }

  function speakingTarget(el) {
    if (speakingEl) {
      speakingEl.classList.remove('hc-a11y-speaking');
    }
    speakingEl = el;
    if (el) {
      el.classList.add('hc-a11y-speaking');
    }
  }

  function speak(text) {
    text = (text || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      speakingTarget(null);
      return;
    }
    synth.cancel();
    var utterance = new window.SpeechSynthesisUtterance(text.slice(0, 2000));
    utterance.lang = html.lang || 'en';
    utterance.onend = utterance.onerror = function () {
      speakingTarget(null);
    };
    synth.speak(utterance);
  }

  function stopSpeaking() {
    if (canSpeak) {
      synth.cancel();
    }
    speakingTarget(null);
  }

  function onReadClick(e) {
    if (!state.readAloud || root.contains(e.target)) {
      return;
    }
    var selection = window.getSelection ? String(window.getSelection()).trim() : '';
    if (selection) {
      speakingTarget(null);
      speak(selection);
    }
    else {
      speak(textFor(e.target));
    }
  }

  function onReadFocus(e) {
    if (state.readAloud && e.target !== document.body && !root.contains(e.target)) {
      speak(textFor(e.target));
    }
  }

  /* Widget UI -------------------------------------------------------------- */

  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }

  function tileMarkup(item) {
    var dots = '';
    if (item.levels) {
      for (var i = 1; i < item.levels.length; i++) {
        dots += '<span></span>';
      }
      dots = '<span class="hc-a11y-dots" aria-hidden="true">' + dots + '</span>';
    }
    return '<button type="button" class="hc-a11y-tile" data-key="' + item.key + '" aria-pressed="false">' +
      '<span class="hc-a11y-tile-icon">' + icon(item.icon) + '</span>' +
      '<span class="hc-a11y-tile-label">' + item.label + '</span>' +
      '<span class="hc-a11y-tile-state"></span>' + dots +
      '</button>';
  }

  function build() {
    root = document.createElement('div');
    root.id = 'hc-a11y';

    var sections = SECTIONS.map(function (section, index) {
      return '<section class="hc-a11y-section" aria-labelledby="hc-a11y-s' + index + '">' +
        '<h3 class="hc-a11y-section-title" id="hc-a11y-s' + index + '">' + section.title + '</h3>' +
        (index === 0 ?
          '<div class="hc-a11y-stepper" role="group" aria-labelledby="hc-a11y-size-label">' +
            '<span class="hc-a11y-stepper-label" id="hc-a11y-size-label">Text size</span>' +
            '<span class="hc-a11y-stepper-controls">' +
              '<button type="button" class="hc-a11y-step" data-step="-1" aria-label="Decrease text size">' + icon('minus') + '</button>' +
              '<output class="hc-a11y-step-value" aria-live="polite">100%</output>' +
              '<button type="button" class="hc-a11y-step" data-step="1" aria-label="Increase text size">' + icon('plus') + '</button>' +
            '</span>' +
          '</div>' : '') +
        '<div class="hc-a11y-grid">' + section.items.map(tileMarkup).join('') + '</div>' +
        '</section>';
    }).join('');

    root.innerHTML =
      '<button type="button" class="hc-a11y-trigger" aria-expanded="false" aria-controls="hc-a11y-panel" aria-label="Accessibility options (Alt+Shift+A)">' + icon('person') + '</button>' +
      '<div class="hc-a11y-panel" id="hc-a11y-panel" role="dialog" aria-modal="false" aria-labelledby="hc-a11y-title" hidden>' +
        '<div class="hc-a11y-header">' +
          '<h2 class="hc-a11y-title" id="hc-a11y-title" tabindex="-1">Accessibility</h2>' +
          '<button type="button" class="hc-a11y-close" aria-label="Close accessibility options">' + icon('close') + '</button>' +
        '</div>' +
        '<div class="hc-a11y-body">' + sections + '</div>' +
        '<div class="hc-a11y-footer">' +
          '<button type="button" class="hc-a11y-reset">' + icon('reset') + '<span>Reset all settings</span></button>' +
          '<p class="hc-a11y-note">Saved on this device. Shortcut: Alt + Shift + A</p>' +
        '</div>' +
      '</div>' +
      '<div class="hc-a11y-guide" hidden></div>' +
      '<div class="hc-a11y-mask hc-a11y-mask-top" hidden></div>' +
      '<div class="hc-a11y-mask hc-a11y-mask-bottom" hidden></div>' +
      '<div class="hc-a11y-sr" aria-live="polite" aria-atomic="true"></div>';

    document.body.appendChild(root);

    trigger = root.querySelector('.hc-a11y-trigger');
    panel = root.querySelector('.hc-a11y-panel');
    live = root.querySelector('.hc-a11y-sr');
    guide = root.querySelector('.hc-a11y-guide');
    maskTop = root.querySelector('.hc-a11y-mask-top');
    maskBottom = root.querySelector('.hc-a11y-mask-bottom');
    fontOutput = root.querySelector('.hc-a11y-step-value');

    trigger.addEventListener('click', function () {
      if (panel.hidden) {
        openPanel();
      }
      else {
        closePanel(true);
      }
    });
    root.querySelector('.hc-a11y-close').addEventListener('click', function () {
      closePanel(true);
    });
    root.querySelector('.hc-a11y-reset').addEventListener('click', function () {
      Object.keys(DEFAULTS).forEach(function (key) {
        state[key] = DEFAULTS[key];
      });
      applyAll();
      announce('All accessibility settings have been reset.');
    });
    panel.addEventListener('click', onPanelClick);
  }

  function onPanelClick(e) {
    var step = e.target.closest('.hc-a11y-step');
    if (step) {
      var next = clamp(state.fontSize + parseInt(step.getAttribute('data-step'), 10), FONT_MIN, FONT_MAX);
      if (next !== state.fontSize) {
        state.fontSize = next;
        applyAll();
      }
      return;
    }

    var tile = e.target.closest('.hc-a11y-tile');
    if (!tile) {
      return;
    }
    var feature = FEATURES[tile.getAttribute('data-key')];
    var value = feature.levels ? (state[feature.key] + 1) % feature.levels.length : !state[feature.key];
    state[feature.key] = value;
    if (value && feature.excludes) {
      feature.excludes.forEach(function (key) {
        state[key] = DEFAULTS[key];
      });
    }
    applyAll();
    announce(feature.label + ': ' + stateLabel(feature));
  }

  function stateLabel(feature) {
    return feature.levels ? feature.levels[state[feature.key]] : (state[feature.key] ? 'On' : 'Off');
  }

  function renderControls() {
    var tiles = root.querySelectorAll('.hc-a11y-tile');
    for (var i = 0; i < tiles.length; i++) {
      var feature = FEATURES[tiles[i].getAttribute('data-key')];
      var value = state[feature.key];
      tiles[i].setAttribute('aria-pressed', value ? 'true' : 'false');
      tiles[i].querySelector('.hc-a11y-tile-state').textContent = stateLabel(feature);
      var dots = tiles[i].querySelectorAll('.hc-a11y-dots span');
      for (var d = 0; d < dots.length; d++) {
        dots[d].className = d < value ? 'is-on' : '';
      }
    }

    fontOutput.textContent = Math.round((1 + state.fontSize * FONT_STEP) * 100) + '%';
    var steps = root.querySelectorAll('.hc-a11y-step');
    steps[0].setAttribute('aria-disabled', state.fontSize <= FONT_MIN ? 'true' : 'false');
    steps[1].setAttribute('aria-disabled', state.fontSize >= FONT_MAX ? 'true' : 'false');

    root.classList.toggle('has-settings', !isDefault());
  }

  function announce(message) {
    live.textContent = '';
    setTimeout(function () {
      live.textContent = message;
    }, 50);
  }

  function focusable() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) {
        return !el.disabled && el.offsetParent !== null;
      }
    );
  }

  function openPanel() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    panel.querySelector('.hc-a11y-title').focus();
  }

  function closePanel(returnFocus) {
    if (panel.hidden) {
      return;
    }
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    if (returnFocus) {
      trigger.focus();
    }
  }

  function onKeydown(e) {
    if (e.altKey && e.shiftKey && (e.code === 'KeyA' || (e.key && e.key.toLowerCase() === 'a'))) {
      e.preventDefault();
      if (panel.hidden) {
        openPanel();
      }
      else {
        closePanel(true);
      }
      return;
    }
    if (panel.hidden) {
      if (e.key === 'Escape' && state.readAloud) {
        stopSpeaking();
      }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closePanel(true);
    }
    else if (e.key === 'Tab') {
      // Keep keyboard focus inside the open panel.
      var items = focusable();
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      }
      else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function init() {
    build();
    applyPageState();
    watchNewContent();

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('pointerdown', function (e) {
      if (!panel.hidden && !root.contains(e.target)) {
        closePanel(false);
      }
    });
    document.addEventListener('mousemove', function (e) {
      moveReadingAids(e.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (e.touches[0]) {
        moveReadingAids(e.touches[0].clientY);
      }
    }, { passive: true });
    if (canSpeak) {
      document.addEventListener('click', onReadClick, true);
      document.addEventListener('focusin', onReadFocus);
    }
    // Start the reading aids mid-screen until the pointer moves.
    moveReadingAids(window.innerHeight / 2);
  }

  applyDocumentState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
  else {
    init();
  }
})();
