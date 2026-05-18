(function initMyProTheme() {
  if (window.myproToggleTheme) return;

  const MODE_KEY = "joy-mode";

  function getMode() {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") return stored;
    } catch {
      /* private mode */
    }
    const scheme = document.documentElement.getAttribute("data-joy-color-scheme");
    if (scheme === "light" || scheme === "dark") return scheme;
    return "dark";
  }

  function resolvedScheme(mode) {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }

  /** Notify Joy/MUI useColorScheme (same-tab via synthetic storage event). */
  function notifyJoyModeChange(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* private mode */
    }
    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: MODE_KEY,
          newValue: mode,
          storageArea: localStorage,
        })
      );
    } catch {
      /* older engines */
    }
    const scheme = resolvedScheme(mode);
    document.documentElement.setAttribute("data-joy-color-scheme", scheme);
    document.documentElement.style.colorScheme = scheme;
    document.dispatchEvent(
      new CustomEvent("mypro-theme-change", { detail: { mode: scheme } })
    );
  }

  window.myproGetTheme = function () {
    return resolvedScheme(getMode());
  };

  window.myproToggleTheme = function () {
    const mode = getMode();
    const next =
      mode === "system"
        ? resolvedScheme("system") === "dark"
          ? "light"
          : "dark"
        : mode === "light"
          ? "dark"
          : "light";
    notifyJoyModeChange(next);
  };

  const observer = new MutationObserver(() => {
    document.dispatchEvent(
      new CustomEvent("mypro-theme-change", {
        detail: { mode: window.myproGetTheme() },
      })
    );
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-joy-color-scheme"],
  });

  /** Hide OpenTrader's built-in theme toggle (duplicate of MyPro top bar). */
  const THEME_ICON_PREFIXES = ["M9.27", "M12 9c1.65"];

  function isOpentraderThemeButton(btn) {
    if (!btn || btn.id === "mypro-btn-theme") return false;
    const paths = btn.querySelectorAll("path[d]");
    for (const p of paths) {
      const d = p.getAttribute("d") || "";
      if (THEME_ICON_PREFIXES.some((prefix) => d.startsWith(prefix))) return true;
    }
    return false;
  }

  function hideOpentraderThemeToggle() {
    document.querySelectorAll("#root button").forEach((btn) => {
      if (isOpentraderThemeButton(btn)) {
        btn.hidden = true;
        btn.setAttribute("aria-hidden", "true");
        btn.style.display = "none";
      }
    });
  }

  hideOpentraderThemeToggle();
  const rootObserver = new MutationObserver(hideOpentraderThemeToggle);
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootObserver.observe(rootEl, { childList: true, subtree: true });
  }
})();
