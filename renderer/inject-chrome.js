(function initMyProChrome() {
  if (document.getElementById("mypro-chrome-root")) return;

  if (!document.getElementById("mypro-fonts")) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    const fonts = document.createElement("link");
    fonts.id = "mypro-fonts";
    fonts.rel = "stylesheet";
    fonts.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.append(preconnect1, preconnect2, fonts);
  }

  const HELP_SECTIONS = [
    {
      id: "start",
      title: "Getting started",
      body: `<p>Welcome to <strong>YieldlyX</strong>. This dashboard is powered by OpenTrader on your computer — no cloud account required for the engine.</p>
        <ol>
          <li>Wait for the status dot in the top bar to show <strong>Online</strong>.</li>
          <li>Sign in with your <strong>local admin password</strong> when prompted.</li>
          <li>Connect an exchange under <strong>Accounts</strong> before placing live trades.</li>
        </ol>`,
    },
    {
      id: "exchange",
      title: "Connect an exchange",
      body: `<p>Go to <strong>Accounts</strong> in the sidebar and add your exchange (Binance, Bybit, OKX, etc.).</p>
        <ul>
          <li>Create API keys on your exchange with <strong>Spot/Futures trade</strong> permission only.</li>
          <li><strong>Never</strong> enable withdrawal permission on keys used for bots.</li>
          <li>Use IP whitelist if your exchange supports it (optional).</li>
          <li>Label keys clearly (e.g. "YieldlyX Desktop") so you can revoke them later.</li>
        </ul>`,
    },
    {
      id: "strategies",
      title: "Strategies & bots",
      body: `<p>OpenTrader supports grid bots, DCA, RSI, and custom strategies.</p>
        <ul>
          <li>Pick a strategy that matches your market (ranging → grid; trending → DCA/RSI).</li>
          <li>Set position size as a small % of portfolio when testing.</li>
          <li>Define max drawdown / stop conditions before starting.</li>
          <li>Custom strategies can be added to your local <code>strategies</code> folder (see app data path in settings).</li>
        </ul>`,
    },
    {
      id: "orders",
      title: "Orders & positions",
      body: `<p>Monitor open orders and positions from the dashboard. Confirm:</p>
        <ul>
          <li>Correct trading pair (e.g. BTC/USDT).</li>
          <li>Expected side (buy/sell) and quantity.</li>
          <li>Fees and slippage on partial fills.</li>
        </ul>
        <p>Pause or stop bots before major news events or exchange maintenance.</p>`,
    },
    {
      id: "risk",
      title: "Risk management",
      body: `<ul>
          <li>Only trade with capital you can afford to lose.</li>
          <li>Use stop-losses or bot-level risk limits where available.</li>
          <li>Avoid running multiple aggressive bots on the same pair.</li>
          <li>Keep YieldlyX open while bots are active — closing it stops the local engine.</li>
        </ul>`,
    },
    {
      id: "security",
      title: "Security",
      body: `<ul>
          <li>Your admin password is stored only on this device.</li>
          <li>Trading runs on <strong>127.0.0.1</strong> — not exposed to the internet by default.</li>
          <li>Do not share API keys or your admin password.</li>
          <li>Update the app when new versions are released.</li>
        </ul>`,
    },
    {
      id: "troubleshoot",
      title: "Troubleshooting",
      body: `<ul>
          <li><strong>Engine offline</strong> — restart YieldlyX; ensure port 8000 is free.</li>
          <li><strong>Login failed</strong> — use the password shown at startup (click to copy on splash).</li>
          <li><strong>Order rejected</strong> — check API permissions, balance, and min order size.</li>
          <li><strong>Bot not trading</strong> — verify exchange connection and strategy parameters.</li>
        </ul>`,
    },
  ];

  const style = document.createElement("style");
  style.textContent = `
    #mypro-chrome-root {
      --bar-h: 56px;
      --mp-violet: #7c6cff;
      --mp-teal: #2ee6c5;
      font-family: "Inter", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
    }
    html[data-joy-color-scheme="dark"] #mypro-chrome-root {
      --mp-text: #f4f2ff;
      --mp-muted: #9b97b8;
      --mp-bar-bg: linear-gradient(180deg, rgba(20,19,42,0.96) 0%, rgba(12,11,22,0.92) 100%);
      --mp-bar-border: rgba(124,108,255,0.25);
      --mp-help-bg: linear-gradient(165deg, #14132a 0%, #0c0b16 50%, #07060f 100%);
      --mp-help-backdrop: rgba(7,6,15,0.7);
      --mp-shadow: rgba(0,0,0,0.55);
      --mp-help-heading: linear-gradient(135deg, #f4f2ff, var(--mp-teal));
      --mp-help-strong: #e8e5f5;
      --mp-help-nav-bg: rgba(26,24,52,0.9);
      --mp-help-nav-hover-bg: rgba(46,230,197,0.1);
      --mp-help-close-bg: rgba(26,24,52,0.8);
      --mp-help-code-bg: rgba(124,108,255,0.15);
      --mp-help-code-fg: var(--mp-teal);
      --mp-help-code-border: rgba(46,230,197,0.2);
      --mp-help-divider: rgba(157,143,255,0.12);
    }
    html[data-joy-color-scheme="light"] #mypro-chrome-root {
      --mp-text: #1a1730;
      --mp-muted: #3d3958;
      --mp-bar-bg: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,249,252,0.92) 100%);
      --mp-bar-border: rgba(124,108,255,0.22);
      --mp-help-bg: linear-gradient(165deg, #ffffff 0%, #f4f3f8 50%, #faf9fc 100%);
      --mp-help-backdrop: rgba(26,23,48,0.35);
      --mp-shadow: rgba(124,108,255,0.15);
      --mp-help-heading: none;
      --mp-help-strong: #1a1730;
      --mp-help-nav-bg: #ffffff;
      --mp-help-nav-hover-bg: rgba(124,108,255,0.1);
      --mp-help-close-bg: #edeaf8;
      --mp-help-code-bg: rgba(124,108,255,0.12);
      --mp-help-code-fg: #4a3db8;
      --mp-help-code-border: rgba(124,108,255,0.28);
      --mp-help-divider: rgba(124,108,255,0.2);
    }
    html[data-joy-color-scheme="light"] #mypro-topbar .brand {
      background: none;
      -webkit-background-clip: unset;
      background-clip: unset;
      color: #1a1730;
      animation: none;
    }
    html[data-joy-color-scheme="light"] #mypro-topbar .brand svg {
      color: #5b4ccc;
      filter: none;
    }
    html[data-joy-color-scheme="dark"] #mypro-topbar .brand svg {
      color: var(--mp-teal);
    }
    @keyframes mp-bar-in {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes mp-dot-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.75; transform: scale(1.1); }
    }
    @keyframes mp-brand-shine {
      0%, 100% { background-position: 0% center; }
      50% { background-position: 100% center; }
    }
    @keyframes mp-help-in {
      from { opacity: 0; transform: translateX(16px); }
      to { opacity: 1; transform: translateX(0); }
    }
    #mypro-topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      height: var(--bar-h); min-height: var(--bar-h); max-height: var(--bar-h);
      display: flex; align-items: center; gap: 14px;
      padding: 0 18px; box-sizing: border-box;
      background: var(--mp-bar-bg);
      border-bottom: 1px solid var(--mp-bar-border);
      backdrop-filter: blur(20px) saturate(1.2);
      animation: mp-bar-in 0.5s cubic-bezier(0.4,0,0.2,1) both;
    }
    #mypro-topbar::after {
      content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, var(--mp-teal), var(--mp-violet), transparent);
      opacity: 0.6;
    }
    #mypro-topbar .brand {
      display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px;
      background: linear-gradient(135deg, #f4f2ff 20%, var(--mp-teal) 60%, var(--mp-violet) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; background-clip: text; color: transparent;
      animation: mp-brand-shine 6s ease-in-out infinite;
    }
    #mypro-topbar .brand svg {
      width: 24px; height: 24px; color: var(--mp-teal);
    }
    #mypro-topbar .status {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
      color: var(--mp-muted); margin-left: auto; font-weight: 500;
    }
    #mypro-topbar .status-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: linear-gradient(135deg, #2ee6c5, #3ee8a5);
      animation: mp-dot-glow 2.2s ease-in-out infinite;
    }
    #mypro-chrome-root .yx-icon {
      width: 20px; height: 20px; display: block; flex-shrink: 0;
    }
    #mypro-topbar .brand .yx-icon { width: 22px; height: 22px; color: var(--mp-teal); }
    #mypro-btn-theme {
      width: 40px; height: 40px; padding: 0; border-radius: 12px;
      border: 1px solid var(--mp-bar-border);
      background: color-mix(in srgb, var(--mp-violet) 12%, transparent);
      color: var(--mp-text);
      cursor: pointer; flex-shrink: 0;
      display: grid; place-items: center;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }
    #mypro-btn-theme:hover {
      background: color-mix(in srgb, var(--mp-violet) 22%, transparent);
      border-color: var(--mp-violet);
      transform: scale(1.05);
    }
    #mypro-btn-help {
      padding: 9px 16px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, var(--mp-violet) 0%, #5b4ccc 100%);
      color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    #mypro-btn-help .yx-icon { width: 18px; height: 18px; opacity: 0.95; }
    #mypro-btn-help:hover {
      transform: translateY(-2px) scale(1.02);
    }
    #mypro-help-backdrop {
      position: fixed; inset: 0; z-index: 2147483647;
      background: var(--mp-help-backdrop);
      backdrop-filter: blur(8px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.35s ease;
    }
    #mypro-help-backdrop.is-open { opacity: 1; pointer-events: auto; }
    #mypro-help-panel {
      position: fixed; top: 0; right: 0; z-index: 2147483647;
      width: min(440px, 100vw); height: 100%; max-height: 100vh;
      background: var(--mp-help-bg);
      border-left: 1px solid var(--mp-bar-border);
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.32,0.72,0,1);
      display: flex; flex-direction: column; overflow: hidden;
    }
    #mypro-help-panel.is-open { transform: translateX(0); }
    #mypro-help-header {
      padding: 22px 20px 14px; border-bottom: 1px solid var(--mp-help-divider);
      flex-shrink: 0;
      background: linear-gradient(180deg, rgba(124,108,255,0.08) 0%, transparent 100%);
    }
    #mypro-help-header h2 {
      margin: 0 0 6px; font-size: 1.3rem; font-weight: 700;
      color: var(--mp-text);
    }
    html[data-joy-color-scheme="dark"] #mypro-help-header h2 {
      background: var(--mp-help-heading);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    #mypro-help-header p { margin: 0; font-size: 0.85rem; color: var(--mp-muted); }
    #mypro-help-close {
      position: absolute; top: 18px; right: 16px; width: 38px; height: 38px;
      border: 1px solid var(--mp-help-divider); border-radius: 12px;
      background: var(--mp-help-close-bg); color: var(--mp-text);
      cursor: pointer; padding: 0;
      display: grid; place-items: center;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }
    #mypro-help-close:hover {
      background: rgba(124,108,255,0.2); border-color: var(--mp-violet);
      transform: scale(1.05);
    }
    #mypro-help-nav {
      display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px;
      border-bottom: 1px solid var(--mp-help-divider); flex-shrink: 0;
    }
    #mypro-help-nav button {
      padding: 7px 12px; border-radius: 10px;
      border: 1px solid var(--mp-help-divider);
      background: var(--mp-help-nav-bg); color: var(--mp-muted);
      font-size: 11px; font-weight: 500; cursor: pointer;
      transition: all 0.2s ease;
    }
    #mypro-help-nav button:hover {
      border-color: var(--mp-violet); color: var(--mp-text);
      background: var(--mp-help-nav-hover-bg);
    }
    #mypro-help-nav button.is-active {
      border-color: var(--mp-violet); color: #fff;
      background: linear-gradient(135deg, rgba(124,108,255,0.35), rgba(46,230,197,0.15));
    }
    html[data-joy-color-scheme="light"] #mypro-help-nav button.is-active {
      background: linear-gradient(135deg, #7c6cff, #5b4ccc);
    }
    #mypro-help-content {
      flex: 1; overflow-y: auto; padding: 18px 20px 32px;
      animation: mp-help-in 0.35s ease both;
    }
    #mypro-help-content h3 {
      margin: 0 0 12px; font-size: 1.05rem; color: var(--mp-text);
    }
    #mypro-help-content p, #mypro-help-content li {
      font-size: 0.88rem; line-height: 1.6; color: var(--mp-muted);
    }
    #mypro-help-content ul, #mypro-help-content ol {
      margin: 0 0 14px; padding-left: 1.25em;
    }
    #mypro-help-content code {
      background: var(--mp-help-code-bg); padding: 3px 8px; border-radius: 6px;
      color: var(--mp-help-code-fg); font-size: 0.82em;
      border: 1px solid var(--mp-help-code-border);
    }
    #mypro-help-content strong { color: var(--mp-help-strong); font-weight: 600; }
    #mypro-help-content a { color: var(--mp-violet); }
    @media (prefers-reduced-motion: reduce) {
      #mypro-topbar, #mypro-topbar .brand, #mypro-topbar .status-dot { animation: none !important; }
    }
  `;

  const ic = (name) =>
    typeof window.yxIcon === "function" ? window.yxIcon(name) : "";

  const root = document.createElement("div");
  root.id = "mypro-chrome-root";

  const topbar = document.createElement("header");
  topbar.id = "mypro-topbar";
  topbar.innerHTML = `
    <div class="brand">
      ${ic("brand")}
      YieldlyX
    </div>
    <div class="status"><span class="status-dot"></span> Engine online</div>
    <button type="button" id="mypro-btn-theme" aria-label="Toggle light/dark theme" title="Toggle theme">${ic("sun")}</button>
    <button type="button" id="mypro-btn-help">${ic("help")}<span>Help &amp; guide</span></button>
  `;

  const backdrop = document.createElement("div");
  backdrop.id = "mypro-help-backdrop";

  const panel = document.createElement("aside");
  panel.id = "mypro-help-panel";
  panel.innerHTML = `
    <div id="mypro-help-header" style="position:relative">
      <button type="button" id="mypro-help-close" aria-label="Close help"></button>
      <h2>Trading guide</h2>
      <p>Step-by-step help for using OpenTrader in YieldlyX</p>
    </div>
    <nav id="mypro-help-nav"></nav>
    <div id="mypro-help-content"></div>
  `;

  root.appendChild(style);
  root.appendChild(topbar);
  root.appendChild(backdrop);
  root.appendChild(panel);
  document.documentElement.appendChild(root);

  const nav = document.getElementById("mypro-help-nav");
  const content = document.getElementById("mypro-help-content");
  const btnHelp = document.getElementById("mypro-btn-help");
  const btnTheme = document.getElementById("mypro-btn-theme");
  const btnClose = document.getElementById("mypro-help-close");
  if (btnClose) btnClose.innerHTML = ic("close");

  function syncThemeIcon() {
    if (!btnTheme) return;
    const mode =
      typeof window.myproGetTheme === "function"
        ? window.myproGetTheme()
        : document.documentElement.getAttribute("data-joy-color-scheme") || "dark";
    btnTheme.innerHTML = mode === "light" ? ic("sun") : ic("moon");
    btnTheme.title = mode === "light" ? "Switch to dark mode" : "Switch to light mode";
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      if (typeof window.myproToggleTheme === "function") {
        window.myproToggleTheme();
      }
      syncThemeIcon();
    });
    document.addEventListener("mypro-theme-change", syncThemeIcon);
    syncThemeIcon();
  }

  function showSection(id) {
    const section = HELP_SECTIONS.find((s) => s.id === id) || HELP_SECTIONS[0];
    content.style.animation = "none";
    content.offsetHeight;
    content.style.animation = "";
    content.innerHTML = `<h3>${section.title}</h3>${section.body}`;
    nav.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.id === section.id);
    });
  }

  HELP_SECTIONS.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.title;
    btn.dataset.id = s.id;
    btn.addEventListener("click", () => showSection(s.id));
    nav.appendChild(btn);
  });

  function openHelp() {
    backdrop.classList.add("is-open");
    panel.classList.add("is-open");
    showSection(HELP_SECTIONS[0].id);
  }

  function closeHelp() {
    backdrop.classList.remove("is-open");
    panel.classList.remove("is-open");
  }

  btnHelp.addEventListener("click", openHelp);
  btnClose.addEventListener("click", closeHelp);
  backdrop.addEventListener("click", closeHelp);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeHelp();
  });

  showSection(HELP_SECTIONS[0].id);

  document.documentElement.style.setProperty("--mypro-chrome-h", "56px");
})();
