(function initYieldlyXDashboardIcons() {
  if (window.yxDashboardIconsReady) return;

  /** Match sidebar items by visible label first, then URL. */
  const NAV_ITEMS = [
    {
      icon: "bot",
      match(link) {
        const text = linkText(link);
        if (/^bots?$/i.test(text) || /trading\s*bots?/i.test(text)) return true;
        return /\/dashboard\/bot(?:\/|$|\?|#)/i.test(linkHref(link));
      },
    },
    {
      icon: "exchanges",
      match(link) {
        const text = linkText(link);
        if (/exchange/i.test(text) || /accounts?/i.test(text)) return true;
        return /\/dashboard\/accounts?(?:\/|$|\?|#)/i.test(linkHref(link));
      },
    },
    {
      icon: "settings",
      match(link) {
        const text = linkText(link);
        if (/^settings?$/i.test(text)) return true;
        return /\/dashboard\/settings?(?:\/|$|\?|#)/i.test(linkHref(link));
      },
    },
  ];

  function linkHref(link) {
    return (
      link.getAttribute("href") ||
      link.closest("a")?.getAttribute("href") ||
      window.location.hash ||
      ""
    );
  }

  function linkText(link) {
    const row = link.closest('[class*="ListItemButton"]') || link;
    return (row.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isSidebarNav(link) {
    if (!link.closest("#root")) return false;
    if (link.closest("#mypro-chrome-root, #mypro-notify-root")) return false;
    return Boolean(
      link.closest('[class*="ListItemButton"]') ||
        link.closest("nav") ||
        link.closest("aside")
    );
  }

  function hideGithubFooter() {
    const root = document.getElementById("root");
    if (!root) return;

    root.querySelectorAll('a[href*="github.com/bludnic/opentrader"]').forEach((link) => {
      const row =
        link.closest('[class*="ListItemButton"]') ||
        link.closest("li") ||
        link.parentElement;
      if (row) row.setAttribute("data-yx-hidden", "github");
    });
  }

  function resolveIcon(link) {
    for (const item of NAV_ITEMS) {
      if (item.match(link)) return item.icon;
    }
    return null;
  }

  function patchNavIcons() {
    const root = document.getElementById("root");
    if (!root || typeof window.yxIcon !== "function") return;

    root.querySelectorAll("a[href]").forEach((link) => {
      if (!isSidebarNav(link)) return;

      const iconName = resolveIcon(link);
      if (!iconName) return;

      const row = link.closest('[class*="ListItemButton"]') || link;
      const slot =
        row.querySelector('[class*="ListItemDecorator"]') ||
        row.querySelector(":scope > span:first-child");
      if (!slot) return;

      const svg = window.yxIcon(iconName);
      if (!svg || slot.getAttribute("data-yx-icon") === iconName) return;

      slot.innerHTML = svg;
      slot.classList.add("yx-icon-slot");
      slot.setAttribute("data-yx-icon", iconName);
    });
  }

  function run() {
    hideGithubFooter();
    patchNavIcons();
  }

  run();

  const observer = new MutationObserver(() => {
    requestAnimationFrame(run);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.yxDashboardIconsReady = true;
})();
