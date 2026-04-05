(function () {
  /* ================= SAFETY ================= */

  // Do NOT run inside HAVY dashboard
  if (window.location.pathname.startsWith('/dashboard')) return;

  var cfg = window.HAVY_CONFIG || {};

  var CLIENT_ID       = cfg.businessId        || window.HAVY_CLIENT_ID;
  var SUPABASE_URL    = cfg.supabaseUrl       || window.HAVY_SUPABASE_URL;
  var SUPABASE_ANON_KEY = cfg.supabaseAnonKey || window.HAVY_SUPABASE_ANON_KEY;

  if (!CLIENT_ID)         return;
  if (!SUPABASE_URL)      return;
  if (!SUPABASE_ANON_KEY) return;

  var API_URL = SUPABASE_URL + '/rest/v1/uat_events';

  var MAX_BATCH     = 10;
  var SEND_INTERVAL = 3000;
  var HOVER_DELAY   = 600;

  /* ================= SESSION ================= */

  var sessionStart = Date.now();
  var sessionId    = null;

  try {
    sessionId = sessionStorage.getItem('havy_session');
    if (!sessionId) {
      sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'sess-' + Math.random().toString(36).slice(2) + Date.now();
      sessionStorage.setItem('havy_session', sessionId);
    }
  } catch (e) {
    sessionId = 'sess-' + Math.random().toString(36).slice(2) + Date.now();
  }

  /* ================= QUEUE ================= */

  var queue = [];

  function safeStr(v, max) {
    if (!v) return null;
    var s = String(v).trim();
    return max ? s.slice(0, max) : s;
  }

  function findMeaningfulElement(el) {
    var depth = 0;
    while (el && el !== document.body && depth < 10) {
      var tag = el.tagName && el.tagName.toLowerCase();
      var useful = ['button','a','input','textarea','select','label','p','h1','h2','h3','h4','h5','h6'];
      if (useful.includes(tag)) return el;
      if (el.innerText && el.innerText.trim().length > 20) return el;
      el = el.parentElement;
      depth++;
    }
    return null;
  }

  function getDomPath(el) {
    var path = [];
    var node = el;
    while (node && node !== document.body && path.length < 5) {
      var part = node.tagName ? node.tagName.toLowerCase() : '';
      if (node.id) {
        part += '#' + node.id;
      } else if (node.className && typeof node.className === 'string') {
        var cls = node.className.trim().split(/\s+/)[0];
        if (cls) part += '.' + cls;
      }
      path.unshift(part);
      node = node.parentElement;
    }
    return path.join(' > ');
  }

  function getScrollDepth() {
    try {
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop;
      var docHeight = Math.max(
        body.scrollHeight, body.offsetHeight,
        doc.clientHeight, doc.scrollHeight, doc.offsetHeight
      );
      var viewport = window.innerHeight;
      if (docHeight <= viewport) return 100;
      return Math.round((scrollTop / (docHeight - viewport)) * 100);
    } catch (e) { return 0; }
  }

  function buildDataAttrs(el) {
    try {
      if (!el.dataset) return null;
      var obj = {};
      var keys = Object.keys(el.dataset);
      if (!keys.length) return null;
      keys.slice(0, 10).forEach(function (k) { obj[k] = el.dataset[k]; });
      return obj;
    } catch (e) { return null; }
  }

  function enqueue(type, el) {
    el = findMeaningfulElement(el);
    if (!el) return;

    queue.push({
      client_id:      CLIENT_ID,
      session_id:     sessionId,
      event_type:     type,
      tag:            safeStr(el.tagName && el.tagName.toLowerCase(), 50),
      text_content:   safeStr(el.innerText, 150),
      page_url:       safeStr(window.location.pathname, 500),
      occurred_at:    new Date().toISOString(),
      data_attrs:     buildDataAttrs(el),
      element_class:  safeStr(typeof el.className === 'string' ? el.className : null, 200),
      dom_path:       safeStr(getDomPath(el), 300),
      scroll_depth:   getScrollDepth(),
      viewport_width: window.innerWidth,
    });

    if (queue.length >= MAX_BATCH) flush();
  }

  function flush() {
    if (!queue.length) return;
    var payload = queue.splice(0, queue.length);
    try {
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
        // Re-queue on network failure (limit to avoid memory bloat)
        if (queue.length < 50) queue.unshift.apply(queue, payload);
      });
    } catch (e) {
      // fetch not available — discard gracefully
    }
  }

  /* ================= SESSION END ================= */

  function flushWithDuration() {
    var duration = Math.round((Date.now() - sessionStart) / 1000);
    queue.push({
      client_id:      CLIENT_ID,
      session_id:     sessionId,
      event_type:     'session_end',
      tag:            null,
      text_content:   'duration:' + duration + 's',
      page_url:       safeStr(window.location.pathname, 500),
      occurred_at:    new Date().toISOString(),
      scroll_depth:   getScrollDepth(),
      viewport_width: window.innerWidth,
    });
    flush();
  }

  setInterval(flush, SEND_INTERVAL);
  window.addEventListener('beforeunload', flushWithDuration);
  window.addEventListener('pagehide',     flushWithDuration);

  /* ================= EVENTS ================= */

  // Click
  document.addEventListener('click', function (e) {
    enqueue('click', e.target);
  });

  // Sustained hover (> HOVER_DELAY ms)
  var hoverTimer = null;
  var current    = null;
  document.addEventListener('mouseover', function (e) {
    current = e.target;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      if (current === e.target) enqueue('hover', e.target);
    }, HOVER_DELAY);
  });

  // Rage click
  var RAGE_WINDOW = 600;
  var RAGE_MIN    = 3;
  var rageTarget = null, rageClicks = 0, rageTimer = null;
  document.addEventListener('click', function (e) {
    var el = findMeaningfulElement(e.target);
    if (!el) return;
    if (el === rageTarget) {
      rageClicks++;
      if (rageClicks >= RAGE_MIN) {
        enqueue('rage_click', el);
        rageClicks = 0; rageTarget = null;
        clearTimeout(rageTimer);
      }
    } else {
      rageTarget = el; rageClicks = 1;
      clearTimeout(rageTimer);
    }
    clearTimeout(rageTimer);
    rageTimer = setTimeout(function () { rageTarget = null; rageClicks = 0; }, RAGE_WINDOW);
  }, true);

  // Form focus
  document.addEventListener('focusin', function (e) {
    var tag = e.target && e.target.tagName && e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      enqueue('focus', e.target);
    }
  });

  // Scroll depth (sampled, ≥10% deeper only)
  var lastScrollDepth = 0;
  var scrollThrottle  = null;
  window.addEventListener('scroll', function () {
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(function () {
      scrollThrottle = null;
      var depth = getScrollDepth();
      if (depth >= lastScrollDepth + 10) {
        lastScrollDepth = depth;
        queue.push({
          client_id:      CLIENT_ID,
          session_id:     sessionId,
          event_type:     'scroll',
          tag:            null,
          text_content:   null,
          page_url:       safeStr(window.location.pathname, 500),
          occurred_at:    new Date().toISOString(),
          scroll_depth:   depth,
          viewport_width: window.innerWidth,
        });
      }
    }, 500);
  });

})();