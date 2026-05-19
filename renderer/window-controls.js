(function initWindowControls() {
  if (window.yxInitWindowControls) return;
  window.yxInitWindowControls = true;

  const api = window.desktopAPI;
  if (!api?.windowMinimize) return;

  function bindControls(root) {
    const minBtn = root.querySelector("[data-yx-win-min]");
    const maxBtn = root.querySelector("[data-yx-win-max]");
    const closeBtn = root.querySelector("[data-yx-win-close]");
    if (!minBtn || !maxBtn || !closeBtn) return;
    if (minBtn.dataset.yxBound) return;
    minBtn.dataset.yxBound = "1";
    maxBtn.dataset.yxBound = "1";
    closeBtn.dataset.yxBound = "1";

    const ic = (name) =>
      typeof window.yxIcon === "function" ? window.yxIcon(name) : "";

    minBtn.innerHTML = ic("minimize");
    closeBtn.innerHTML = ic("close");

    async function syncMaxIcon() {
      const maxed = await api.windowIsMaximized();
      maxBtn.innerHTML = ic(maxed ? "restore" : "maximize");
      maxBtn.setAttribute(
        "aria-label",
        maxed ? "Restore window" : "Maximize window"
      );
    }

    minBtn.addEventListener("click", () => api.windowMinimize());
    maxBtn.addEventListener("click", async () => {
      await api.windowMaximize();
      syncMaxIcon();
    });
    closeBtn.addEventListener("click", () => api.windowClose());

    syncMaxIcon();
    window.addEventListener("resize", () => {
      syncMaxIcon();
    });
  }

  window.yxBindWindowControls = bindControls;
  bindControls(document);
})();
