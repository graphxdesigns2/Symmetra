// Auto-generated imports
import {
  ZOOM_STEPS,
} from './constants.js';
import {
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
  zoomLevelDisplay,
} from './dom-refs.js';
import {
  alignPreviewBlocks,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';


function applyPreviewZoom(targetLevel) {
  if (typeof targetLevel === 'number' && !isNaN(targetLevel)) {
    state.previewZoom = Math.max(0.5, Math.min(2.0, Math.round(targetLevel * 100) / 100));
    try {
      localStorage.setItem('symmetra_preview_zoom', String(state.previewZoom));
    } catch (_) {}
  }

  const zoomDisplay = document.getElementById('zoomLevelDisplay');
  if (zoomDisplay) {
    zoomDisplay.textContent = Math.round((state.previewZoom || 1.0) * 100) + '%';
  }

  const zoomStr = String(state.previewZoom || 1.0);

  [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
    if (frame && frame.contentDocument && frame.contentDocument.body) {
      try {
        frame.contentDocument.body.style.zoom = zoomStr;
        frame.contentDocument.body.style.setProperty('--gc-zoom', zoomStr);
      } catch (_) {}
    }
  });

  try {
    const editorBoxes = [
      document.getElementById('frCodeEditorBox'),
      document.getElementById('enCodeEditorBox') || document.querySelector('#enCodeWrap .fr-code-editor-box'),
    ];
    editorBoxes.forEach((editorBox) => {
      if (editorBox) {
        editorBox.style.zoom = zoomStr;
      }
    });
  } catch (_) {}

  // Zoom rescales rendered (wrapped) line heights: re-measure the gutter rows
  // so numbers stay glued to their lines. Via the window bridge — importing
  // code-view here would cycle (code-view imports this module).
  try {
    if (typeof window !== 'undefined' && typeof window.__relayoutCodeGutters === 'function') {
      window.__relayoutCodeGutters();
    }
  } catch (_) {}
}

function zoomIn() {
  const current = state.previewZoom || 1.0;
  const next = ZOOM_STEPS.find((s) => s > current + 0.02) || 2.0;
  applyPreviewZoom(next);
  if (typeof state.activePreviewBlock === 'number') {
    alignPreviewBlocks(state.activePreviewBlock);
  }
}

function zoomOut() {
  const current = state.previewZoom || 1.0;
  const prev = [...ZOOM_STEPS].reverse().find((s) => s < current - 0.02) || 0.5;
  applyPreviewZoom(prev);
  if (typeof state.activePreviewBlock === 'number') {
    alignPreviewBlocks(state.activePreviewBlock);
  }
}

function zoomReset() {
  applyPreviewZoom(1.0);
  if (typeof state.activePreviewBlock === 'number') {
    alignPreviewBlocks(state.activePreviewBlock);
  }
}

export {
  applyPreviewZoom,
  zoomIn,
  zoomOut,
  zoomReset,
};
