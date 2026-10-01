/**
 * eventListeners.js
 * Application-level DOM and keyboard event listeners initialization.
 * Extracted from app.js as part of the modularization initiative.
 */
import {
  renderStatsBar,
} from './stats-bar.js';

export function initEventListeners(handlers = {}) {
  const state = handlers.state || (typeof window !== 'undefined' ? window.state : null) || {};
  const SAMPLE_EN_HTML = handlers.SAMPLE_EN_HTML || (typeof window !== 'undefined' ? window.SAMPLE_EN_HTML : '') || '';
  const SAMPLE_FR_DOCX_HTML = handlers.SAMPLE_FR_DOCX_HTML || (typeof window !== 'undefined' ? window.SAMPLE_FR_DOCX_HTML : '') || '';

  const getHandler = (name, fn) => {
    if (handlers[name] && typeof handlers[name] === 'function') return handlers[name];
    if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
    if (typeof fn === 'function') return fn;
    return () => {};
  };

  const applyTheme = getHandler('applyTheme');
  const updateHtmlState = getHandler('updateHtmlState');
  const updateHtmlInputHighlight = getHandler('updateHtmlInputHighlight');
  const analyzeEnglishHtml = getHandler('analyzeEnglishHtml');
  const showToast = getHandler('showToast');
  const showHeaderNote = getHandler('showHeaderNote');
  const parseFrDocxHtml = getHandler('parseFrDocxHtml');
  const clearDocxFile = getHandler('clearDocxFile');
  const handleDocxFile = getHandler('handleDocxFile');
  const computeAlignment = getHandler('computeAlignment');
  const expandSources = getHandler('expandSources');
  const condenseSources = getHandler('condenseSources');
  const toggleWordDocView = getHandler('toggleWordDocView');
  const openControlsModal = getHandler('openControlsModal');
  const closeControlsModal = getHandler('closeControlsModal');
  const zoomIn = getHandler('zoomIn');
  const zoomOut = getHandler('zoomOut');
  const zoomReset = getHandler('zoomReset');
  const openSplitBlockModal = getHandler('openSplitBlockModal');
  const mergeWithNextBlock = getHandler('mergeWithNextBlock');
  const closeSplitBlockModal = getHandler('closeSplitBlockModal');
  const applySplitBlock = getHandler('applySplitBlock');
  const closeContextMenu = getHandler('closeContextMenu');
  const openReplaceTextModal = getHandler('openReplaceTextModal');
  const applyDeleteText = getHandler('applyDeleteText');
  const applyResolveExtraText = getHandler('applyResolveExtraText');
  const applyRemoveHyperlink = getHandler('applyRemoveHyperlink');
  const jumpToPairedBlock = getHandler('jumpToPairedBlock');
  const copyTargetText = getHandler('copyTargetText');
  const pasteTargetText = getHandler('pasteTargetText');
  const buildDualIframePreviews = getHandler('buildDualIframePreviews');
  const openPanelSearch = getHandler('openPanelSearch');
  const undoLastEdit = getHandler('undoLastEdit');
  const openStartWorkflowModal = getHandler('openStartWorkflowModal');
  const closeStartWorkflowModal = getHandler('closeStartWorkflowModal');
  const closeReplaceTextModal = getHandler('closeReplaceTextModal');
  const confirmReplaceText = getHandler('confirmReplaceText');
  const updateReplaceCharCount = getHandler('updateReplaceCharCount');
  const openContextMenu = getHandler('openContextMenu');
  const closeDrawer = getHandler('closeDrawer');
  const openDrawer = getHandler('openDrawer');
  const updateSyncStatusLabel = getHandler('updateSyncStatusLabel');
  const applyActiveHighlight = getHandler('applyActiveHighlight');
  const alignPreviewBlocks = getHandler('alignPreviewBlocks');
  const nudgeSync = getHandler('nudgeSync');
  const updateSyncOffsetBadge = getHandler('updateSyncOffsetBadge');
  const switchFrenchView = getHandler('switchFrenchView');
  const formatHtmlCode = getHandler('formatHtmlCode');
  const updateFrCodeView = getHandler('updateFrCodeView');
  const syncFrCodeScroll = getHandler('syncFrCodeScroll');
  const generateFrenchHtmlSource = getHandler('generateFrenchHtmlSource');
  const jumpToBlock = getHandler('jumpToBlock');
  const resetToNewWorkflow = getHandler('resetToNewWorkflow');
  const initPanelSearchListeners = getHandler('initPanelSearchListeners');
  const handleWheelNavigation = getHandler('handleWheelNavigation');
  const handleKeyNavigation = getHandler('handleKeyNavigation');

  const getCurrentContextMenuTarget = () => {
    if (typeof handlers.getCurrentContextMenuTarget === 'function') {
      return handlers.getCurrentContextMenuTarget();
    }
    return (typeof window !== 'undefined' && window.currentContextMenuTarget) ? window.currentContextMenuTarget : null;
  };

  const setHoveredFrame = (frame) => {
    if (typeof handlers.setHoveredFrame === 'function') {
      handlers.setHoveredFrame(frame);
    }
    if (typeof window !== 'undefined') {
      window.lastHoveredFrame = frame;
    }
  };

  // DOM Elements resolution
  const getEl = (id) => document.getElementById(id);

  const themeToggle = getEl('themeToggle');
  const htmlInput = getEl('htmlInput');
  const clearHtmlBtn = getEl('clearHtmlBtn');
  const htmlStat = getEl('htmlStat');
  const parseHtmlBtn = getEl('parseHtmlBtn');
  const loadSampleEnBtn = getEl('loadSampleEnBtn');

  const dropzone = getEl('dropzone');
  const docxFile = getEl('docxFile');
  const loadSampleFrBtn = getEl('loadSampleFrBtn');

  const alignBtn = getEl('alignBtn');
  const expandSourcesBtn = getEl('expandSourcesBtn');
  const collapseSourcesBtn = getEl('collapseSourcesBtn');

  const toggleWordDocBtn = getEl('toggleWordDocBtn');
  const closeWordDocPaneBtn = getEl('closeWordDocPaneBtn');
  const toggleFocusMode = getEl('toggleFocusMode');
  const toggleBlurMode = getEl('toggleBlurMode');
  const toggleHighlightBox = getEl('toggleHighlightBox');

  const enPreviewFrame = getEl('enPreviewFrame');
  const frPreviewFrame = getEl('frPreviewFrame');
  const docxPreviewFrame = getEl('docxPreviewFrame');

  const openControlsModalBtn = getEl('openControlsModalBtn');
  const closeControlsModalBtn = getEl('closeControlsModalBtn');
  const dismissControlsModalBtn = getEl('dismissControlsModalBtn');
  const controlsModal = getEl('controlsModal');

  const zoomInBtn = getEl('zoomInBtn');
  const zoomOutBtn = getEl('zoomOutBtn');
  const zoomResetBtn = getEl('zoomResetBtn');

  const splitActiveBlockBtn = getEl('splitActiveBlockBtn');
  const mergeActiveBlockBtn = getEl('mergeActiveBlockBtn');
  const closeSplitModalBtn = getEl('closeSplitModalBtn');
  const cancelSplitModalBtn = getEl('cancelSplitModalBtn');
  const confirmSplitBlockBtn = getEl('confirmSplitBlockBtn');
  const splitBySentenceBtn = getEl('splitBySentenceBtn');
  const splitByNewlineBtn = getEl('splitByNewlineBtn');
  const splitByHalfBtn = getEl('splitByHalfBtn');
  const splitOriginalText = getEl('splitOriginalText');
  const splitPart1Text = getEl('splitPart1Text');
  const splitPart2Text = getEl('splitPart2Text');
  const splitBlockModal = getEl('splitBlockModal');

  // Context Menu Buttons
  const ctxBtnReplaceText = getEl('ctxBtnReplaceText');
  const ctxBtnSplitBlock = getEl('ctxBtnSplitBlock');
  const ctxBtnDeleteText = getEl('ctxBtnDeleteText');
  const ctxBtnRemoveLink = getEl('ctxBtnRemoveLink');
  // Was referenced bare further down (`if (ctxBtnResolve)`) but never declared.
  // A bare reference to an undeclared name throws a ReferenceError, and this
  // function has no try/catch around it, so it aborted init here: every
  // listener after this point never bound and initSourceBoxSync() never ran.
  const ctxBtnResolve = getEl('ctxBtnResolve');
  const ctxBtnJumpPair = getEl('ctxBtnJumpPair');
  const ctxBtnCopyText = getEl('ctxBtnCopyText');
  const ctxBtnPasteText = getEl('ctxBtnPasteText');
  const ctxBtnFocusMode = getEl('ctxBtnFocusMode');
  const ctxBtnReloadPreview = getEl('ctxBtnReloadPreview');
  const ctxBtnFind = getEl('ctxBtnFind');
  const ctxBtnUndo = getEl('ctxBtnUndo');
  const ctxBtnNewWorkflow = getEl('ctxBtnNewWorkflow');
  const customContextMenu = getEl('customContextMenu');

  // Replace Text Modal
  const closeReplaceTextModalBtn = getEl('closeReplaceTextModalBtn');
  const cancelReplaceTextModalBtn = getEl('cancelReplaceTextModalBtn');
  const confirmReplaceTextBtn = getEl('confirmReplaceTextBtn');
  const replaceTextModal = getEl('replaceTextModal');
  const replaceTextInput = getEl('replaceTextInput');

  // Drawer / Quick Audit Buttons
  const openQaDiffBtn = getEl('openQaDiffBtn');
  const openTypographyBtn = getEl('openTypographyBtn');
  const openLangEnBtn = getEl('openLangEnBtn');
  const toggleAutoSync = getEl('toggleAutoSync');
  const rightBack = getEl('rightBack');
  const rightForward = getEl('rightForward');
  const syncOffsetBtn = getEl('syncOffsetBtn');

  // French Pane View Toggle
  const frViewVisualBtn = getEl('frViewVisualBtn');
  const frViewCodeBtn = getEl('frViewCodeBtn');
  const frViewSplitBtn = getEl('frViewSplitBtn');
  const copyEnCodeBtn = getEl('copyEnCodeBtn');
  const copyFrCodeBtn = getEl('copyFrCodeBtn');
  const formatFrCodeBtn = getEl('formatFrCodeBtn');
  const frCodeEditor = getEl('frCodeEditor');
  const enCodeEditor = getEl('enCodeEditor');
  const downloadFrCodeBtn = getEl('downloadFrCodeBtn');

  const healthPill = getEl('healthPill');
  const closeDrawerBtn = getEl('closeDrawerBtn');

  const prevBlockBtn = getEl('prevBlockBtn');
  const nextBlockBtn = getEl('nextBlockBtn');
  const blockJumpToggleBtn = getEl('blockJumpToggleBtn');
  const blockNumInput = getEl('activeBlockHudText');

  const startNewWorkflowBtn = getEl('startNewWorkflowBtn');
  const closeStartWorkflowModalBtn = getEl('closeStartWorkflowModalBtn');
  const cancelStartWorkflowBtn = getEl('cancelStartWorkflowBtn');
  const confirmStartWorkflowBtn = getEl('confirmStartWorkflowBtn');
  const startWorkflowModal = getEl('startWorkflowModal');

  // --- Attach Event Listeners ---

  // Theme Toggle Button
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  // HTML Source Input (code-view coloring overlay)
  const htmlInputHighlight = getEl('htmlInputHighlight');
  const htmlInputGutter = getEl('htmlInputGutter');
  if (htmlInput) {
    htmlInput.addEventListener('input', updateHtmlState);
    if (htmlInputHighlight) {
      htmlInput.addEventListener('scroll', () => {
        htmlInputHighlight.scrollTop = htmlInput.scrollTop;
        htmlInputHighlight.scrollLeft = htmlInput.scrollLeft;
        if (htmlInputGutter) {
          // Proportional: the textarea wraps (taller) while the gutter holds
          // one number per logical line (shorter) — a 1:1 copy clamps early
          // and the numbers stop moving near the bottom.
          const sourceMax = Math.max(0, (htmlInput.scrollHeight || 0) - (htmlInput.clientHeight || 0));
          const gutterMax = Math.max(0, (htmlInputGutter.scrollHeight || 0) - (htmlInputGutter.clientHeight || 0));
          htmlInputGutter.scrollTop = (sourceMax && gutterMax)
            ? Math.round(((htmlInput.scrollTop || 0) / sourceMax) * gutterMax)
            : htmlInput.scrollTop;
        }
      }, { passive: true });
    }
  }
  updateHtmlInputHighlight();
  if (clearHtmlBtn) {
    clearHtmlBtn.addEventListener('click', () => {
      if (htmlInput) htmlInput.value = '';
      if (htmlStat) htmlStat.textContent = '0 blocks';
      state.enBlocks = [];
      state.enParsed = null;
      updateHtmlState();
    });
  }
  if (parseHtmlBtn) {
    parseHtmlBtn.addEventListener('click', analyzeEnglishHtml);
  }
  if (loadSampleEnBtn) {
    loadSampleEnBtn.addEventListener('click', () => {
      if (htmlInput) htmlInput.value = SAMPLE_EN_HTML;
      updateHtmlState();
      analyzeEnglishHtml();
    });
  }

  // DOCX Dropzone & Upload
  if (loadSampleFrBtn) {
    loadSampleFrBtn.addEventListener('click', () => {
      parseFrDocxHtml(SAMPLE_FR_DOCX_HTML, 'sample-french-translation.docx');
    });
  }

  if (dropzone && docxFile) {
    const openFilePicker = () => {
      docxFile.click();
    };

    dropzone.addEventListener('click', (e) => {
      // The Clear button, status line, and hidden input live inside the
      // dropzone: clicking them must not re-open the file picker.
      if (e.target && typeof e.target.closest === 'function') {
        if (e.target.closest('button, a, input, textarea, select')) return;
      }
      openFilePicker();
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Space scrolls the page by default; claim it for file browsing.
        e.preventDefault();
        openFilePicker();
      }
    });

    const clearDocxBtn = getEl('clearDocxBtn');
    if (clearDocxBtn) {
      clearDocxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearDocxFile();
      });
    }

    docxFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      // Reset up front as well as inside handleDocxFile: if validation
      // rejects synchronously, the same file must still re-fire change.
      const pending = file;
      e.target.value = '';
      if (pending) handleDocxFile(pending);
    });

    // Track dragenter depth so the highlight doesn't flicker when crossing
    // child elements inside the dropzone.
    let dragDepth = 0;

    dropzone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragDepth += 1;
      dropzone.classList.add('drag');
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      dropzone.classList.add('drag');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dropzone.classList.remove('drag');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth = 0;
      dropzone.classList.remove('drag');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || files.length === 0) return;
      if (files.length > 1) {
        showToast('Drop one .docx at a time — using the first file', 4000);
      }
      const file = files[0];
      if (file) handleDocxFile(file);
    });
  }

  // Align & Source Condense Controls
  if (alignBtn) {
    // Wrap it: computeAlignment takes a target block INDEX, and handing it the
    // click event made it NaN. The frames still built, so the button looked
    // dead rather than broken.
    alignBtn.addEventListener('click', () => computeAlignment());
  }

  if (expandSourcesBtn) {
    expandSourcesBtn.addEventListener('click', expandSources);
  }

  if (collapseSourcesBtn) {
    collapseSourcesBtn.addEventListener('click', () => {
      // Collapse into the preview when both sources are loaded so the
      // current document/HTML shows; otherwise just condense the inputs.
      if (state.enBlocks && state.frBlocks && state.enBlocks.length > 0 && state.frBlocks.length > 0) {
        computeAlignment();
      } else {
        condenseSources();
      }
    });
  }

  // View Toolbar
  if (toggleWordDocBtn) {
    toggleWordDocBtn.addEventListener('click', () => {
      toggleWordDocView();
    });
  }

  if (closeWordDocPaneBtn) {
    closeWordDocPaneBtn.addEventListener('click', () => {
      toggleWordDocView(false);
    });
  }

  if (toggleFocusMode) {
    toggleFocusMode.addEventListener('click', () => {
      state.focusMode = !state.focusMode;
      toggleFocusMode.classList.toggle('is-active', state.focusMode);
      [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
        if (frame && frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('mode-focus', state.focusMode);
        }
      });
    });
  }

  if (toggleBlurMode) {
    toggleBlurMode.addEventListener('click', () => {
      state.blurMode = !state.blurMode;
      toggleBlurMode.classList.toggle('is-active', state.blurMode);
      [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
        if (frame && frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('mode-blur', state.blurMode);
        }
      });
    });
  }

  if (toggleHighlightBox) {
    const syncHighlightBoxLabel = () => {
      const label = toggleHighlightBox.querySelector('span');
      if (label) {
        label.textContent = 'Active box';
      } else {
        toggleHighlightBox.textContent = 'Active box';
      }
    };
    syncHighlightBoxLabel();
    toggleHighlightBox.addEventListener('click', () => {
      state.showHighlightBox = !state.showHighlightBox;
      toggleHighlightBox.classList.toggle('is-active', state.showHighlightBox);
      syncHighlightBoxLabel();
      [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
        if (frame && frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('hide-highlight', !state.showHighlightBox);
        }
      });
      applyActiveHighlight();
    });
  }

  // Controls & Help Modal
  if (openControlsModalBtn) {
    openControlsModalBtn.addEventListener('click', openControlsModal);
  }
  const tutorialBtn = getEl('tutorialBtn');
  if (tutorialBtn) {
    // The guided tour loads on demand so it stays out of the initial bundle.
    // wireTour is idempotent, so the background pre-load and the click path
    // can safely race; the button works even before pre-loading finishes.
    const loadTour = () => import('./tour.js');
    const wireTourInBackground = () => {
      loadTour().then((m) => m.wireTour()).catch(() => {});
    };
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(wireTourInBackground);
    } else if (typeof window !== 'undefined') {
      setTimeout(wireTourInBackground, 1500);
    }
    tutorialBtn.addEventListener('click', () => {
      loadTour()
        .then((m) => {
          m.wireTour();
          m.openTutorialConfirm();
        })
        .catch(() => {});
    });
  }
  if (closeControlsModalBtn) {
    closeControlsModalBtn.addEventListener('click', closeControlsModal);
  }
  if (dismissControlsModalBtn) {
    dismissControlsModalBtn.addEventListener('click', closeControlsModal);
  }
  if (controlsModal) {
    controlsModal.addEventListener('click', (e) => {
      if (e.target === controlsModal) {
        closeControlsModal();
      }
    });
  }

  // Magnifier / Compare Screens Zoom Controls
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', zoomIn);
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', zoomOut);
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', zoomReset);
  }

  // Global Ctrl/Cmd + Plus / Minus / 0 for magnifier
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        const previewSec = document.getElementById('previewSection');
        if (previewSec && previewSec.style.display !== 'none') {
          e.preventDefault();
          zoomIn();
        }
      } else if (e.key === '-' || e.key === '_') {
        const previewSec = document.getElementById('previewSection');
        if (previewSec && previewSec.style.display !== 'none') {
          e.preventDefault();
          zoomOut();
        }
      } else if (e.key === '0') {
        const previewSec = document.getElementById('previewSection');
        if (previewSec && previewSec.style.display !== 'none') {
          e.preventDefault();
          zoomReset();
        }
      }
    }
  });

  // Split & Merge Actions & Modal Buttons
  if (splitActiveBlockBtn) {
    splitActiveBlockBtn.addEventListener('click', () => {
      openSplitBlockModal(state.activePreviewBlock);
    });
  }
  if (mergeActiveBlockBtn) {
    mergeActiveBlockBtn.addEventListener('click', () => {
      mergeWithNextBlock();
    });
  }
  if (closeSplitModalBtn) {
    closeSplitModalBtn.addEventListener('click', closeSplitBlockModal);
  }
  if (cancelSplitModalBtn) {
    cancelSplitModalBtn.addEventListener('click', closeSplitBlockModal);
  }
  if (confirmSplitBlockBtn) {
    confirmSplitBlockBtn.addEventListener('click', applySplitBlock);
  }
  if (splitBySentenceBtn) {
    splitBySentenceBtn.addEventListener('click', () => {
      const text = splitOriginalText ? splitOriginalText.value : '';
      const periodIdx = text.indexOf('. ');
      if (periodIdx !== -1) {
        if (splitPart1Text) splitPart1Text.value = text.substring(0, periodIdx + 1).trim();
        if (splitPart2Text) splitPart2Text.value = text.substring(periodIdx + 2).trim();
      }
    });
  }
  if (splitByNewlineBtn) {
    splitByNewlineBtn.addEventListener('click', () => {
      const text = splitOriginalText ? splitOriginalText.value : '';
      const nlIdx = text.indexOf('\n');
      if (nlIdx !== -1) {
        if (splitPart1Text) splitPart1Text.value = text.substring(0, nlIdx).trim();
        if (splitPart2Text) splitPart2Text.value = text.substring(nlIdx + 1).trim();
      }
    });
  }
  if (splitByHalfBtn) {
    splitByHalfBtn.addEventListener('click', () => {
      const text = splitOriginalText ? splitOriginalText.value : '';
      const half = Math.floor(text.length / 2);
      const spaceIdx = text.indexOf(' ', half);
      if (spaceIdx !== -1) {
        if (splitPart1Text) splitPart1Text.value = text.substring(0, spaceIdx).trim();
        if (splitPart2Text) splitPart2Text.value = text.substring(spaceIdx + 1).trim();
      }
    });
  }
  if (splitBlockModal) {
    splitBlockModal.addEventListener('click', (e) => {
      if (e.target === splitBlockModal) {
        closeSplitBlockModal();
      }
    });
  }

  // Context Menu Action Listeners
  if (ctxBtnReplaceText) {
    ctxBtnReplaceText.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target) {
        openReplaceTextModal(target);
      }
    });
  }

  if (ctxBtnSplitBlock) {
    ctxBtnSplitBlock.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target) {
        const targetIdx = target.frIndex !== null && target.frIndex !== undefined
          ? target.frIndex
          : (target.enIndex !== null && target.enIndex !== undefined ? target.enIndex : state.activePreviewBlock);
        openSplitBlockModal(targetIdx);
      }
    });
  }

  if (ctxBtnDeleteText) {
    ctxBtnDeleteText.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target && target.frIndex !== null && target.frIndex !== undefined) {
        applyDeleteText(target.frIndex);
      }
    });
  }

  if (ctxBtnRemoveLink) {
    ctxBtnRemoveLink.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      // French side only, as with delete and resolve. applyRemoveHyperlink
      // returns 0 when the block has no link, so a stale menu entry is a no-op
      // rather than an error.
      if (target && target.frIndex !== null && target.frIndex !== undefined) {
        applyRemoveHyperlink(target.frIndex);
      }
    });
  }

  if (ctxBtnResolve) {
    ctxBtnResolve.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target && target.frIndex !== null && target.frIndex !== undefined) {
        applyResolveExtraText(target.frIndex);
      }
    });
  }

  if (ctxBtnJumpPair) {
    ctxBtnJumpPair.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target) {
        jumpToPairedBlock(target);
      }
    });
  }

  if (ctxBtnCopyText) {
    ctxBtnCopyText.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target) {
        copyTargetText(target);
      }
    });
  }

  if (ctxBtnPasteText) {
    ctxBtnPasteText.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = getCurrentContextMenuTarget();
      closeContextMenu();
      if (target) {
        pasteTargetText(target);
      }
    });
  }

  if (ctxBtnFocusMode) {
    ctxBtnFocusMode.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      state.focusMode = !state.focusMode;
      if (toggleFocusMode) toggleFocusMode.classList.toggle('is-active', state.focusMode);
      [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
        if (frame && frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('mode-focus', state.focusMode);
        }
      });
    });
  }

  if (ctxBtnReloadPreview) {
    ctxBtnReloadPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      buildDualIframePreviews();
    });
  }

  if (ctxBtnFind) {
    ctxBtnFind.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      const target = getCurrentContextMenuTarget();
      const pane = target ? target.side : 'fr';
      openPanelSearch(pane || 'fr');
    });
  }

  if (ctxBtnUndo) {
    ctxBtnUndo.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      undoLastEdit();
    });
  }

  if (ctxBtnNewWorkflow) {
    ctxBtnNewWorkflow.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      openStartWorkflowModal();
    });
  }

  // Replace Text Modal Listeners
  if (closeReplaceTextModalBtn) {
    closeReplaceTextModalBtn.addEventListener('click', closeReplaceTextModal);
  }
  if (cancelReplaceTextModalBtn) {
    cancelReplaceTextModalBtn.addEventListener('click', closeReplaceTextModal);
  }
  if (confirmReplaceTextBtn) {
    confirmReplaceTextBtn.addEventListener('click', confirmReplaceText);
  }
  if (replaceTextModal) {
    replaceTextModal.addEventListener('click', (e) => {
      if (e.target === replaceTextModal) {
        closeReplaceTextModal();
      }
    });
  }
  if (replaceTextInput) {
    replaceTextInput.addEventListener('input', updateReplaceCharCount);
    replaceTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        confirmReplaceText();
      }
    });
  }

  // Dismiss context menu on click outside, scroll, resize, or Escape
  document.addEventListener('pointerdown', (e) => {
    if (customContextMenu && !customContextMenu.contains(e.target)) {
      closeContextMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeContextMenu();
      closeReplaceTextModal();
      closeSplitBlockModal();
    }
  });

  window.addEventListener('scroll', closeContextMenu, true);
  window.addEventListener('resize', closeContextMenu);

  // Context menu: custom menu only inside EN or FR preview panes
  document.addEventListener('contextmenu', (e) => {
    if (e.target && typeof e.target.closest === 'function') {
      if (e.target.closest('#customContextMenu') || e.target.closest('#replaceTextModal')) return;
    }

    // Only handle right clicks inside the English or French preview panes.
    // Anywhere else: close the custom menu and allow the native browser menu.
    const enPane = (e.target && typeof e.target.closest === 'function')
      ? e.target.closest('#enPreviewPane')
      : null;
    const frPane = (e.target && typeof e.target.closest === 'function')
      ? e.target.closest('#frPreviewPane')
      : null;

    if (!enPane && !frPane) {
      closeContextMenu();
      return;
    }

    e.preventDefault();

    {
      const side = enPane ? 'en' : 'fr';

      const activeIdx = typeof state.activePreviewBlock === 'number' && state.activePreviewBlock >= 0
        ? state.activePreviewBlock
        : (state.enBlocks && state.enBlocks.length > 0 ? 0 : null);

      let pairFr = null;
      if (activeIdx !== null && state.alignRows) {
        const r = state.alignRows.find((row) => row.enIndex === activeIdx);
        if (r && r.frIndex !== null) pairFr = r.frIndex;
      }

      openContextMenu({
        kind: 'block',
        enIndex: activeIdx,
        frIndex: pairFr,
        text: activeIdx !== null && state.enBlocks[activeIdx] ? state.enBlocks[activeIdx].text : '',
        side: side,
        x: e.clientX,
        y: e.clientY
      });
      return;
    }
  });

  // Toolbar Quick-Audit Category Buttons
  if (openQaDiffBtn) {
    openQaDiffBtn.addEventListener('click', () => {
      if (state.drawerOpen && state.activeCategory === 'qa-diff') closeDrawer();
      else openDrawer('qa-diff');
    });
  }
  if (openTypographyBtn) {
    openTypographyBtn.addEventListener('click', () => {
      if (state.drawerOpen && state.activeCategory === 'typography') closeDrawer();
      else openDrawer('typography');
    });
  }
  if (openLangEnBtn) {
    openLangEnBtn.addEventListener('click', () => {
      if (state.drawerOpen && state.activeCategory === 'lang-en') closeDrawer();
      else openDrawer('lang-en');
    });
  }

  if (toggleAutoSync) {
    toggleAutoSync.addEventListener('click', () => {
      state.autoSync = !state.autoSync;
      toggleAutoSync.classList.toggle('is-active', state.autoSync);
      const span = toggleAutoSync.querySelector('span');
      if (span) span.textContent = state.autoSync ? 'Auto-sync on' : 'Auto-sync off';
      updateSyncStatusLabel();
      if (state.autoSync) {
        applyActiveHighlight();
        alignPreviewBlocks(state.activePreviewBlock);
      }
    });
  }

  if (rightBack) {
    rightBack.addEventListener('click', () => {
      nudgeSync(-1);
    });
  }

  if (rightForward) {
    rightForward.addEventListener('click', () => {
      nudgeSync(1);
    });
  }

  const resetOffset = () => {
    state.syncOffset = 0;
    updateSyncOffsetBadge();
    applyActiveHighlight();
    alignPreviewBlocks(state.activePreviewBlock);
  };

  if (syncOffsetBtn) {
    syncOffsetBtn.addEventListener('click', resetOffset);
  }

  // French Pane View Toggle (Visual vs Code)
  if (frViewVisualBtn) {
    frViewVisualBtn.addEventListener('click', () => {
      switchFrenchView('visual');
    });
  }

  if (frViewCodeBtn) {
    frViewCodeBtn.addEventListener('click', () => {
      switchFrenchView('code');
    });
  }

  if (frViewSplitBtn) {
    frViewSplitBtn.addEventListener('click', () => {
      switchFrenchView('split');
    });
  }

  if (copyEnCodeBtn) {
    let enCopyResetTimer = null;
    copyEnCodeBtn.addEventListener('click', async () => {
      if (!enCodeEditor || !enCodeEditor.value) return;
      try {
        await navigator.clipboard.writeText(enCodeEditor.value);
      } catch (_) {
        enCodeEditor.select();
        document.execCommand('copy');
      }

      if (enCopyResetTimer) clearTimeout(enCopyResetTimer);
      copyEnCodeBtn.classList.add('is-copied');
      const iconWrap = copyEnCodeBtn.querySelector('.fr-copy-icon-wrap');
      const label = copyEnCodeBtn.querySelector('.fr-copy-label');
      if (iconWrap) {
        iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 mr-1 text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>`;
      }
      if (label) label.textContent = 'Copied!';

      enCopyResetTimer = setTimeout(() => {
        copyEnCodeBtn.classList.remove('is-copied');
        if (iconWrap) {
          iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 mr-1 fr-copy-svg"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        }
        if (label) label.textContent = 'Copy';
      }, 2000);
    });
  }

  if (copyFrCodeBtn) {
    let copyResetTimer = null;
    copyFrCodeBtn.addEventListener('click', async () => {
      if (!frCodeEditor || !frCodeEditor.value) return;
      try {
        await navigator.clipboard.writeText(frCodeEditor.value);
      } catch (_) {
        frCodeEditor.select();
        document.execCommand('copy');
      }

      // Animated transform to checkmark icon
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyFrCodeBtn.classList.add('is-copied');
      const iconWrap = copyFrCodeBtn.querySelector('.fr-copy-icon-wrap');
      const label = copyFrCodeBtn.querySelector('.fr-copy-label');
      if (iconWrap) {
        iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 mr-1 text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>`;
      }
      if (label) {
        label.textContent = 'Copied!';
      }

      copyResetTimer = setTimeout(() => {
        copyFrCodeBtn.classList.remove('is-copied');
        if (iconWrap) {
          iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 mr-1 fr-copy-svg"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        }
        if (label) {
          label.textContent = 'Copy';
        }
      }, 2000);
    });
  }

  const wrapEnCodeBtn = getEl('wrapEnCodeBtn');
  const wrapFrCodeBtn = getEl('wrapFrCodeBtn');
  const wrapPanes = [
    { btn: wrapEnCodeBtn, boxId: 'enCodeEditorBox', editor: enCodeEditor },
    { btn: wrapFrCodeBtn, boxId: 'frCodeEditorBox', editor: frCodeEditor },
  ].filter((entry) => entry.btn);
  const setCodeWrap = (wrapped) => {
    wrapPanes.forEach(({ btn, boxId, editor }) => {
      btn.classList.toggle('is-active', wrapped);
      btn.setAttribute('aria-pressed', wrapped ? 'true' : 'false');
      const box = getEl(boxId);
      if (box) box.classList.toggle('is-wrapped', wrapped);
      if (editor) {
        try {
          editor.setAttribute('wrap', wrapped ? 'soft' : 'off');
        } catch (_) {}
      }
    });
    // Wrapping changes how tall a line is, and code-view derives every
    // scroll<->line conversion from a measured line height. Drop the cached
    // measurement so the next read re-measures in the new mode.
    if (typeof window !== 'undefined' && typeof window.resetCodeLineHeight === 'function') {
      window.resetCodeLineHeight();
    }
    // Re-measure the gutter rows: wrapped lines occupy more rows than logical
    // lines, so the 1:1 row mapping has to be rebuilt for the new mode.
    if (typeof window !== 'undefined' && typeof window.__relayoutCodeGutters === 'function') {
      window.__relayoutCodeGutters();
    }
  };
  wrapPanes.forEach(({ btn }) => {
    btn.addEventListener('click', () => {
      setCodeWrap(!btn.classList.contains('is-active'));
    });
  });

  if (formatFrCodeBtn) {
    formatFrCodeBtn.addEventListener('click', () => {
      if (!frCodeEditor) return;
      frCodeEditor.value = formatHtmlCode(frCodeEditor.value);
      state.frCodeModified = true;
      updateFrCodeView();
    });
  }

  if (frCodeEditor) {
    frCodeEditor.addEventListener('input', () => {
      state.frCodeModified = true;
      updateFrCodeView();
    });

    frCodeEditor.addEventListener('scroll', syncFrCodeScroll);
    frCodeEditor.addEventListener('click', syncFrCodeScroll);
    frCodeEditor.addEventListener('keyup', syncFrCodeScroll);
    frCodeEditor.addEventListener('select', syncFrCodeScroll);
    frCodeEditor.addEventListener('focus', syncFrCodeScroll);

    // Support tab indent in code editor
    frCodeEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = frCodeEditor.selectionStart;
        const end = frCodeEditor.selectionEnd;
        frCodeEditor.value = frCodeEditor.value.substring(0, start) + '  ' + frCodeEditor.value.substring(end);
        frCodeEditor.selectionStart = frCodeEditor.selectionEnd = start + 2;
        state.frCodeModified = true;
        updateFrCodeView();
      }
      requestAnimationFrame(syncFrCodeScroll);
    });
  }

  if (downloadFrCodeBtn) {
    downloadFrCodeBtn.addEventListener('click', () => {
      const code = frCodeEditor && frCodeEditor.value ? frCodeEditor.value : generateFrenchHtmlSource();
      if (!code) {
        showToast('No French HTML to download');
        return;
      }
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (state.frDocxName.replace(/\.docx$/i, '') || 'french-localized') + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Health Pill quick drawer open
  if (healthPill) {
    healthPill.addEventListener('click', () => {
      if (state.drawerOpen) {
        closeDrawer();
      } else {
        // Conversion is a report, not a defect list, so it only takes the pill
        // as the landing tab when a heading was actually not carried over.
        const notCarriedOver = (state.issueGroups.mismatch || []).filter((m) => m.lossy).length;
        const cat = state.issueGroups.missing.length > 0 ? 'missing' : notCarriedOver > 0 ? 'mismatch' : 'qa-diff';
        openDrawer(cat);
      }
    });
  }

  // Segmented Bar Tabs (open the matching QA drawer category)
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-category');
      if (state.drawerOpen && state.activeCategory === cat) {
        closeDrawer();
      } else {
        openDrawer(cat);
      }
    });
  });

  // "N clear" chip: expand / collapse zero-issue categories on the QA bar
  const qaClearChip = getEl('qaClearChip');
  if (qaClearChip) {
    qaClearChip.addEventListener('click', () => {
      state.qaDockExpanded = !state.qaDockExpanded;
      renderStatsBar();
    });
  }

  // Drawer Header Category Buttons
  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-category');
      openDrawer(cat);
    });
  });

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawer);
  }

  // Active Block Stepper & Popover Jump
  if (prevBlockBtn) {
    prevBlockBtn.addEventListener('click', () => {
      if (state.activePreviewBlock > 0) {
        jumpToBlock(state.activePreviewBlock - 1);
      }
    });
  }

  if (nextBlockBtn) {
    nextBlockBtn.addEventListener('click', () => {
      if (state.activePreviewBlock < state.enBlocks.length - 1) {
        jumpToBlock(state.activePreviewBlock + 1);
      }
    });
  }

  // Block number is edited in place: Enter jumps, Escape/blur reverts.
  if (blockNumInput) {
    const revertBlockNumInput = () => {
      blockNumInput.value = String(state.activePreviewBlock + 1);
    };
    if (blockJumpToggleBtn) {
      blockJumpToggleBtn.addEventListener('click', (e) => {
        if (e.target !== blockNumInput) {
          blockNumInput.focus();
          blockNumInput.select();
        }
      });
    }
    blockNumInput.addEventListener('focus', () => {
      blockNumInput.select();
    });
    blockNumInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const val = parseInt(blockNumInput.value, 10);
        if (!isNaN(val) && val >= 1 && val <= state.enBlocks.length) {
          jumpToBlock(val - 1);
        } else {
          revertBlockNumInput();
        }
        blockNumInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        revertBlockNumInput();
        blockNumInput.blur();
      }
    });
    blockNumInput.addEventListener('blur', () => {
      revertBlockNumInput();
    });
  }

  // Start New Workflow Button & Modal
  if (startNewWorkflowBtn) {
    startNewWorkflowBtn.addEventListener('click', openStartWorkflowModal);
  }
  if (closeStartWorkflowModalBtn) {
    closeStartWorkflowModalBtn.addEventListener('click', closeStartWorkflowModal);
  }
  if (cancelStartWorkflowBtn) {
    cancelStartWorkflowBtn.addEventListener('click', closeStartWorkflowModal);
  }
  if (confirmStartWorkflowBtn) {
    confirmStartWorkflowBtn.addEventListener('click', resetToNewWorkflow);
  }
  if (startWorkflowModal) {
    startWorkflowModal.addEventListener('click', (e) => {
      if (e.target === startWorkflowModal) {
        closeStartWorkflowModal();
      }
    });
  }

  // Initialize Per-Panel In-Preview Search Listeners
  initPanelSearchListeners();

  // Hover tracking for independent scrolling
  const enPaneEl = document.querySelector('.preview-pane:first-child');
  const frPaneEl = document.getElementById('frPreviewPane');
  if (enPaneEl) {
    enPaneEl.addEventListener('mouseenter', () => { setHoveredFrame(enPreviewFrame); });
    enPaneEl.addEventListener('mousemove', () => { setHoveredFrame(enPreviewFrame); });
  }
  if (frPaneEl) {
    frPaneEl.addEventListener('mouseenter', () => { setHoveredFrame(frPreviewFrame); });
    frPaneEl.addEventListener('mousemove', () => { setHoveredFrame(frPreviewFrame); });
  }

  // Workspace Wheel Navigation (1 notch = 1 block step when cursor is over preview area)
  const workspaceEl = document.getElementById('workspace');
  if (workspaceEl) {
    workspaceEl.addEventListener('wheel', (e) => handleWheelNavigation(e), { passive: false });
  }

  // Global Alt key detection to pause sync
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' && !e.repeat) {
      if (!state.syncPaused) showHeaderNote('Sync paused — panes scroll independently', 'paused');
      state.syncPaused = true;
      updateSyncStatusLabel();
    }
    handleKeyNavigation(e);
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      if (state.syncPaused) showHeaderNote('Sync resumed', 'live');
      state.syncPaused = false;
      updateSyncStatusLabel();
    }
  });

  window.addEventListener('blur', () => {
    state.syncPaused = false;
    updateSyncStatusLabel();
  });

  // Mouse-pressed buttons must not keep focus: the sticky native focus ring
  // (orange) would linger on the clicked toggle while arrow-keying through
  // blocks. preventDefault on mousedown stops the focus without stopping the
  // click; keyboard focus via Tab is unaffected, so :focus-visible styling
  // still serves keyboard users. Inputs and editable areas are excluded.
  document.addEventListener('mousedown', (e) => {
    try {
      if (e.button !== 0) return;
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (t.closest('button')) e.preventDefault();
    } catch (_) {}
  });
}
