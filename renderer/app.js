const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const progressWrap = $("progressWrap");
const progressBar = $("progressBar");
const progressText = $("progressText");
const passwordBox = $("passwordBox");
const adminPasswordEl = $("adminPassword");
const btnOpenTrader = $("btnOpenTrader");
const uploadSummary = $("uploadSummary");

btnOpenTrader.addEventListener("click", () => {
  window.desktopAPI.openOpentrader();
});

adminPasswordEl.addEventListener("click", () => {
  const text = adminPasswordEl.textContent;
  if (text) navigator.clipboard?.writeText(text);
});

window.desktopAPI.onEvent((payload) => {
  if (payload.type === "status") {
    statusEl.textContent = payload.message;
    return;
  }

  if (payload.type === "ready") {
    statusEl.textContent = payload.message;
    passwordBox.hidden = false;
    adminPasswordEl.textContent = payload.adminPassword;
    btnOpenTrader.disabled = false;
    return;
  }

  if (payload.type === "fatal") {
    statusEl.textContent = payload.message;
    uploadSummary.hidden = false;
    uploadSummary.textContent = payload.message;
    uploadSummary.classList.add("error");
    return;
  }

  if (payload.type === "upload-progress") {
    progressWrap.hidden = false;
    progressText.textContent = payload.message;
    if (payload.total) {
      const pct = Math.round(((payload.current || 0) / payload.total) * 100);
      progressBar.style.setProperty("--pct", `${pct}%`);
    } else {
      progressBar.style.setProperty("--pct", "30%");
    }
    return;
  }

  if (payload.type === "upload-complete") {
    const { result } = payload;
    uploadSummary.hidden = false;
    uploadSummary.classList.remove("error");
    uploadSummary.textContent = `Uploaded ${result.uploaded} of ${result.fileCount} file(s).`;
    progressBar.style.setProperty("--pct", "100%");
    return;
  }

  if (payload.type === "upload-error") {
    uploadSummary.hidden = false;
    uploadSummary.classList.add("error");
    uploadSummary.textContent = payload.message;
  }
});

window.desktopAPI.getStartupState().then((state) => {
  if (state?.adminPassword) {
    passwordBox.hidden = false;
    adminPasswordEl.textContent = state.adminPassword;
  }
});
