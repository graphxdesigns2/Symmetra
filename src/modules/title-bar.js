// Auto-generated imports
import {
  btnClose,
  btnMaximize,
  btnMinimize,
} from './dom-refs.js';


function isElectron() {
  try {
    // `?electron=1` override for testing the packaged layout in a plain browser
    // (e.g. http://localhost:3000/?electron=1) — buttons stay inert there.
    if (window.location && window.location.search.indexOf('electron') !== -1) return true;
    return navigator.userAgent.toLowerCase().indexOf(' electron/') !== -1;
  } catch (_) {
    return false;
  }
}

function sendToMain(channel) {
  try {
    const req = window.require ? window.require('electron') : null;
    const ipc = req && req.ipcRenderer;
    if (ipc) ipc.send(channel);
  } catch (_) {}
}

// Show the custom title bar only inside Electron and wire its controls.
// In a regular browser the bar stays hidden via CSS and the buttons do nothing.
function initTitleBar() {
  if (!isElectron()) return;
  document.body.classList.add('is-electron');
  if (btnMinimize) btnMinimize.addEventListener('click', () => sendToMain('window-minimize'));
  if (btnMaximize) btnMaximize.addEventListener('click', () => sendToMain('window-maximize'));
  if (btnClose) btnClose.addEventListener('click', () => sendToMain('window-close'));
}

export {
  initTitleBar,
  isElectron,
};
