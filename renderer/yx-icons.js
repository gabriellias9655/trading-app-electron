(function initYieldlyXIcons() {
  if (window.yxIcon) return;

  const s =
    'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  function icon(paths, viewBox = "0 0 24 24") {
    return `<svg class="yx-icon" viewBox="${viewBox}" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
  }

  const icons = {
    brand: icon(
      `<path ${s} d="M3 3v18h18"/><path ${s} d="M7 15l4-5 3 3 5-7"/>`
    ),
    bot: icon(
      `<path ${s} d="M12 8V4H8"/><rect x="4" y="9" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/><path ${s} d="M2 14h2"/><path ${s} d="M20 14h2"/><path ${s} d="M9 14v2"/><path ${s} d="M15 14v2"/>`
    ),
    exchanges: icon(
      `<path ${s} d="M3 21h18"/><path ${s} d="M6 21V11"/><path ${s} d="M10 21V7"/><path ${s} d="M14 21V11"/><path ${s} d="M18 21V5"/><path ${s} d="M3 11l9-7 9 7"/>`
    ),
    settings: icon(
      `<path ${s} d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3" ${s} fill="none"/>`
    ),
    sun: icon(
      `<circle cx="12" cy="12" r="4" ${s} fill="none"/><path ${s} d="M12 2v2"/><path ${s} d="M12 20v2"/><path ${s} d="m4.93 4.93 1.41 1.41"/><path ${s} d="m17.66 17.66 1.41 1.41"/><path ${s} d="M2 12h2"/><path ${s} d="M20 12h2"/><path ${s} d="m4.93 19.07 1.41-1.41"/><path ${s} d="m17.66 6.34 1.41-1.41"/>`
    ),
    moon: icon(
      `<path ${s} d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`
    ),
    help: icon(
      `<circle cx="12" cy="12" r="10" ${s} fill="none"/><path ${s} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path ${s} d="M12 17h.01"/>`
    ),
    close: icon(`<path ${s} d="M18 6 6 18"/><path ${s} d="m6 6 12 12"/>`),
    link: icon(
      `<path ${s} d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path ${s} d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`
    ),
    minimize: icon(`<path ${s} d="M5 12h14"/>`),
    maximize: icon(`<path ${s} d="M8 5h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>`),
    restore: icon(
      `<path ${s} d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/><path ${s} d="M11 5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>`
    ),
  };

  window.yxIcons = icons;
  window.yxIcon = function yxIcon(name) {
    return icons[name] || "";
  };
})();
