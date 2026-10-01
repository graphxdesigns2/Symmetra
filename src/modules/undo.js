// Auto-generated imports
import {
  extractBlocks,
} from './block-utils.js';
import {
  MAX_UNDO_STACK,
} from './constants.js';
import {
  docxStatWrap,
  htmlInput,
  previewSection,
} from './dom-refs.js';
import {
  renderDrawerBody,
} from './drawer.js';
import {
  updateHtmlState,
} from './html-input.js';
import {
  buildDualIframePreviews,
} from './iframe-preview.js';
import {
  computeIssues,
} from './issues.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  checkAlignReady,
  condenseSources,
} from './sources.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  showToast,
} from './ui-toast.js';


const undoStack = [];

let lastInlineEditKey = null;

let lastInlineEditTime = 0;

function cloneBlocksForSnapshot(blocks) {
  if (!blocks || !Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b) return b;
    return {
      tag: b.tag,
      attrTarget: b.attrTarget,
      text: b.text,
      spans: b.spans ? JSON.parse(JSON.stringify(b.spans)) : [],
      inTable: Boolean(b.inTable),
      el: (b.el && b.el.nodeType === 1 && typeof b.el.querySelector === 'function') ? b.el : null,
    };
  });
}

function createSnapshot(description = 'Edit') {
  return {
    description,
    timestamp: Date.now(),
    enBlocks: cloneBlocksForSnapshot(state.enBlocks),
    frBlocks: cloneBlocksForSnapshot(state.frBlocks),
    alignRows: state.alignRows ? JSON.parse(JSON.stringify(state.alignRows)) : [],
    alignPairs: state.alignPairs ? JSON.parse(JSON.stringify(state.alignPairs)) : [],
    activePreviewBlock: state.activePreviewBlock,
    syncOffset: state.syncOffset,
    enHtml: state.enHtml || '',
    frRawDocxHtml: state.frRawDocxHtml || '',
    frDocxName: state.frDocxName || '',
  };
}

function pushUndoState(description = 'Edit') {
  try {
    const snap = createSnapshot(description);
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO_STACK) {
      undoStack.shift();
    }
  } catch (err) {
    console.warn('Could not push undo state:', err);
  }
}

function recordInlineEditUndo(enIndex, frIndex) {
  const key = `${enIndex}:${frIndex}`;
  const now = Date.now();
  if (lastInlineEditKey !== key || now - lastInlineEditTime > 3500) {
    pushUndoState('Inline edit');
    lastInlineEditKey = key;
  }
  lastInlineEditTime = now;
}

function undoLastEdit() {
  if (undoStack.length === 0) {
    showToast('Nothing to undo', 2000);
    return;
  }

  const snap = undoStack.pop();
  restoreSnapshot(snap);
}

function restoreSnapshot(snap) {
  if (!snap) return;
  state.enBlocks = cloneBlocksForSnapshot(snap.enBlocks);
  state.frBlocks = cloneBlocksForSnapshot(snap.frBlocks);
  state.alignRows = snap.alignRows ? JSON.parse(JSON.stringify(snap.alignRows)) : [];
  state.alignPairs = snap.alignPairs ? JSON.parse(JSON.stringify(snap.alignPairs)) : [];
  if (typeof snap.activePreviewBlock === 'number') state.activePreviewBlock = snap.activePreviewBlock;
  if (typeof snap.syncOffset === 'number') state.syncOffset = snap.syncOffset;
  if (typeof snap.enHtml === 'string') state.enHtml = snap.enHtml;
  if (typeof snap.frRawDocxHtml === 'string') state.frRawDocxHtml = snap.frRawDocxHtml;
  if (typeof snap.frDocxName === 'string') state.frDocxName = snap.frDocxName;

  if (state.enHtml && state.enBlocks && state.enBlocks.some((b) => !b.el)) {
    try {
      const p = new DOMParser();
      const d = p.parseFromString(state.enHtml, 'text/html');
      const fresh = extractBlocks(d.body);
      if (fresh.length === state.enBlocks.length) {
        state.enBlocks.forEach((b, idx) => {
          if (!b.el && fresh[idx] && fresh[idx].el) b.el = fresh[idx].el;
        });
      }
    } catch (e) {
      console.warn('Could not re-link EN DOM elements:', e);
    }
  }

  if (htmlInput && state.enHtml && !htmlInput.value) {
    htmlInput.value = state.enHtml;
    updateHtmlState();
  }
  if (docxStatWrap && state.frDocxName && !docxStatWrap.innerHTML) {
    docxStatWrap.innerHTML = `<strong>${state.frDocxName}</strong> loaded (${state.frBlocks.length} blocks)`;
  }
  checkAlignReady();

  state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
  renderStatsBar();
  if (state.drawerOpen && state.activeCategory) {
    renderDrawerBody(state.activeCategory);
  }

  if (state.enBlocks.length > 0 && state.frBlocks.length > 0) {
    if (previewSection && !previewSection.classList.contains('show')) {
      previewSection.classList.add('show');
      condenseSources();
    }
    buildDualIframePreviews();
    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(state.activePreviewBlock);
      updateActiveBlockHud(state.activePreviewBlock);
    }, 120);
  }

  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

export {
  cloneBlocksForSnapshot,
  createSnapshot,
  lastInlineEditKey,
  lastInlineEditTime,
  pushUndoState,
  recordInlineEditUndo,
  restoreSnapshot,
  undoLastEdit,
  undoStack,
};
