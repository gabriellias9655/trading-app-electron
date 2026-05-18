(function initMyProNotify() {
  if (window.myproShowExchangeRequired) return;

  const NOTIFY_STYLES = `
    #mypro-notify-root { font-family: "Inter", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif; }
    #mypro-notify-backdrop {
      position: fixed; inset: 0; z-index: 2147483645;
      background: rgba(7, 6, 15, 0.55);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; box-sizing: border-box;
      opacity: 0; pointer-events: none;
      transition: opacity 0.35s ease;
    }
    #mypro-notify-backdrop.is-visible {
      opacity: 1; pointer-events: auto;
    }
    #mypro-notify-card {
      width: min(400px, 100%);
      padding: 28px 26px 22px;
      border-radius: 20px;
      background: linear-gradient(165deg, #1a1834 0%, #12101f 100%);
      border: 1px solid rgba(124, 108, 255, 0.35);
      text-align: center;
      transform: translateY(16px) scale(0.96);
      transition: transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    }
    #mypro-notify-backdrop.is-visible #mypro-notify-card {
      transform: translateY(0) scale(1);
    }
    #mypro-notify-icon {
      width: 56px; height: 56px; margin: 0 auto 16px;
      border-radius: 16px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, rgba(124,108,255,0.25), rgba(46,230,197,0.15));
      border: 1px solid rgba(46, 230, 197, 0.3);
      color: #2ee6c5;
    }
    #mypro-notify-icon .yx-icon { width: 28px; height: 28px; }
    #mypro-notify-title {
      margin: 0 0 10px; font-size: 1.2rem; font-weight: 700;
      color: #f4f2ff; letter-spacing: -0.02em;
    }
    #mypro-notify-message {
      margin: 0 0 22px; font-size: 0.92rem; line-height: 1.55;
      color: #9b97b8;
    }
    #mypro-notify-message strong { color: #c9c4de; font-weight: 600; }
    #mypro-notify-actions {
      display: flex; flex-direction: column; gap: 10px;
    }
    #mypro-notify-btn-primary {
      width: 100%; padding: 13px 18px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #7c6cff, #5b4ccc);
      color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer;
      transition: transform 0.2s;
    }
    #mypro-notify-btn-primary:hover {
      transform: translateY(-1px);
    }
    #mypro-notify-btn-secondary {
      width: 100%; padding: 10px; border: none; border-radius: 10px;
      background: transparent; color: #7a7694;
      font-size: 0.85rem; cursor: pointer;
      transition: color 0.2s;
    }
    #mypro-notify-btn-secondary:hover { color: #9b97b8; }
    html[data-joy-color-scheme="light"] #mypro-notify-backdrop {
      background: rgba(26, 23, 48, 0.35);
    }
    html[data-joy-color-scheme="light"] #mypro-notify-card {
      background: linear-gradient(165deg, #ffffff 0%, #f4f3f8 100%);
    }
    html[data-joy-color-scheme="light"] #mypro-notify-title { color: #1a1730; }
    html[data-joy-color-scheme="light"] #mypro-notify-message { color: #5c5878; }
    html[data-joy-color-scheme="light"] #mypro-notify-message strong { color: #3d3958; }
    html[data-joy-color-scheme="light"] #mypro-notify-btn-secondary { color: #7a7694; }
  `;

  const root = document.createElement("div");
  root.id = "mypro-notify-root";
  root.innerHTML = `
    <style>${NOTIFY_STYLES}</style>
    <div id="mypro-notify-backdrop" role="dialog" aria-modal="true" aria-labelledby="mypro-notify-title">
      <div id="mypro-notify-card">
        <div id="mypro-notify-icon" aria-hidden="true">◇</div>
        <h2 id="mypro-notify-title"></h2>
        <p id="mypro-notify-message"></p>
        <div id="mypro-notify-actions">
          <button type="button" id="mypro-notify-btn-primary"></button>
          <button type="button" id="mypro-notify-btn-secondary">Maybe later</button>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(root);

  const notifyIcon = document.getElementById("mypro-notify-icon");
  if (notifyIcon && typeof window.yxIcon === "function") {
    notifyIcon.innerHTML = window.yxIcon("link");
  }

  const backdrop = document.getElementById("mypro-notify-backdrop");
  const titleEl = document.getElementById("mypro-notify-title");
  const messageEl = document.getElementById("mypro-notify-message");
  const btnPrimary = document.getElementById("mypro-notify-btn-primary");
  const btnSecondary = document.getElementById("mypro-notify-btn-secondary");

  function hide() {
    backdrop.classList.remove("is-visible");
  }

  function goToAccounts() {
    hide();
    window.location.hash = "/dashboard/accounts";
  }

  btnPrimary.addEventListener("click", goToAccounts);
  btnSecondary.addEventListener("click", hide);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) hide();
  });

  /**
   * @param {{ tabName?: string }} [options]
   */
  window.myproShowExchangeRequired = function (options = {}) {
    const tab = options.tabName || "this section";
    const tabLower = tab.toLowerCase();

    titleEl.textContent = "Connect an exchange to get started";
    messageEl.innerHTML = [
      `You're almost ready to explore <strong>${tab}</strong>.`,
      "To use strategies and trading bots safely, please link an exchange account first.",
      "It only takes a minute — use API keys with <strong>trade</strong> permission only (no withdrawals).",
    ].join(" ");

    btnPrimary.textContent = "Set up exchange account";

    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
    });
  };

  window.myproHideExchangeRequired = hide;
})();
