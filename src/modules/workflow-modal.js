// Auto-generated imports
import {
  closePanelSearch,
} from './panelSearch.js';
import {
  alignBtn,
  clearDocxBtn,
  clearHtmlBtn,
  condensedEnStat,
  condensedFrStat,
  docxBlockCountBadge,
  docxFile,
  docxPreviewFrame,
  docxStat,
  docxStatWrap,
  dropzoneMain,
  enBlockCountBadge,
  enPreviewFrame,
  frBlockCountBadge,
  frPreviewFrame,
  htmlInput,
  htmlStat,
  parseHtmlBtn,
  previewSection,
  startWorkflowModal,
} from './dom-refs.js';
import {
  closeControlsModal,
  closeDrawer,
} from './drawer.js';
import {
  updateHtmlInputHighlight,
} from './html-input.js';
import {
  toggleWordDocView,
} from './iframe-preview.js';
import {
  closeReplaceTextModal,
} from './inline-edit.js';
import {
  expandSources,
} from './sources.js';
import {
  closeSplitBlockModal,
} from './split-merge.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  pushUndoState,
} from './undo.js';


function openStartWorkflowModal() {
  const hasData = Boolean(
    (state.enHtml && state.enHtml.trim()) ||
    (state.frBlocks && state.frBlocks.length > 0) ||
    state.alignRows.length > 0
  );
  if (!hasData) {
    resetToNewWorkflow();
    return;
  }
  if (startWorkflowModal) {
    startWorkflowModal.style.display = 'flex';
    setTimeout(() => startWorkflowModal.classList.add('is-open'), 10);
  }
}

function closeStartWorkflowModal() {
  if (!startWorkflowModal) return;
  startWorkflowModal.classList.remove('is-open');
  setTimeout(() => {
    startWorkflowModal.style.display = 'none';
  }, 200);
}

function resetToNewWorkflow() {
  pushUndoState('Pre-reset state');

  if (htmlInput) htmlInput.value = '';
  if (htmlStat) htmlStat.textContent = '0 blocks';
  updateHtmlInputHighlight();
  state.enHtml = '';
  state.enBlocks = [];
  state.enParsed = null;
  if (clearHtmlBtn) clearHtmlBtn.disabled = true;
  if (clearDocxBtn) clearDocxBtn.disabled = true;
  if (parseHtmlBtn) parseHtmlBtn.disabled = true;
  if (condensedEnStat) condensedEnStat.textContent = '0 blocks';

  if (docxFile) docxFile.value = '';
  if (dropzoneMain) dropzoneMain.textContent = 'Drop .docx here or click to browse';
  if (docxStatWrap) docxStatWrap.innerHTML = '';
  if (docxStat) docxStat.textContent = '0 blocks';
  state.frDocxName = '';
  state.frRawDocxHtml = '';
  state.frBlocks = [];
  if (condensedFrStat) {
    condensedFrStat.textContent = '0 blocks';
    condensedFrStat.removeAttribute('title');
  }

  state.alignRows = [];
  state.alignPairs = [];
  state.issueGroups = { mismatch: [], missing: [], extra: [] };
  state.activePreviewBlock = 0;
  state.syncOffset = 0;
  state.outputHtml = '';
  state.frCustomHtml = null;
  state.frGeneratedCode = null;
  state.frCodeModified = false;
  if (alignBtn) alignBtn.disabled = true;

  expandSources({ scrollIntoView: false });
  if (alignBtn) alignBtn.style.display = 'inline-flex';
  if (previewSection) previewSection.classList.remove('show');
  ['en', 'fr', 'docx'].forEach((side) => closePanelSearch(side));
  if (state.showWordDocView) toggleWordDocView();
  if (state.drawerOpen) closeDrawer();
  if (state.controlsModalOpen) closeControlsModal();
  closeSplitBlockModal();
  closeReplaceTextModal();
  closeStartWorkflowModal();

  try {
    if (enPreviewFrame) enPreviewFrame.srcdoc = '';
    if (frPreviewFrame) frPreviewFrame.srcdoc = '';
    if (docxPreviewFrame) docxPreviewFrame.srcdoc = '';
  } catch (_) {}

  if (enBlockCountBadge) enBlockCountBadge.textContent = '0 blocks';
  if (frBlockCountBadge) frBlockCountBadge.textContent = '0 blocks';
  if (docxBlockCountBadge) docxBlockCountBadge.textContent = '0 blocks';
  renderStatsBar();

  window.scrollTo({ top: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export {
  closeStartWorkflowModal,
  openStartWorkflowModal,
  resetToNewWorkflow,
};
