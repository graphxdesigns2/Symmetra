// Auto-generated imports
import {
  getHoveredOrActiveSearchPane,
  openPanelSearch,
} from './panelSearch.js';
import {
  computeAltAudit,
  computeHeadingsAudit,
  computeLinkAudit,
  computeQaDiffAudit,
} from './qa-audit.js';
import {
  computeLangEnAudit,
  computeTypographyAudit,
} from './french-audit.js';
import {
  enPreviewFrame,
  frPreviewFrame,
  previewSection,
} from './dom-refs.js';
import {
  showToast,
} from './ui-toast.js';
import {
  closeControlsModal,
  closeDrawer,
  openControlsModal,
} from './drawer.js';
import {
  jumpToBlock,
  lastHoveredFrame,
  stepFrameBlock,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  nudgeSync,
} from './sync-status.js';
import {
  undoLastEdit,
} from './undo.js';


// A hidden preview pane can't be stepped: findTopIndexForFrame reads
// scrollTop === 0 on a display:none frame and returns items[0].index, so
// every Alt+ArrowDown landed on block 1 (and PageDown on block 5) no matter
// where the user was. Only offer frames that are actually laid out.
function isFrameVisible(frame) {
  try {
    if (!frame) return false;
    const cs = getComputedStyle(frame);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = frame.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  } catch (_) {
    return false;
  }
}

// Resolve which preview pane Alt-stepping should act on, or null when there
// is none worth stepping (code view, or the last hovered pane is hidden).
function resolveStepFrame() {
  const candidates = [
    lastHoveredFrame,
    document.activeElement === frPreviewFrame ? frPreviewFrame : null,
    enPreviewFrame,
  ];
  for (const frame of candidates) {
    if (isFrameVisible(frame)) return frame;
  }
  return null;
}

function handleKeyNavigation(e) {
  // Undo: Ctrl+Z or Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    const isTextInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
    if (!isTextInput || e.target.isContentEditable) {
      e.preventDefault();
      e.stopPropagation();
      undoLastEdit();
      return;
    }
  }

  // Search: Ctrl+F or Cmd+F
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    if (previewSection && previewSection.classList.contains('show')) {
      e.preventDefault();
      e.stopPropagation();
      const targetSide = getHoveredOrActiveSearchPane();
      openPanelSearch(targetSide);
      return;
    }
  }

  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  const isAlt = e.altKey || state.syncPaused || !state.autoSync;

  // Arrow/Page navigation: Alt (or paused sync) means "move this one pane
  // independently". The pane depends on what's actually laid out:
  //   - visual/split mode: the hovered preview frame (visible one only —
  //     stepping a display:none frame reads scrollTop 0 and slams the active
  //     block to 1 / 5 from anywhere);
  //   - code mode: the code pane the user is working in, stepped on its own
  //     so the other editor stays put. jumpToBlock() is NOT a substitute —
  //     it re-centers both editors via syncCodeViewToActiveBlock, which made
  //     Alt look like it did nothing.
  const stepFrame = isAlt ? resolveStepFrame() : null;
  const codeLike = state.frViewMode === 'code' || state.frViewMode === 'split';
  const canStepCode = isAlt && !stepFrame && codeLike
    && typeof window !== 'undefined'
    && typeof window.stepCodeEditorBlock === 'function';
  const stepCodeSide = canStepCode
    ? (typeof window.getLastCodeSide === 'function' ? window.getLastCodeSide() : 'fr')
    : null;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (stepFrame) {
      stepFrameBlock(stepFrame, -1);
      return;
    }
    if (canStepCode) {
      window.stepCodeEditorBlock(stepCodeSide, -1);
      return;
    }
    if (state.activePreviewBlock > 0) {
      jumpToBlock(state.activePreviewBlock - 1);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (stepFrame) {
      stepFrameBlock(stepFrame, 1);
      return;
    }
    if (canStepCode) {
      window.stepCodeEditorBlock(stepCodeSide, 1);
      return;
    }
    if (state.activePreviewBlock < state.enBlocks.length - 1) {
      jumpToBlock(state.activePreviewBlock + 1);
    }
  } else if (e.key === 'PageUp') {
    e.preventDefault();
    if (stepFrame) {
      stepFrameBlock(stepFrame, -5);
      return;
    }
    if (canStepCode) {
      window.stepCodeEditorBlock(stepCodeSide, -5);
      return;
    }
    jumpToBlock(Math.max(0, state.activePreviewBlock - 5));
  } else if (e.key === 'PageDown') {
    e.preventDefault();
    if (stepFrame) {
      stepFrameBlock(stepFrame, 5);
      return;
    }
    if (canStepCode) {
      window.stepCodeEditorBlock(stepCodeSide, 5);
      return;
    }
    jumpToBlock(Math.min(state.enBlocks.length - 1, state.activePreviewBlock + 5));
  } else if (e.key === '[') {
    e.preventDefault();
    nudgeSync(-1);
  } else if (e.key === ']') {
    e.preventDefault();
    nudgeSync(1);
  } else if (e.key === 'Escape') {
    if (state.controlsModalOpen) {
      closeControlsModal();
      return;
    }
    if (state.drawerOpen) {
      closeDrawer();
      return;
    }
  } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    e.preventDefault();
    if (state.controlsModalOpen) {
      closeControlsModal();
    } else {
      openControlsModal();
    }
  } else if (e.key === 'n' || e.key === 'N') {
    // Next / previous QA issue (Shift+N goes backwards). Skipped while editing text.
    if (e.target && (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return;
    if (!previewSection || !previewSection.classList.contains('show')) return;
    if (!state.enBlocks || state.enBlocks.length === 0) return;
    e.preventDefault();
    stepIssue(e.key === 'N' ? -1 : 1);
  }
}

function resolveFrIndexToEn(frIdx) {
  const pair = (state.alignPairs || []).find((p) => p.frIndex === frIdx && !p.skip && p.enIndex !== null);
  if (pair) return pair.enIndex;
  return Math.max(0, Math.min(frIdx, (state.enBlocks || []).length - 1));
}

function collectIssuePointers() {
  const list = [];
  const push = (label, enIdx) => {
    if (typeof enIdx !== 'number' || isNaN(enIdx)) return;
    const clamped = Math.max(0, Math.min(enIdx, (state.enBlocks || []).length - 1));
    if ((state.enBlocks || []).length === 0) return;
    list.push({ label, enIndex: clamped });
  };

  (state.issueGroups.missing || []).forEach((m) => push(`Missing FR — ${m.title}`, m.enIndex));
  // Only the lossy structure differences are worth stopping at during a
  // QA walkthrough; the informational ones would just be noise between the
  // findings the user can actually act on.
  (state.issueGroups.mismatch || []).filter((m) => m.lossy).forEach((m) => push(`Conversion — ${m.title}`, m.enIndex));
  try {
    computeQaDiffAudit()
      .filter((q) => q.severity !== 'notice')
      .forEach((q) => push(`QA ${q.type} — ${q.title}`, q.enIndex));
  } catch (_) {}
  try {
    computeLinkAudit().rows
      .filter((r) => r.status !== 'ok')
      .forEach((r) => push(`Link ${r.status} — block #${r.enIndex + 1}`, r.enIndex));
  } catch (_) {}
  try {
    computeHeadingsAudit().issues.forEach((h) => push(`Heading — ${h.title}`,
      (h.enIndex !== null && h.enIndex !== undefined) ? h.enIndex : resolveFrIndexToEn(h.frIndex)));
  } catch (_) {}
  try {
    computeAltAudit().images
      .filter((im) => im.status !== 'ok')
      .forEach((im) => push(`Alt ${im.status} — block #${im.enIndex + 1}`, im.enIndex));
  } catch (_) {}
  try {
    computeTypographyAudit().forEach((t) => push(`Spacing — FR block #${t.frIndex + 1}`, resolveFrIndexToEn(t.frIndex)));
  } catch (_) {}
  try {
    computeLangEnAudit().forEach((l) => push(`lang="en" — FR block #${l.frIndex + 1}`, resolveFrIndexToEn(l.frIndex)));
  } catch (_) {}
  (state.issueGroups.extra || []).forEach((x) => push(`Extra FR — ${x.title}`, resolveFrIndexToEn(x.frIndex)));

  return list;
}

function stepIssue(dir) {
  const pointers = collectIssuePointers();
  if (!pointers.length) {
    showToast('No QA issues — document is clean');
    return;
  }
  if (typeof state.issueNavIndex !== 'number') state.issueNavIndex = -1;
  state.issueNavIndex = (state.issueNavIndex + dir + pointers.length) % pointers.length;
  const item = pointers[state.issueNavIndex];
  jumpToBlock(item.enIndex);
  showToast(`Issue ${state.issueNavIndex + 1}/${pointers.length}: ${item.label}`);
}

export {
  handleKeyNavigation,
};
