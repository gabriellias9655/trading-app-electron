const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  notifySplashReady: () => ipcRenderer.send("splash-ready"),
  needsPasswordSetup: () => ipcRenderer.invoke("needs-password-setup"),
  saveAdminPassword: (password, confirm) =>
    ipcRenderer.invoke("save-admin-password", { password, confirm }),
  getStartupState: () => ipcRenderer.invoke("startup-state"),
  openOpentrader: () => ipcRenderer.invoke("open-opentrader"),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-event", listener);
    return () => ipcRenderer.removeListener("desktop-event", listener);
  },
});
