/**
 * HAVY Chatbot Widget — Embeddable Script
 * Drop into any website's <head>. No React, no dependencies.
 * chatboticon.gif is served from HAVY's origin so it resolves on ALL client sites.
 */

(function () {
  "use strict";

  if (!window.HAVYChatbotConfig) {
    console.error("HAVYChatbotConfig is not defined.");
    return;
  }

  const config       = window.HAVYChatbotConfig;
  const chatbotKey   = config.chatbotKey   || "";
  const businessName = config.businessName || "";
  const position     = config.position     || "bottom-right";
  const primaryColor = config.primaryColor || "#6366f1";
  // HAVY_ORIGIN = where the GIF lives. Auto-detected or can be overridden.
  const HAVY_ORIGIN  = config.havyOrigin   || "https://havyfourthdraft.vercel.app";
  const SUPABASE_URL = config.supabaseUrl  || "https://knactizuxbxjrwiduedv.supabase.co";
  const ANON_KEY     = config.anonKey      || "";

  const FAQ_API = `${SUPABASE_URL}/functions/v1/faq`;
  const GIF_URL = `${HAVY_ORIGIN}/chatboticon.gif`;

  /* ─── SVG robot fallback (rendered if GIF fails) ─────────────────── */
  const BOT_SVG = `<svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="18" width="36" height="28" rx="6" fill="white" fill-opacity=".9"/>
    <line x1="32" y1="18" x2="32" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="8" r="3" fill="white"/>
    <circle cx="23" cy="30" r="4" fill="${primaryColor}" fill-opacity=".65"/>
    <circle cx="41" cy="30" r="4" fill="${primaryColor}" fill-opacity=".65"/>
    <circle cx="24" cy="29" r="1.5" fill="white"/>
    <circle cx="42" cy="29" r="1.5" fill="white"/>
    <path d="M24 38 Q32 44 40 38" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <rect x="20" y="48" width="24" height="10" rx="4" fill="white" fill-opacity=".5"/>
    <rect x="8"  y="22" width="6"  height="16" rx="3" fill="white" fill-opacity=".4"/>
    <rect x="50" y="22" width="6"  height="16" rx="3" fill="white" fill-opacity=".4"/>
  </svg>`;

  /* ─── Creates an img element with SVG fallback ────────────────────── */
  function makeAvatar(px) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `width:${px}px;height:${px}px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;`;
    const img = document.createElement("img");
    img.src = GIF_URL;
    img.alt = "";
    img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;`;
    img.onerror = () => { wrap.innerHTML = BOT_SVG; wrap.style.background = `${primaryColor}cc`; };
    wrap.appendChild(img);
    return wrap;
  }

  /* ─── Styles ─────────────────────────────────────────────────────── */
  const posRight   = position !== "bottom-left";
  const posKey     = posRight ? "right" : "left";
  const styleEl    = document.createElement("style");
  styleEl.textContent = `
    #havy-cw{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #havy-cw *{box-sizing:border-box;margin:0;padding:0}

    .hvbtn{position:fixed;${posKey}:20px;bottom:20px;width:68px;height:68px;border-radius:50%;
      border:none;cursor:pointer;z-index:9999;padding:3px;
      background:radial-gradient(circle at 40% 40%,${primaryColor}ee,${primaryColor}99);
      box-shadow:0 8px 28px -4px ${primaryColor}66,0 2px 8px rgba(0,0,0,.18);
      transition:transform .22s;}
    .hvbtn:hover{transform:scale(1.08)}
    .hvbtn-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.3)}
    .hvdot{position:absolute;bottom:1px;right:1px;width:15px;height:15px;
      background:#34d399;border-radius:50%;border:2.5px solid white;
      animation:hvping 1.6s ease-in-out infinite}
    @keyframes hvping{0%,100%{box-shadow:0 0 0 0 #34d39966}60%{box-shadow:0 0 0 5px #34d39900}}

    .hvwin{position:fixed;${posKey}:20px;bottom:20px;width:380px;border-radius:18px;
      z-index:9999;display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 24px 80px -12px rgba(0,0,0,.32),0 4px 16px rgba(0,0,0,.1);
      transition:height .28s ease}
    .hvwin.open{height:575px}
    .hvwin.mini{height:62px}

    .hvhdr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
      color:white;flex-shrink:0;
      background:linear-gradient(135deg,${primaryColor}f2,${primaryColor}bb)}
    .hvhdr-l{display:flex;align-items:center;gap:10px}
    .hvname{font-weight:600;font-size:13.5px;line-height:1.35}
    .hvstat{font-size:11px;opacity:.8;display:flex;align-items:center;gap:4px;margin-top:1px}
    .hvstatdot{width:6px;height:6px;background:#34d399;border-radius:50%;
      animation:hvping2 1.3s ease-in-out infinite}
    @keyframes hvping2{0%,100%{opacity:1}50%{opacity:.4}}
    .hvctrl{display:flex;gap:2px}
    .hvctrl button{background:transparent;border:none;color:rgba(255,255,255,.8);
      cursor:pointer;padding:5px 7px;border-radius:7px;font-size:14px;line-height:1}
    .hvctrl button:hover{background:rgba(255,255,255,.18)}

    .hvmsgs{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;
      background:linear-gradient(180deg,#f5f7ff,#fff 60%)}
    .hvrow{display:flex;align-items:flex-end;gap:7px;animation:hvfi .22s ease-out}
    @keyframes hvfi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .hvrow.user{flex-direction:row-reverse}
    .hvbub{max-width:78%;padding:9px 13px;border-radius:16px;font-size:13.5px;line-height:1.5}
    .hvrow.bot .hvbub{background:white;color:#1e293b;border:1px solid #e8ecf4;border-bottom-left-radius:3px}
    .hvrow.user .hvbub{color:white;border-bottom-right-radius:3px;
      background:linear-gradient(135deg,${primaryColor}f2,${primaryColor}bb)}
    .hvtime{font-size:10px;opacity:.5;display:block;margin-top:3px}
    .hvsrc{font-size:10px;color:#818cf8;display:block;margin-top:2px}

    .hvtyping{display:flex;gap:4px;padding:9px 13px;background:white;
      border:1px solid #e8ecf4;border-radius:16px;border-bottom-left-radius:3px;width:54px}
    .hvdt{width:7px;height:7px;border-radius:50%;background:${primaryColor};
      animation:hvb 1.1s infinite}
    .hvdt:nth-child(2){animation-delay:.15s}.hvdt:nth-child(3){animation-delay:.3s}
    @keyframes hvb{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}

    .hvinput{flex-shrink:0;border-top:1px solid #f0f2f8;background:white;padding:9px 12px}
    .hvform{display:flex;gap:7px}
    .hvinp{flex:1;padding:9px 13px;border:1.5px solid #e2e8f0;border-radius:12px;
      font-size:13.5px;outline:none;background:#f8faff;color:#1e293b;transition:border .2s}
    .hvinp:focus{border-color:${primaryColor};background:white}
    .hvsend{padding:9px 11px;border:none;border-radius:12px;cursor:pointer;color:white;
      background:linear-gradient(135deg,${primaryColor}f2,${primaryColor}bb);
      box-shadow:0 2px 8px ${primaryColor}44;transition:transform .15s}
    .hvsend:hover{transform:scale(1.08)}.hvsend:disabled{opacity:.45;cursor:not-allowed;transform:none}
    .hvfooter{font-size:10px;color:#cbd5e1;text-align:center;margin-top:5px;letter-spacing:.02em}

    .hvqr{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
    .hvqr button{font-size:11.5px;padding:4px 11px;border-radius:20px;border:1.5px solid #e2e8f0;
      background:white;cursor:pointer;color:#475569;transition:all .2s}
    .hvqr button:hover{border-color:${primaryColor};color:${primaryColor};background:#eef2ff}
  `;
  document.head.appendChild(styleEl);

  /* ─── DOM wrapper ────────────────────────────────────────────────── */
  const cw = document.createElement("div");
  cw.id = "havy-cw";
  document.body.appendChild(cw);

  /* ─── State ──────────────────────────────────────────────────────── */
  const title = businessName ? `${businessName}'s Assistant` : "AI Assistant";
  let isOpen = false, isMini = false, isLoading = false;
  let msgs = [{
    id: "0", sender: "bot", ts: new Date(),
    text: `Hello! 👋 I'm ${title}. Ask me anything about our products or services.`,
    qr: ["Products", "Help", "Track Order"],
  }];

  /* ─── Render entry ───────────────────────────────────────────────── */
  function render() {
    cw.innerHTML = "";
    isOpen ? renderWin() : renderBtn();
  }

  function renderBtn() {
    const btn = document.createElement("button");
    btn.className = "hvbtn";
    btn.setAttribute("aria-label", "Open assistant");

    const inner = document.createElement("div");
    inner.className = "hvbtn-inner";
    inner.appendChild(makeAvatar(62));
    btn.appendChild(inner);

    const dot = document.createElement("div"); dot.className = "hvdot";
    btn.appendChild(dot);
    btn.onclick = () => { isOpen = true; render(); };
    cw.appendChild(btn);
  }

  function renderWin() {
    const win = document.createElement("div");
    win.className = `hvwin ${isMini ? "mini" : "open"}`;

    /* header */
    const hdr = document.createElement("div"); hdr.className = "hvhdr";
    const hl  = document.createElement("div"); hl.className = "hvhdr-l";
    const av  = makeAvatar(38); av.style.border = "2px solid rgba(255,255,255,.3)";
    hl.appendChild(av);
    const nb = document.createElement("div");
    nb.innerHTML = `<div class="hvname">${esc(title)}</div>
      <div class="hvstat"><span class="hvstatdot"></span> Online · Instant replies</div>`;
    hl.appendChild(nb); hdr.appendChild(hl);

    const ctrl = document.createElement("div"); ctrl.className = "hvctrl";
    const minB = mkBtn(isMini ? "⬆" : "⬇", () => { isMini = !isMini; render(); });
    const clsB = mkBtn("✕", () => { isOpen = false; render(); });
    ctrl.appendChild(minB); ctrl.appendChild(clsB);
    hdr.appendChild(ctrl); win.appendChild(hdr);

    if (!isMini) {
      /* messages */
      const msgsEl = document.createElement("div"); msgsEl.className = "hvmsgs";
      msgs.forEach(m => msgsEl.appendChild(makeRow(m)));
      if (isLoading) msgsEl.appendChild(makeTyping());
      win.appendChild(msgsEl);
      setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 25);

      /* input */
      const iw = document.createElement("div"); iw.className = "hvinput";
      const form = document.createElement("form"); form.className = "hvform";
      const inp = document.createElement("input");
      inp.className = "hvinp"; inp.type = "text";
      inp.placeholder = "Ask me anything…"; inp.disabled = isLoading;
      const snd = document.createElement("button");
      snd.className = "hvsend"; snd.type = "submit"; snd.disabled = isLoading;
      snd.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
      form.appendChild(inp); form.appendChild(snd);
      form.onsubmit = e => {
        e.preventDefault();
        const t = inp.value.trim();
        if (t && !isLoading) { send(t); inp.value = ""; }
      };
      const foot = document.createElement("p"); foot.className = "hvfooter";
      foot.textContent = "Powered by HAVY · Secure & Private";
      iw.appendChild(form); iw.appendChild(foot); win.appendChild(iw);
      setTimeout(() => inp.focus(), 40);
    }
    cw.appendChild(win);
  }

  function makeRow(m) {
    const row = document.createElement("div");
    row.className = `hvrow ${m.sender}`;
    if (m.sender === "bot") {
      const av = makeAvatar(26);
      av.style.border = "1px solid #e5e7eb";
      row.appendChild(av);
    }
    const col = document.createElement("div");
    const bub = document.createElement("div"); bub.className = "hvbub";
    bub.innerHTML = `${esc(m.text)}
      ${m.source === "scraped" ? `<span class="hvsrc">⚡ From website</span>` : ""}
      <span class="hvtime">${new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>`;
    col.appendChild(bub);
    if (m.qr && m.sender === "bot") {
      const qrEl = document.createElement("div"); qrEl.className = "hvqr";
      m.qr.forEach(r => {
        const b = document.createElement("button"); b.textContent = r;
        b.onclick = () => send(r); qrEl.appendChild(b);
      });
      col.appendChild(qrEl);
    }
    row.appendChild(col);
    return row;
  }

  function makeTyping() {
    const row = document.createElement("div"); row.className = "hvrow bot";
    const av = makeAvatar(26); av.style.border = "1px solid #e5e7eb";
    row.appendChild(av);
    const t = document.createElement("div"); t.className = "hvtyping";
    [0,1,2].forEach(() => { const d = document.createElement("div"); d.className = "hvdt"; t.appendChild(d); });
    row.appendChild(t); return row;
  }

  function mkBtn(label, cb) {
    const b = document.createElement("button"); b.innerHTML = label; b.onclick = cb; return b;
  }

  /* ─── FAQ call ───────────────────────────────────────────────────── */
  async function send(text) {
    msgs.push({ id: Date.now().toString(), text, sender: "user", ts: new Date() });
    isLoading = true; render();
    try {
      const hdrs = { "Content-Type": "application/json" };
      if (ANON_KEY) { hdrs["apikey"] = ANON_KEY; hdrs["Authorization"] = `Bearer ${ANON_KEY}`; }
      const res  = await fetch(FAQ_API, { method: "POST", headers: hdrs,
        body: JSON.stringify({ question: text, chatbot_key: chatbotKey }) });
      const data = await res.json();
      msgs.push({ id: (Date.now()+1).toString(), sender: "bot", ts: new Date(),
        text: data.answer || "Sorry, I couldn't find an answer for that.", source: data.source });
    } catch {
      msgs.push({ id: (Date.now()+1).toString(), sender: "bot", ts: new Date(),
        text: "Connection error. Please try again." });
    }
    isLoading = false; render();
  }

  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  render();
})();
