/**
 * HAVY Universal Integration Script
 * ───────────────────────────────────
 * Paste once into <head>. Activates automatically:
 *   Part 1 — UAT event tracking  → uat_events table
 *   Part 2 — Chatbot widget       → /functions/v1/faq  (chatbot credits)
 *                                   /functions/v1/transcribe (STT credits)
 *   Part 3 — Dictation widget     → Web Speech Synthesis API (reads page text aloud)
 *
 * Business name is fetched automatically from the businesses table via chatbot_key.
 * No extra config needed beyond businessId, chatbotKey, supabaseUrl, supabaseAnonKey.
 */

(function () {
  'use strict';

  /* ── Guard: never run inside the HAVY dashboard itself ──────── */
  if (window.location.pathname.startsWith('/dashboard')) return;

  var cfg = window.HAVY_CONFIG;
  if (!cfg) { console.warn('[HAVY] window.HAVY_CONFIG not set.'); return; }

  var CLIENT_ID    = cfg.businessId;
  var CHATBOT_KEY  = cfg.chatbotKey;
  var SUPABASE_URL = cfg.supabaseUrl;
  var ANON_KEY     = cfg.supabaseAnonKey;

  if (!CLIENT_ID || !SUPABASE_URL || !ANON_KEY) {
    console.warn('[HAVY] Missing required config: businessId, supabaseUrl, supabaseAnonKey');
    return;
  }

  /* ── Fetch business name automatically via chatbot_key ─────── */
  var BNAME = '';  // filled async below — chatbot header updates on load
  // hvMsgsRef: reference to the chat messages array so async name can patch msg[0]
  var _hvMsgsRef = null;
  var _hvRenderRef = null;
  if (CHATBOT_KEY) {
    fetch(SUPABASE_URL + '/rest/v1/businesses?chatbot_key=eq.' + encodeURIComponent(CHATBOT_KEY) + '&select=business_name&limit=1', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY }
    })
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (rows && rows[0] && rows[0].business_name) {
        BNAME = rows[0].business_name;
        // Patch the welcome message text in the messages array
        if (_hvMsgsRef && _hvMsgsRef[0] && _hvMsgsRef[0].id === 'welcome') {
          _hvMsgsRef[0].text = '\uD83D\uDC4B Hello! I\'m ' + BNAME + '\'s AI Assistant. Ask me anything!';
        }
        // Update chatbot header name if widget already rendered
        var nameEl = document.getElementById('hv-bname');
        if (nameEl) nameEl.textContent = BNAME + '\'s Assistant';
        // Update welcome bubble if it's already in DOM
        var wEl = document.getElementById('hv-welcome');
        if (wEl) wEl.textContent = '\uD83D\uDC4B Hello! I\'m ' + BNAME + '\'s AI Assistant. Ask me anything!';
        // Re-render if chat is currently open
        if (_hvRenderRef) _hvRenderRef();
      }
    })
    .catch(function(){});
  }

  /* ================================================================
     PART 1 — UAT Tracking
     Stores click / hover / rage_click / focus / scroll events into
     the uat_events Supabase table. CLIENT_ID = business.id so the
     HAVY dashboard's UATAnalytics page can query it correctly.
  ================================================================ */

  if (cfg.enableUAT !== false) {
    (function initUAT() {
      var API_URL       = SUPABASE_URL + '/rest/v1/uat_events';
      var MAX_BATCH     = 10;
      var SEND_INTERVAL = 3000;
      var HOVER_DELAY   = 600;

      var sessionStart = Date.now();
      var sessionId;
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

      var queue = [];

      function safeStr(v, max) {
        if (!v) return null;
        var s = String(v).trim();
        return max ? s.slice(0, max) : s;
      }

      function findMeaningful(el) {
        var d = 0;
        while (el && el !== document.body && d < 10) {
          var t = el.tagName && el.tagName.toLowerCase();
          if (['button','a','input','textarea','select','label','p','h1','h2','h3','h4','h5','h6'].indexOf(t) >= 0) return el;
          if (el.innerText && el.innerText.trim().length > 20) return el;
          el = el.parentElement; d++;
        }
        return null;
      }

      function getDomPath(el) {
        var p = [], n = el;
        while (n && n !== document.body && p.length < 5) {
          var s = n.tagName ? n.tagName.toLowerCase() : '';
          if (n.id) s += '#' + n.id;
          else if (n.className && typeof n.className === 'string') {
            var c = n.className.trim().split(/\s+/)[0];
            if (c) s += '.' + c;
          }
          p.unshift(s); n = n.parentElement;
        }
        return p.join(' > ');
      }

      function getScroll() {
        try {
          var doc = document.documentElement, b = document.body;
          var top = window.pageYOffset || doc.scrollTop || b.scrollTop;
          var h = Math.max(b.scrollHeight, b.offsetHeight, doc.clientHeight, doc.scrollHeight, doc.offsetHeight);
          var vp = window.innerHeight;
          return h <= vp ? 100 : Math.round((top / (h - vp)) * 100);
        } catch(e){ return 0; }
      }

      function buildDataAttrs(el) {
        try {
          if (!el.dataset) return null;
          var o = {}, ks = Object.keys(el.dataset);
          if (!ks.length) return null;
          ks.slice(0,10).forEach(function(k){ o[k] = el.dataset[k]; });
          return o;
        } catch(e){ return null; }
      }

      function enqueue(type, el) {
        el = findMeaningful(el);
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
          scroll_depth:   getScroll(),
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
              apikey: ANON_KEY,
              Authorization: 'Bearer ' + ANON_KEY,
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(function() {
            if (queue.length < 50) queue = payload.concat(queue);
          });
        } catch(e){}
      }

      function flushWithDuration() {
        queue.push({
          client_id:      CLIENT_ID,
          session_id:     sessionId,
          event_type:     'session_end',
          tag:            null,
          text_content:   'duration:' + Math.round((Date.now() - sessionStart) / 1000) + 's',
          page_url:       safeStr(window.location.pathname, 500),
          occurred_at:    new Date().toISOString(),
          scroll_depth:   getScroll(),
          viewport_width: window.innerWidth,
        });
        flush();
      }

      setInterval(flush, SEND_INTERVAL);
      window.addEventListener('beforeunload', flushWithDuration);
      window.addEventListener('pagehide', flushWithDuration);

      document.addEventListener('click', function(e){ enqueue('click', e.target); });

      var hoverT = null, curEl = null;
      document.addEventListener('mouseover', function(e) {
        curEl = e.target; clearTimeout(hoverT);
        hoverT = setTimeout(function(){
          if (curEl === e.target) enqueue('hover', e.target);
        }, HOVER_DELAY);
      });

      var RAGE_WIN = 600, RAGE_MIN = 3, rageTarget = null, rageN = 0, rageT = null;
      document.addEventListener('click', function(e) {
        var el = findMeaningful(e.target);
        if (!el) return;
        if (el === rageTarget) {
          rageN++;
          if (rageN >= RAGE_MIN) { enqueue('rage_click', el); rageN = 0; rageTarget = null; clearTimeout(rageT); }
        } else { rageTarget = el; rageN = 1; clearTimeout(rageT); }
        clearTimeout(rageT);
        rageT = setTimeout(function(){ rageTarget = null; rageN = 0; }, RAGE_WIN);
      }, true);

      document.addEventListener('focusin', function(e) {
        var t = e.target && e.target.tagName && e.target.tagName.toLowerCase();
        if (t === 'input' || t === 'textarea' || t === 'select') enqueue('focus', e.target);
      });

      var lastDepth = 0, scrollT = null;
      window.addEventListener('scroll', function() {
        if (scrollT) return;
        scrollT = setTimeout(function(){
          scrollT = null;
          var d = getScroll();
          if (d >= lastDepth + 10) {
            lastDepth = d;
            queue.push({
              client_id: CLIENT_ID, session_id: sessionId,
              event_type: 'scroll', tag: null, text_content: null,
              page_url: safeStr(window.location.pathname, 500),
              occurred_at: new Date().toISOString(),
              scroll_depth: d, viewport_width: window.innerWidth,
            });
          }
        }, 500);
      });

    })();
  }

  /* ================================================================
     PART 2 — Chatbot Widget
     - Business name fetched automatically via chatbot_key (BNAME)
     - Chatbot messages call /functions/v1/faq (decrements chatbot credits)
     - Mic calls /functions/v1/transcribe (decrements STT credits)
  ================================================================ */

  if (cfg.enableChatbot !== false && CHATBOT_KEY) {
    (function initChatbot() {
      var FAQ_URL   = SUPABASE_URL + '/functions/v1/faq';
      var TRANS_URL = SUPABASE_URL + '/functions/v1/transcribe';
      var COLOR     = '#6366f1';
      var GRAD      = 'linear-gradient(135deg,' + COLOR + 'f5,' + COLOR + 'cc)';

      var style = document.createElement('style');
      style.textContent = [
        '#hv{position:fixed;right:20px;bottom:20px;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
        '#hv *{box-sizing:border-box;margin:0;padding:0}',
        '#hv-btn{width:56px;height:56px;border-radius:50%;background:' + GRAD + ';border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px ' + COLOR + '50;transition:all .3s}',
        '#hv-btn:hover{transform:scale(1.1) translateY(-3px)}',
        '#hv-win{width:360px;height:520px;border-radius:18px;background:#fff;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.25)}',
        '#hv-hdr{background:' + GRAD + ';color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}',
        '#hv-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(180deg,#f8faff,#fff 60%)}',
        '.hv-bubble{max-width:80%;padding:9px 13px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}',
        '.hv-bot{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid ' + COLOR + '12;border-radius:14px 14px 14px 4px;box-shadow:0 2px 6px rgba(0,0,0,.06)}',
        '.hv-user{align-self:flex-end;background:' + GRAD + ';color:#fff;border-radius:14px 14px 4px 14px;box-shadow:0 3px 10px ' + COLOR + '30}',
        '#hv-inp-wrap{border-top:1px solid ' + COLOR + '12;background:#fff;padding:9px 10px;flex-shrink:0}',
        '#hv-form{display:flex;gap:7px;align-items:center}',
        '#hv-mic,#hv-send{width:36px;height:36px;border:none;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}',
        '#hv-mic{background:#f8faff;border:1.5px solid ' + COLOR + '30;color:' + COLOR + '}',
        '#hv-mic.rec{background:#fef2f2;border-color:#ef4444;color:#ef4444}',
        '#hv-send{background:' + GRAD + ';color:#fff;box-shadow:0 3px 10px ' + COLOR + '30}',
        '#hv-send:hover{transform:translateY(-2px)}',
        '#hv-inp{flex:1;padding:8px 12px;border:1.5px solid ' + COLOR + '18;border-radius:9px;font-size:13px;outline:none;background:#f8faff;color:#1e293b;transition:all .2s}',
        '#hv-inp:focus{border-color:' + COLOR + ';background:#fff;box-shadow:0 0 8px ' + COLOR + '25}',
        '#hv-ctrl button{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:7px;font-size:13px;transition:background .2s}',
        '#hv-ctrl button:hover{background:rgba(255,255,255,.28)}',
        '@keyframes hv-slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
        '@keyframes hv-wave{0%,100%{height:5px;opacity:.5}50%{height:16px;opacity:1}}',
      ].join('');
      document.head.appendChild(style);

      var wrap = document.createElement('div'); wrap.id = 'hv';
      document.body.appendChild(wrap);

      // Welcome message — business name filled in once BNAME resolves
      var initMsg = BNAME
        ? ('\uD83D\uDC4B Hello! I\'m ' + BNAME + '\'s AI Assistant. Ask me anything!')
        : '\uD83D\uDC4B Hello! I\'m your AI Assistant. Ask me anything!';
      var msgs = [{ sender: 'bot', text: initMsg, id: 'welcome' }];
      // Expose refs so the async BNAME fetch can patch the welcome message
      _hvMsgsRef = msgs;
      var isOpen = false, isLoading = false, isRec = false, isSttLoad = false;
      var mr = null, chunks = [];

      function render() {
        wrap.innerHTML = '';
        if (!isOpen) {
          var btn = document.createElement('button');
          btn.id = 'hv-btn';
          btn.setAttribute('aria-label', 'Open AI Assistant');
          btn.innerHTML = '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
          btn.onclick = function(){ isOpen = true; render(); };
          wrap.appendChild(btn); return;
        }

        var win = document.createElement('div'); win.id = 'hv-win';

        // Header — ids used by async BNAME update
        var hdr = document.createElement('div'); hdr.id = 'hv-hdr';
        var displayName = (BNAME || 'AI') + '\'s Assistant';
        hdr.innerHTML =
          '<div style="display:flex;align-items:center;gap:9px">' +
            '<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;border:1.5px solid rgba(255,255,255,.3)">🤖</div>' +
            '<div>' +
              '<div id="hv-bname" style="font-size:13px;font-weight:700">' + esc(displayName) + '</div>' +
              '<div style="font-size:10px;opacity:.85;display:flex;align-items:center;gap:4px">' +
                '<span style="width:5px;height:5px;background:#4ade80;border-radius:50%;display:inline-block"></span>' +
                'Online · FAQ AI' +
              '</div>' +
            '</div>' +
          '</div>';
        var ctrl = document.createElement('div'); ctrl.id = 'hv-ctrl';
        var closeBtn = document.createElement('button'); closeBtn.textContent = '✕';
        closeBtn.onclick = function(){ isOpen = false; render(); };
        ctrl.appendChild(closeBtn); hdr.appendChild(ctrl); win.appendChild(hdr);

        // Messages
        var msgsEl = document.createElement('div'); msgsEl.id = 'hv-msgs';
        msgs.forEach(function(m, idx) {
          var b = document.createElement('div');
          b.className = 'hv-bubble hv-' + m.sender;
          b.style.animation = 'hv-slide .25s ease both';
          if (idx === 0) b.id = 'hv-welcome';
          b.textContent = m.text;
          msgsEl.appendChild(b);
        });
        if (isLoading || isSttLoad) {
          var dots = document.createElement('div');
          dots.style.cssText = 'display:flex;gap:5px;align-items:center;padding:2px 0';
          if (isSttLoad) {
            dots.innerHTML = '<span style="font-size:11px;color:#94a3b8">Transcribing…</span>';
          } else {
            [0,1,2].forEach(function(i){
              var d = document.createElement('div');
              d.style.cssText = 'width:7px;background:' + COLOR + ';border-radius:4px;animation:hv-wave .8s ease-in-out ' + (i*0.1) + 's infinite';
              dots.appendChild(d);
            });
          }
          msgsEl.appendChild(dots);
        }
        win.appendChild(msgsEl);
        setTimeout(function(){ msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);

        // Input
        var iw = document.createElement('div'); iw.id = 'hv-inp-wrap';
        var form = document.createElement('form'); form.id = 'hv-form';

        var mic = document.createElement('button');
        mic.id = 'hv-mic'; mic.type = 'button';
        if (isRec) mic.className = 'rec';
        mic.title = isRec ? 'Stop recording' : 'Speak (uses STT credits)';
        mic.innerHTML = isRec
          ? '<svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
          : '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>';
        mic.onclick = toggleMic;

        var inp = document.createElement('input'); inp.id = 'hv-inp'; inp.type = 'text';
        inp.placeholder = isRec ? '🔴 Listening…' : 'Type or speak…';
        inp.disabled = isLoading || isRec;

        var snd = document.createElement('button'); snd.id = 'hv-send'; snd.type = 'submit';
        snd.disabled = isLoading;
        snd.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

        form.appendChild(mic); form.appendChild(inp); form.appendChild(snd);
        form.onsubmit = function(e){
          e.preventDefault();
          var t = inp.value.trim();
          if (t && !isLoading) { send(t); inp.value = ''; }
        };

        var foot = document.createElement('p');
        foot.style.cssText = 'font-size:9px;color:#cbd5e1;text-align:center;margin-top:5px;letter-spacing:.3px';
        foot.textContent = '💬 HAVY FAQ AI · 🎙 Groq Whisper STT';
        iw.appendChild(form); iw.appendChild(foot); win.appendChild(iw);
        wrap.appendChild(win);
        setTimeout(function(){ inp.focus(); }, 40);
      }

      function send(text) {
        msgs.push({ sender: 'user', text: text });
        isLoading = true; render();
        fetch(FAQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ question: text, chatbot_key: CHATBOT_KEY }),
        }).then(function(r){ return r.json(); }).then(function(d){
          var ans = d.error === 'credit_limit_reached'
            ? '⚠️ Monthly chatbot limit reached.'
            : (d.answer || "I don't have a specific answer for that. Please contact us directly!");
          msgs.push({ sender: 'bot', text: ans });
          isLoading = false; render();
        }).catch(function(){
          msgs.push({ sender: 'bot', text: '⚠️ Connection error. Please try again.' });
          isLoading = false; render();
        });
      }

      function toggleMic() {
        if (isRec) {
          if (mr) { mr.stop(); mr = null; }
          isRec = false; render();
        } else {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
            var rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunks = [];
            rec.ondataavailable = function(e){ if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = function(){
              stream.getTracks().forEach(function(t){ t.stop(); });
              var blob = new Blob(chunks, { type: 'audio/webm' });
              isSttLoad = true; isRec = false; render();
              var fd = new FormData();
              fd.append('audio', blob, 'audio.webm');
              fd.append('chatbot_key', CHATBOT_KEY);
              fetch(TRANS_URL, {
                method: 'POST',
                headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
                body: fd,
              }).then(function(r){ return r.json(); }).then(function(d){
                isSttLoad = false;
                if (d.transcript) send(d.transcript.trim());
                else if (d.error && d.error.indexOf('Credit') >= 0)
                  msgs.push({ sender: 'bot', text: '⚠️ STT credits exhausted. Please upgrade your plan.' });
                render();
              }).catch(function(){ isSttLoad = false; render(); });
            };
            rec.start(); mr = rec; isRec = true; render();
          }).catch(function(){ console.warn('[HAVY] Mic access denied'); });
        }
      }

      function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      // Expose render so async BNAME fetch can trigger a re-render
      _hvRenderRef = function() { if (isOpen) render(); };

      render();
    })();
  }

  /* ================================================================
     PART 3 — Dictation Widget (Text-to-Speech on hover/click)
     Fixed at bottom-center. Reads page text aloud using the browser's
     Web Speech Synthesis API — same behaviour as the HAVY dashboard's
     DictationToggle + useDictationCapture hook.
     No extra config needed — always injected when the script loads.
  ================================================================ */

  if (cfg.enableDictation !== false) {
  (function initDictation() {
    if (!window.speechSynthesis) return;  // browser doesn't support TTS

    var isOn = false;
    var lastText = '', lastTime = 0;
    var hoverT = null;

    /* ── Ignored tags (same list as useDictationCapture.ts) ─── */
    var IGNORED = ['INPUT','TEXTAREA','SVG','PATH','HEADER','FOOTER','UL','OL','LI','NAV'];

    function extractText(el) {
      if (!(el instanceof HTMLElement)) return null;
      if (IGNORED.indexOf(el.tagName) >= 0) return null;
      if (el.tagName === 'DIV' && el.children.length > 0) return null;
      var t = el.innerText && el.innerText.trim();
      if (!t || t.length < 3 || t.length > 300 || t.split(' ').length > 40) return null;
      return t;
    }

    function speak(text) {
      var now = Date.now();
      if (now - lastTime < 1500) return;
      if (text === lastText) return;
      lastTime = now; lastText = text;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var lang = document.documentElement.lang ? document.documentElement.lang.slice(0,2) : 'en';
      u.lang = lang;
      window.speechSynthesis.speak(u);
    }

    function onHover(e) {
      if (!isOn) return;
      clearTimeout(hoverT);
      var target = e.target;
      hoverT = setTimeout(function(){
        var t = extractText(target);
        if (t) speak(t);
      }, 500);
    }

    function onClick(e) {
      if (!isOn) return;
      var t = extractText(e.target);
      if (t) speak(t);
    }

    document.addEventListener('mouseover', onHover);
    document.addEventListener('click', onClick);

    /* ── Floating toggle button — bottom-center, above chatbot ─ */
    var COLOR   = '#6366f1';
    var style   = document.createElement('style');
    style.textContent = [
      '#hv-dict{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9998;',
        'display:flex;align-items:center;gap:8px;',
        'padding:9px 18px;border-radius:999px;border:1.5px solid;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
        'font-size:13px;font-weight:500;cursor:pointer;',
        'box-shadow:0 4px 20px rgba(0,0,0,.12);',
        'transition:all .25s cubic-bezier(.4,0,.2,1)}',
      '#hv-dict.off{background:#fff;border-color:#e2e8f0;color:#64748b}',
      '#hv-dict.off:hover{border-color:#c7d2fe;color:#4f46e5;box-shadow:0 6px 24px rgba(0,0,0,.15)}',
      '#hv-dict.on{background:' + COLOR + ';border-color:' + COLOR + ';color:#fff;',
        'box-shadow:0 4px 20px ' + COLOR + '60}',
      '#hv-dict.on:hover{background:#4f46e5;box-shadow:0 8px 28px ' + COLOR + '70}',
      '#hv-dpulse{width:7px;height:7px;border-radius:50%;background:#fff;',
        'animation:hv-dp 1.1s ease-in-out infinite}',
      '@keyframes hv-dp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}',
    ].join('');
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'hv-dict';
    btn.setAttribute('aria-label', 'Toggle dictation mode');

    function updateBtn() {
      btn.className = isOn ? 'on' : 'off';
      btn.innerHTML = isOn
        ? '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
          + '<span>Dictation ON</span>'
          + '<span id="hv-dpulse"></span>'
        : '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
          + '<span>Dictation</span>';
    }

    btn.onclick = function() {
      isOn = !isOn;
      if (!isOn) { window.speechSynthesis.cancel(); lastText = ''; }
      updateBtn();
    };

    updateBtn();
    document.body.appendChild(btn);

  })();

  } // end enableDictation

})();
