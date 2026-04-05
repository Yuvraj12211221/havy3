/**
 * HAVY Universal Integration Script
 * ───────────────────────────────────
 * Reads window.HAVY_CONFIG and activates:
 *   - UAT event tracking  (stored to uat_events table via Supabase REST)
 *   - Chatbot widget       (calls /functions/v1/faq, credits tracked server-side)
 *
 * Credits for chatbot interactions are decremented by the /faq edge function.
 * Credits for STT are decremented by the /transcribe edge function.
 *
 * businessId in HAVY_CONFIG MUST be the business.id (UUID from businesses table),
 * NOT the auth user UUID. The Integrations page now correctly supplies business.id.
 */

(function () {
  'use strict';

  /* ── Guard: don't run on HAVY dashboard ──────────────────────── */
  if (window.location.pathname.startsWith('/dashboard')) return;

  var cfg = window.HAVY_CONFIG;
  if (!cfg) { console.warn('[HAVY] window.HAVY_CONFIG not set.'); return; }

  var CLIENT_ID     = cfg.businessId;
  var CHATBOT_KEY   = cfg.chatbotKey;
  var SUPABASE_URL  = cfg.supabaseUrl;
  var ANON_KEY      = cfg.supabaseAnonKey;

  if (!CLIENT_ID || !SUPABASE_URL || !ANON_KEY) {
    console.warn('[HAVY] Missing required config: businessId, supabaseUrl, supabaseAnonKey');
    return;
  }

  /* ================================================================
     PART 1 — UAT Tracking
     Sends click / hover / rage_click / focus / scroll events to
     supabase uat_events table. CLIENT_ID = business.id from the
     businesses table so UATAnalytics dashboard can query correctly.
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
        var depth = 0;
        while (el && el !== document.body && depth < 10) {
          var tag = el.tagName && el.tagName.toLowerCase();
          if (['button','a','input','textarea','select','label','p','h1','h2','h3','h4','h5','h6'].indexOf(tag) >= 0) return el;
          if (el.innerText && el.innerText.trim().length > 20) return el;
          el = el.parentElement; depth++;
        }
        return null;
      }

      function getDomPath(el) {
        var path = [], node = el;
        while (node && node !== document.body && path.length < 5) {
          var part = node.tagName ? node.tagName.toLowerCase() : '';
          if (node.id) part += '#' + node.id;
          else if (node.className && typeof node.className === 'string') {
            var cls = node.className.trim().split(/\s+/)[0];
            if (cls) part += '.' + cls;
          }
          path.unshift(part); node = node.parentElement;
        }
        return path.join(' > ');
      }

      function getScroll() {
        try {
          var doc = document.documentElement, body = document.body;
          var top = window.pageYOffset || doc.scrollTop || body.scrollTop;
          var h = Math.max(body.scrollHeight, body.offsetHeight, doc.clientHeight, doc.scrollHeight, doc.offsetHeight);
          var vp = window.innerHeight;
          return h <= vp ? 100 : Math.round((top / (h - vp)) * 100);
        } catch(e){ return 0; }
      }

      function buildDataAttrs(el) {
        try {
          if (!el.dataset) return null;
          var obj = {}, keys = Object.keys(el.dataset);
          if (!keys.length) return null;
          keys.slice(0, 10).forEach(function(k){ obj[k] = el.dataset[k]; });
          return obj;
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
      window.addEventListener('pagehide',     flushWithDuration);

      // Click
      document.addEventListener('click', function(e){ enqueue('click', e.target); });

      // Hover
      var hoverTimer = null, curEl = null;
      document.addEventListener('mouseover', function(e) {
        curEl = e.target; clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function(){
          if (curEl === e.target) enqueue('hover', e.target);
        }, HOVER_DELAY);
      });

      // Rage click
      var RAGE_WIN = 600, RAGE_MIN = 3, rageTarget = null, rageN = 0, rageTimer = null;
      document.addEventListener('click', function(e) {
        var el = findMeaningful(e.target);
        if (!el) return;
        if (el === rageTarget) {
          rageN++;
          if (rageN >= RAGE_MIN) { enqueue('rage_click', el); rageN = 0; rageTarget = null; clearTimeout(rageTimer); }
        } else { rageTarget = el; rageN = 1; clearTimeout(rageTimer); }
        clearTimeout(rageTimer);
        rageTimer = setTimeout(function(){ rageTarget = null; rageN = 0; }, RAGE_WIN);
      }, true);

      // Focus (form)
      document.addEventListener('focusin', function(e) {
        var tag = e.target && e.target.tagName && e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') enqueue('focus', e.target);
      });

      // Scroll (sampled)
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
     Injects a minimal chatbot into the page. Calls /functions/v1/faq
     which automatically decrements chatbot credits server-side.
  ================================================================ */

  if (cfg.enableChatbot !== false && CHATBOT_KEY) {
    (function initChatbot() {
      var FAQ_URL    = SUPABASE_URL + '/functions/v1/faq';
      var TRANS_URL  = SUPABASE_URL + '/functions/v1/transcribe';
      var COLOR      = '#6366f1';
      var GRAD       = 'linear-gradient(135deg,' + COLOR + 'f5,' + COLOR + 'cc)';

      /* ── CSS ───────────────────────────────────────────────── */
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
        '@keyframes hv-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}',
      ].join('');
      document.head.appendChild(style);

      /* ── DOM ───────────────────────────────────────────────── */
      var wrap = document.createElement('div'); wrap.id = 'hv';
      document.body.appendChild(wrap);

      var msgs = [{ sender: 'bot', text: '👋 Hello! I\'m ' + (cfg.businessName || '') + '\'s AI Assistant. Ask me anything!' }];
      var isOpen = false, isLoading = false, isRec = false, isSttLoad = false;
      var mr = null, chunks = [];

      function render() {
        wrap.innerHTML = '';
        if (!isOpen) {
          var btn = document.createElement('button');
          btn.id = 'hv-btn';
          btn.innerHTML = '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
          btn.onclick = function(){ isOpen = true; render(); };
          wrap.appendChild(btn);
          return;
        }

        var win = document.createElement('div'); win.id = 'hv-win';

        // Header
        var hdr = document.createElement('div'); hdr.id = 'hv-hdr';
        hdr.innerHTML = '<div style="display:flex;align-items:center;gap:9px">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;border:1.5px solid rgba(255,255,255,.3)">🤖</div>' +
          '<div><div style="font-size:13px;font-weight:700">' + esc(cfg.businessName || 'AI Assistant') + '</div>' +
          '<div style="font-size:10px;opacity:.85;display:flex;align-items:center;gap:4px"><span style="width:5px;height:5px;background:#4ade80;border-radius:50%;display:inline-block"></span>Online · FAQ AI</div></div></div>';
        var ctrl = document.createElement('div'); ctrl.id = 'hv-ctrl';
        var closeBtn = document.createElement('button'); closeBtn.textContent = '✕';
        closeBtn.onclick = function(){ isOpen = false; render(); };
        ctrl.appendChild(closeBtn); hdr.appendChild(ctrl); win.appendChild(hdr);

        // Messages
        var msgsEl = document.createElement('div'); msgsEl.id = 'hv-msgs';
        msgs.forEach(function(m){
          var b = document.createElement('div');
          b.className = 'hv-bubble hv-' + m.sender;
          b.style.animation = 'hv-slide .25s ease both';
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
          if (t && !isLoading) send(t);
        };

        var foot = document.createElement('p');
        foot.style.cssText = 'font-size:9px;color:#cbd5e1;text-align:center;margin-top:5px;letter-spacing:.3px';
        foot.textContent = '💬 HAVY FAQ AI · 🎙 STT credits tracked';
        iw.appendChild(form); iw.appendChild(foot); win.appendChild(iw);
        wrap.appendChild(win);
        setTimeout(function(){ inp.focus(); }, 40);
      }

      function addMsg(sender, text) {
        msgs.push({ sender: sender, text: text }); render();
      }

      function send(text) {
        msgs.push({ sender: 'user', text: text });
        isLoading = true; render();
        var hdrs = { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY };
        fetch(FAQ_URL, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ question: text, chatbot_key: CHATBOT_KEY }),
        }).then(function(r){ return r.json(); }).then(function(d){
          var ans = d.error === 'credit_limit_reached'
            ? '⚠️ Monthly chatbot limit reached.'
            : (d.answer || "I don't have a specific answer for that. Please contact us!");
          msgs.push({ sender: 'bot', text: ans });
          isLoading = false; render();
        }).catch(function(){
          msgs.push({ sender: 'bot', text: '⚠️ Connection error. Please try again.' });
          isLoading = false; render();
        });
      }

      /* ── Mic / STT via Supabase /transcribe edge function ── */
      function toggleMic() {
        if (isRec) {
          if (mr) { mr.stop(); mr = null; }
          isRec = false; render();
        } else {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
            var rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunks = [];
            rec.ondataavailable = function(e){ if(e.data.size > 0) chunks.push(e.data); };
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
                else if (d.error && d.error.indexOf('Credit') >= 0) {
                  addMsg('bot', '⚠️ Speech-to-Text credits exhausted. Upgrade your plan.');
                }
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

      render();
    })();
  }

})();
