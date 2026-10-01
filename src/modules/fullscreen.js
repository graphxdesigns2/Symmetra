// Auto-generated imports
import {
  customContextMenu,
  replaceTextModal,
  splitBlockModal,
  startWorkflowModal,
  toggleFullscreenBtn,
} from './dom-refs.js';


function isPreviewFullscreen() {
  return document.body.classList.contains('preview-fullscreen');
}

function setPreviewFullscreen(on) {
  document.body.classList.toggle('preview-fullscreen', on);
  if (toggleFullscreenBtn) {
    const label = toggleFullscreenBtn.querySelector('span');
    if (label) label.textContent = on ? 'Exit fullscreen' : 'Fullscreen';
    const enterIcon = toggleFullscreenBtn.querySelector('.fs-enter-icon');
    const exitIcon = toggleFullscreenBtn.querySelector('.fs-exit-icon');
    if (enterIcon) enterIcon.style.display = on ? 'none' : '';
    if (exitIcon) exitIcon.style.display = on ? '' : 'none';
    toggleFullscreenBtn.classList.toggle('is-active', on);
    toggleFullscreenBtn.title = on
      ? 'Exit fullscreen preview (Esc)'
      : 'Focus on previews: hide inputs and panels';
  }
}

function togglePreviewFullscreen() {
  setPreviewFullscreen(!isPreviewFullscreen());
}

function initFullscreen() {
  if (toggleFullscreenBtn) {
    toggleFullscreenBtn.addEventListener('click', togglePreviewFullscreen);
  }
  // Esc exits fullscreen, unless a menu or modal is open (they handle Esc themselves)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isPreviewFullscreen()) return;
    const overlayOpen = document.querySelector('.controls-modal-overlay.is-open');
    const menuOpen = customContextMenu && customContextMenu.style.display === 'block';
    const modalOpen = [replaceTextModal, splitBlockModal, startWorkflowModal]
      .some((m) => m && m.style.display !== 'none');
    if (overlayOpen || menuOpen || modalOpen) return;
    setPreviewFullscreen(false);
  });
}

export {
  initFullscreen,
  isPreviewFullscreen,
  setPreviewFullscreen,
  togglePreviewFullscreen,
};
