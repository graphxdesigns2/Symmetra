// Auto-generated imports
import {
  toast,
} from './dom-refs.js';


let toastTimer = null;

function showToast(msg, duration = 3000) {
  if (!toast) return;
  toast.textContent = msg;
  try {
    const header = document.querySelector('#enPreviewPane .preview-header');
    const r = header ? header.getBoundingClientRect() : null;
    if (r && r.height > 0 && r.bottom > 0 && r.bottom < window.innerHeight) {
      toast.style.top = `${Math.round(r.bottom + 8)}px`;
    } else {
      toast.style.top = '';
    }
  } catch (_) {
    toast.style.top = '';
  }
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

let headerNoteTimer = null;

function showHeaderNote(msg, tone = 'live', duration = 2500) {
  const el = document.getElementById('navSyncNote');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-paused', tone === 'paused');
  el.classList.toggle('is-live', tone !== 'paused');
  el.classList.add('show');
  if (headerNoteTimer) clearTimeout(headerNoteTimer);
  headerNoteTimer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

export {
  showHeaderNote,
  showToast,
  toastTimer,
};
