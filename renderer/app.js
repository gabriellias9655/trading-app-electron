const $ = (id) => document.getElementById(id);

const setupPasswordBox = $("setupPasswordBox");
const mainContent = $("mainContent");
const setupPassword = $("setupPassword");
const setupPasswordConfirm = $("setupPasswordConfirm");
const setupError = $("setupError");
const btnSavePassword = $("btnSavePassword");

const statusEl = $("status");
const statusCard = document.querySelector(".status-card");
const progressTrack = $("progressTrack");
const progressFill = $("progressFill");
const passwordBox = $("passwordBox");
const adminPasswordEl = $("adminPassword");
const btnOpenTrader = $("btnOpenTrader");
const errorNotice = $("errorNotice");
const btnToggleGuide = $("btnToggleGuide");
const guideBody = $("guideBody");

let progressValue = 8;

function showSetupForm() {
  setupPasswordBox.hidden = false;
  mainContent.hidden = true;
  setupPassword.focus();
}

function showMainContent() {
  setupPasswordBox.hidden = true;
  mainContent.hidden = false;
}

function showSetupError(message) {
  setupError.hidden = false;
  setupError.textContent = message;
}

function clearSetupError() {
  setupError.hidden = true;
  setupError.textContent = "";
}

function setStatus(message) {
  statusEl.classList.add("is-changing");
  requestAnimationFrame(() => {
    statusEl.textContent = message;
    statusEl.classList.remove("is-changing");
  });
}

function setProgress(pct, { indeterminate = false } = {}) {
  progressTrack.hidden = false;
  progressFill.classList.toggle("indeterminate", indeterminate);
  if (!indeterminate) {
    progressValue = Math.min(100, Math.max(0, pct));
    progressFill.style.width = `${progressValue}%`;
  }
}

function bumpProgress(amount = 12) {
  setProgress(Math.min(progressValue + amount, 92));
}

function markReady() {
  statusCard?.classList.add("is-ready");
  setProgress(100);
  progressFill.classList.remove("indeterminate");
}

function showError(message) {
  errorNotice.hidden = false;
  errorNotice.textContent = message;
  setProgress(0);
  progressFill.classList.remove("indeterminate");
}

btnToggleGuide.addEventListener("click", () => {
  const collapsed = guideBody.classList.toggle("is-collapsed");
  btnToggleGuide.textContent = collapsed ? "Show" : "Hide";
  btnToggleGuide.setAttribute("aria-expanded", String(!collapsed));
});

async function init() {
  setProgress(8, { indeterminate: true });
  const needsSetup = await window.desktopAPI.needsPasswordSetup();
  if (needsSetup) {
    showSetupForm();
    return;
  }
  showMainContent();
}

btnSavePassword.addEventListener("click", async () => {
  clearSetupError();
  btnSavePassword.disabled = true;

  const result = await window.desktopAPI.saveAdminPassword(
    setupPassword.value,
    setupPasswordConfirm.value
  );

  btnSavePassword.disabled = false;

  if (!result.ok) {
    showSetupError(result.error || "Could not save password.");
    return;
  }

  showMainContent();
  setStatus("Password saved. Starting trading engine…");
  bumpProgress(20);
});

setupPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnSavePassword.click();
});
setupPasswordConfirm.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnSavePassword.click();
});

btnOpenTrader.addEventListener("click", () => {
  window.desktopAPI.openOpentrader();
});

adminPasswordEl.addEventListener("click", () => {
  const text = adminPasswordEl.textContent;
  if (text) navigator.clipboard?.writeText(text);
});

window.desktopAPI.onEvent((payload) => {
  if (payload.type === "setup-password") {
    showSetupForm();
    return;
  }

  showMainContent();

  if (payload.type === "status") {
    setStatus(payload.message);
    bumpProgress(8);
    setProgress(progressValue, { indeterminate: /waiting|starting|preparing|creating/i.test(payload.message) });
    return;
  }

  if (payload.type === "ready") {
    setStatus(payload.message);
    markReady();
    passwordBox.hidden = false;
    adminPasswordEl.textContent = payload.adminPassword;
    btnOpenTrader.disabled = false;
    return;
  }

  if (payload.type === "fatal") {
    setStatus("Could not start trading engine");
    showError(payload.message);
    return;
  }

  /* Background upload events — no UI on splash */
});

window.desktopAPI.notifySplashReady();

window.desktopAPI.getStartupState().then((state) => {
  if (state?.adminPassword) {
    showMainContent();
    markReady();
    passwordBox.hidden = false;
    adminPasswordEl.textContent = state.adminPassword;
    btnOpenTrader.disabled = false;
    setStatus("Trading engine is ready.");
  }
});

init();
