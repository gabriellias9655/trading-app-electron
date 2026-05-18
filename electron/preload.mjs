import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopAPI", {
  getStartupState: () => ipcRenderer.invoke("startup-state"),
  openOpentrader: () => ipcRenderer.invoke("open-opentrader"),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-event", listener);
    return () => ipcRenderer.removeListener("desktop-event", listener);
  },
});
