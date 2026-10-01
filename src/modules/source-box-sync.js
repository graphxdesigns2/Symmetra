/**
 * source-box-sync.js
 * Keeps the FR dropzone the same rendered height as the EN textarea wrapper.
 *
 * The two source panels stretch to equal heights, but their footer stacks
 * differ (EN has the Clear/Analyze row + stat line, FR only the file-status
 * area), so flex sizing alone leaves the boxes at different heights. Instead
 * of a magic-number offset, measure the rendered editor height and pin the
 * dropzone to it. If the editor is taller than the dropzone's natural flex
 * share (very short viewports), the pin is skipped so flex shrinking still
 * protects panel content from clipping.
 */

let syncQueued = false;

function getBoxes() {
  if (typeof document === 'undefined') return null;
  const editor = document.getElementById('htmlInputWrap');
  const dropzone = document.getElementById('dropzone');
  if (!editor || !dropzone) return null;
  return { editor, dropzone };
}

function syncSourceBoxHeights() {
  const boxes = getBoxes();
  if (!boxes) return;
  const { editor, dropzone } = boxes;
  // Reset to natural flex sizing first so the measurement reflects the
  // room currently available in the FR panel.
  dropzone.style.height = '';
  dropzone.style.flex = '';
  const target = editor.getBoundingClientRect().height;
  const natural = dropzone.getBoundingClientRect().height;
  if (target > 0 && target <= natural) {
    dropzone.style.flex = 'none';
    dropzone.style.height = `${target}px`;
  }
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  const run = () => {
    syncQueued = false;
    syncSourceBoxHeights();
  };
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(run);
  } else {
    setTimeout(run, 0);
  }
}

function initSourceBoxSync() {
  const boxes = getBoxes();
  if (!boxes || typeof window === 'undefined') return;
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('load', scheduleSync);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(boxes.editor);
  }
  if (document.fonts && typeof document.fonts.ready !== 'undefined') {
    document.fonts.ready.then(scheduleSync).catch(() => {});
  }
  scheduleSync();
}

export {
  initSourceBoxSync,
  syncSourceBoxHeights,
};
