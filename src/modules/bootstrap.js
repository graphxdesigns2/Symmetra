// Auto-generated imports
import {
  allowsBareSupFootnotes,
  buildFootnoteInventory,
  collectDefinedFootnoteNums,
  collectLeafBlocks,
  convertFrenchBlockFootnotes,
  createFrenchFootnoteNode,
  extractBlockFootnoteNumbers,
  extractBlockFootnotes,
  extractFootnoteNumber,
  findTypedCitationInProse,
  getFootnoteEvidence,
  hasFootnoteChrome,
  hasFootnoteDefsRegion,
  hasVisibleCitationText,
  isVisibleFootnoteCitation,
  isAlreadyCanonical,
  isFootnoteBoilerplateElement,
  isFootnoteCitationHref,
  isFootnoteCitationSup,
  isFootnoteContentBlock,
  isFootnoteElement,
  isFootnoteHeadingBlock,
  isFootnoteReturnHref,
  makeCanonicalRef,
  nearestWordBoundary,
  standaloneCitationRe,
  numFromHref,
  verifyFootnotes,
  walkTextNodes,
} from './footnotes.js';
import {
  extractBlocks,
} from './block-utils.js';
import {
  CANADIAN_GOV_BILINGUAL_TERMS,
  GC_ACRONYM_PAIRS,
  areBilingualAcronyms,
  computeBilingualTextSimilarity,
  extractAcronyms,
  extractBlockTextFeatures,
  extractNumbersAndData,
  extractSectionIdentifier,
  getBlockMatchScore,
  getPdfMetaFieldType,
  isCalloutBlock,
  isFigcaptionBlock,
  isHeadingLikeBlock,
  isHeadingTag,
  isOmittedEnglishEquivalentBlock,
  isPdfDownloadText,
  isPdfPublicationMetadataText,
  isPdfSidePanelElement,
  isSingleCellCalloutTable,
  isTableCaptionBlock,
  isTextEquivalentSummaryBlock,
  isTextEquivalentSummaryText,
  matchesCanadianGovBilingualTerm,
  normalizeToken,
} from './alignment.js';
import {
  clearDocSearchHighlights,
  closePanelSearch,
  getFrameForSide,
  getHoveredOrActiveSearchPane,
  highlightSearchMatchesInDoc,
  initPanelSearchListeners,
  navigatePanelSearch,
  openPanelSearch,
  panelSearchStates,
  performPanelSearch,
} from './panelSearch.js';
import {
  computeAlignment,
} from './alignment-compute.js';
import {
  formatHtmlCode,
  generateFrenchHtmlSource,
  initFrViewSlider,
  switchFrenchView,
  syncFrCodeScroll,
  updateFrCodeView,
} from './code-view.js';
import {
  closeContextMenu,
  currentContextMenuTarget,
  openContextMenu,
} from './context-menu.js';
import {
  clearDocxFile,
  handleDocxFile,
  parseFrDocxHtml,
} from './docx.js';
import {
  closeControlsModal,
  closeDrawer,
  openControlsModal,
  openDrawer,
} from './drawer.js';
import {
  initFullscreen,
} from './fullscreen.js';
import {
  analyzeEnglishHtml,
  updateHtmlInputHighlight,
  updateHtmlState,
} from './html-input.js';
import {
  buildDualIframePreviews,
  toggleWordDocView,
} from './iframe-preview.js';
import {
  applyDeleteText,
  applyRemoveHyperlink,
  applyResolveExtraText,
  closeReplaceTextModal,
  confirmReplaceText,
  copyTargetText,
  jumpToPairedBlock,
  openReplaceTextModal,
  pasteTargetText,
  updateReplaceCharCount,
} from './inline-edit.js';
import {
  handleKeyNavigation,
} from './keyboard-nav.js';
import {
  SAMPLE_EN_HTML,
  SAMPLE_FR_DOCX_HTML,
} from './sample-data.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  handleWheelNavigation,
  jumpToBlock,
} from './scroll-sync.js';
import {
  condenseSources,
  expandSources,
} from './sources.js';
import {
  applySplitBlock,
  closeSplitBlockModal,
  mergeWithNextBlock,
  openSplitBlockModal,
} from './split-merge.js';
import {
  state,
} from './state.ts';
import {
  nudgeSync,
  updateSyncOffsetBadge,
  updateSyncStatusLabel,
} from './sync-status.js';
import {
  applyTheme,
  initTheme,
} from './theme.js';
import {
  initTitleBar,
} from './title-bar.js';
import {
  showHeaderNote,
  showToast,
} from './ui-toast.js';
import {
  undoLastEdit,
} from './undo.js';
import {
  closeStartWorkflowModal,
  openStartWorkflowModal,
  resetToNewWorkflow,
} from './workflow-modal.js';
import {
  zoomIn,
  zoomOut,
  zoomReset,
} from './zoom.js';

import { initEventListeners as initAppEventListeners } from './eventListeners.js';
import { initEnPaneCollapse } from './pane-visibility.js';
import { initSourceBoxSync } from './source-box-sync.js';


if (typeof window !== 'undefined') {
  Object.assign(window, {
    isFootnoteBoilerplateElement,
    isFootnoteCitationHref,
    isFootnoteReturnHref,
    isFootnoteCitationSup,
    hasFootnoteChrome,
    hasVisibleCitationText,
    isVisibleFootnoteCitation,
    getFootnoteEvidence,
    allowsBareSupFootnotes,
    isFootnoteElement,
    numFromHref,
    collectDefinedFootnoteNums,
    hasFootnoteDefsRegion,
    walkTextNodes,
    collectLeafBlocks,
    extractBlockFootnotes,
    createFrenchFootnoteNode,
    makeCanonicalRef,
    isAlreadyCanonical,
    nearestWordBoundary,
    findTypedCitationInProse,
    standaloneCitationRe,
    buildFootnoteInventory,
    convertFrenchBlockFootnotes,
    verifyFootnotes,
    isFootnoteHeadingBlock,
    isFootnoteContentBlock,
    extractFootnoteNumber,
    extractBlockFootnoteNumbers,
    isHeadingTag,
    isHeadingLikeBlock,
    isTextEquivalentSummaryText,
    isTextEquivalentSummaryBlock,
    isFigcaptionBlock,
    isTableCaptionBlock,
    extractSectionIdentifier,
    isPdfDownloadText,
    isPdfPublicationMetadataText,
    getPdfMetaFieldType,
    isPdfSidePanelElement,
    normalizeToken,
    extractNumbersAndData,
    extractAcronyms,
    GC_ACRONYM_PAIRS,
    areBilingualAcronyms,
    extractBlockTextFeatures,
    computeBilingualTextSimilarity,
    CANADIAN_GOV_BILINGUAL_TERMS,
    matchesCanadianGovBilingualTerm,
    isOmittedEnglishEquivalentBlock,
    isSingleCellCalloutTable,
    isCalloutBlock,
    getBlockMatchScore,
    panelSearchStates,
    getFrameForSide,
    clearDocSearchHighlights,
    highlightSearchMatchesInDoc,
    openPanelSearch,
    closePanelSearch,
    performPanelSearch,
    navigatePanelSearch,
    getHoveredOrActiveSearchPane,
    initPanelSearchListeners,
    extractBlocks,
  });
}

function initEventListeners() {
  initAppEventListeners({
    state,
    SAMPLE_EN_HTML,
    SAMPLE_FR_DOCX_HTML,
    applyTheme,
    updateHtmlState,
    updateHtmlInputHighlight,
    analyzeEnglishHtml,
    showToast,
    showHeaderNote,
    parseFrDocxHtml,
    clearDocxFile,
    handleDocxFile,
    computeAlignment,
    expandSources,
    condenseSources,
    toggleWordDocView,
    openControlsModal,
    closeControlsModal,
    zoomIn,
    zoomOut,
    zoomReset,
    openSplitBlockModal,
    mergeWithNextBlock,
    closeSplitBlockModal,
    applySplitBlock,
    closeContextMenu,
    openReplaceTextModal,
    applyDeleteText,
    applyRemoveHyperlink,
    applyResolveExtraText,
    jumpToPairedBlock,
    copyTargetText,
    pasteTargetText,
    buildDualIframePreviews,
    openPanelSearch,
    undoLastEdit,
    openStartWorkflowModal,
    closeStartWorkflowModal,
    closeReplaceTextModal,
    confirmReplaceText,
    updateReplaceCharCount,
    openContextMenu,
    closeDrawer,
    openDrawer,
    updateSyncStatusLabel,
    applyActiveHighlight,
    alignPreviewBlocks,
    nudgeSync,
    updateSyncOffsetBadge,
    switchFrenchView,
    formatHtmlCode,
    updateFrCodeView,
    syncFrCodeScroll,
    generateFrenchHtmlSource,
    jumpToBlock,
    resetToNewWorkflow,
    initPanelSearchListeners,
    handleWheelNavigation,
    handleKeyNavigation,
    getCurrentContextMenuTarget: () => currentContextMenuTarget,
  });
}

if (typeof window !== 'undefined') {
  window.initEventListeners = initEventListeners;
}

function initApp() {
  initTheme();
  initTitleBar();
  initFullscreen();
  initEnPaneCollapse();
  initFrViewSlider();
  initEventListeners();
  initSourceBoxSync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}