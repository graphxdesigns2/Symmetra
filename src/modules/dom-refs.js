const themeToggle = document.getElementById('themeToggle');

const titleBar = document.getElementById('title-bar');

const btnMinimize = document.getElementById('btn-minimize');

const btnMaximize = document.getElementById('btn-maximize');

const btnClose = document.getElementById('btn-close');

const themeThumbIcon = document.getElementById('themeThumbIcon');

const zoomControlGroup = document.getElementById('zoomControlGroup');

const zoomInBtn = document.getElementById('zoomInBtn');

const zoomOutBtn = document.getElementById('zoomOutBtn');

const zoomResetBtn = document.getElementById('zoomResetBtn');

const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');

const htmlInput = document.getElementById('htmlInput');

const htmlInputHighlight = document.getElementById('htmlInputHighlight');

const htmlInputHighlightInner = document.getElementById('htmlInputHighlightInner');

const htmlInputGutter = document.getElementById('htmlInputGutter');

const clearHtmlBtn = document.getElementById('clearHtmlBtn');

const clearDocxBtn = document.getElementById('clearDocxBtn');

const parseHtmlBtn = document.getElementById('parseHtmlBtn');

const loadSampleEnBtn = document.getElementById('loadSampleEnBtn');

const htmlStat = document.getElementById('htmlStat');

const dropzone = document.getElementById('dropzone');

const dropzoneMain = document.getElementById('dropzoneMain');

const docxFile = document.getElementById('docxFile');

const docxStat = document.getElementById('docxStat');

const docxStatWrap = document.getElementById('docxStatWrap');

const loadSampleFrBtn = document.getElementById('loadSampleFrBtn');

const appHeader = document.getElementById('appHeader');

const navSourcesCondensed = document.getElementById('navSourcesCondensed');

const sourceUploadSection = document.getElementById('sourceUploadSection');

const condensedEnStat = document.getElementById('condensedEnStat');

const condensedFrStat = document.getElementById('condensedFrStat');

const expandSourcesBtn = document.getElementById('expandSourcesBtn');

const collapseSourcesBtn = document.getElementById('collapseSourcesBtn');

const alignBtn = document.getElementById('alignBtn');

const previewSection = document.getElementById('previewSection');

const workspace = document.getElementById('workspace');

const toggleWordDocBtn = document.getElementById('toggleWordDocBtn');

const toggleFocusMode = document.getElementById('toggleFocusMode');

const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');

const toggleBlurMode = document.getElementById('toggleBlurMode');

const toggleHighlightBox = document.getElementById('toggleHighlightBox');

const openQaDiffBtn = document.getElementById('openQaDiffBtn');

const openTypographyBtn = document.getElementById('openTypographyBtn');

const openLangEnBtn = document.getElementById('openLangEnBtn');

const openControlsModalBtn = document.getElementById('openControlsModalBtn');

const closeControlsModalBtn = document.getElementById('closeControlsModalBtn');

const dismissControlsModalBtn = document.getElementById('dismissControlsModalBtn');

const controlsModal = document.getElementById('controlsModal');

const toggleAutoSync = document.getElementById('toggleAutoSync');

const rightBack = document.getElementById('rightBack');

const rightForward = document.getElementById('rightForward');

const syncOffsetBtn = document.getElementById('syncOffsetBtn');

const enBlockCountBadge = document.getElementById('enBlockCountBadge');

const frBlockCountBadge = document.getElementById('frBlockCountBadge');

const enSyncStatus = document.getElementById('enSyncStatus');

const frSyncStatus = document.getElementById('frSyncStatus');

const enPreviewFrame = document.getElementById('enPreviewFrame');

const enCodeWrap = document.getElementById('enCodeWrap');

const enCodeEditorBox = document.getElementById('enCodeEditorBox');

const enCodeEditor = document.getElementById('enCodeEditor');

const enCodeHighlight = document.getElementById('enCodeHighlight');

const enCodeHighlightInner = document.getElementById('enCodeHighlightInner');

const enCodeGutter = document.getElementById('enCodeGutter');

const enCodeStats = document.getElementById('enCodeStats');

const enCollapsePaneBtn = document.getElementById('enCollapsePaneBtn');

const enExpandPaneBtn = document.getElementById('enExpandPaneBtn');

const frPreviewFrame = document.getElementById('frPreviewFrame');

const docxPreviewPane = document.getElementById('docxPreviewPane');

const docxBlockCountBadge = document.getElementById('docxBlockCountBadge');

const closeWordDocPaneBtn = document.getElementById('closeWordDocPaneBtn');

const docxPreviewFrame = document.getElementById('docxPreviewFrame');

const frPaneTitle = document.getElementById('frPaneTitle');

const frViewVisualBtn = document.getElementById('frViewVisualBtn');

const frViewCodeBtn = document.getElementById('frViewCodeBtn');

const frViewSplitBtn = document.getElementById('frViewSplitBtn');

const frCodeWrap = document.getElementById('frCodeWrap');

const frCodeEditorBox = document.getElementById('frCodeEditorBox');

const frCodeGutter = document.getElementById('frCodeGutter');

const frCodeHighlight = document.getElementById('frCodeHighlight');

const frCodeHighlightInner = document.getElementById('frCodeHighlightInner');

const frCodeEditor = document.getElementById('frCodeEditor');

const frCodeStats = document.getElementById('frCodeStats');

const copyFrCodeBtn = document.getElementById('copyFrCodeBtn');

const formatFrCodeBtn = document.getElementById('formatFrCodeBtn');

const statDetailPanel = document.getElementById('statDetailPanel');

const drawerBody = document.getElementById('drawerBody');

const closeDrawerBtn = document.getElementById('closeDrawerBtn');

const healthPill = document.getElementById('healthPill');

const cQaDiff = document.getElementById('cQaDiff');

const cLinks = document.getElementById('cLinks');

const cHeadings = document.getElementById('cHeadings');

const cAlt = document.getElementById('cAlt');

const cTypo = document.getElementById('cTypo');

const cLangEn = document.getElementById('cLangEn');

const cTables = document.getElementById('cTables');

const cMismatch = document.getElementById('cMismatch');

const cMissing = document.getElementById('cMissing');

const cExtra = document.getElementById('cExtra');

const cSkip = document.getElementById('cSkip');

const splitActiveBlockBtn = document.getElementById('splitActiveBlockBtn');

const mergeActiveBlockBtn = document.getElementById('mergeActiveBlockBtn');

const activeBlockHudText = document.getElementById('activeBlockHudText');

const activeBlockHudTotal = document.getElementById('activeBlockHudTotal');

const activeBlockHudTag = document.getElementById('activeBlockHudTag');

const blockJumpToggleBtn = document.getElementById('blockJumpToggleBtn');

const prevBlockBtn = document.getElementById('prevBlockBtn');

const nextBlockBtn = document.getElementById('nextBlockBtn');

const syncOffsetBadge = document.getElementById('syncOffsetBadge');

const splitBlockModal = document.getElementById('splitBlockModal');

const splitBlockSubTitle = document.getElementById('splitBlockSubTitle');

const splitOriginalText = document.getElementById('splitOriginalText');

const splitPart1Text = document.getElementById('splitPart1Text');

const splitPart2Text = document.getElementById('splitPart2Text');

const closeSplitModalBtn = document.getElementById('closeSplitModalBtn');

const cancelSplitModalBtn = document.getElementById('cancelSplitModalBtn');

const confirmSplitBlockBtn = document.getElementById('confirmSplitBlockBtn');

const splitBySentenceBtn = document.getElementById('splitBySentenceBtn');

const splitByNewlineBtn = document.getElementById('splitByNewlineBtn');

const splitByHalfBtn = document.getElementById('splitByHalfBtn');

const customContextMenu = document.getElementById('customContextMenu');

const ctxMenuHeader = document.getElementById('ctxMenuHeader');

const ctxMenuIcon = document.getElementById('ctxMenuIcon');

const ctxMenuTitle = document.getElementById('ctxMenuTitle');

const ctxMenuBlockBadge = document.getElementById('ctxMenuBlockBadge');

const ctxBtnReplaceText = document.getElementById('ctxBtnReplaceText');

const ctxBtnReplaceTextLabel = document.getElementById('ctxBtnReplaceTextLabel');

const ctxBtnSplitBlock = document.getElementById('ctxBtnSplitBlock');

const ctxBtnRemoveLink = document.getElementById('ctxBtnRemoveLink');

const ctxBtnRemoveLinkLabel = document.getElementById('ctxBtnRemoveLinkLabel');

const ctxBtnResolve = document.getElementById('ctxBtnResolve');

const ctxBtnDeleteText = document.getElementById('ctxBtnDeleteText');

const ctxBtnDeleteTextLabel = document.getElementById('ctxBtnDeleteTextLabel');

const ctxBtnJumpPair = document.getElementById('ctxBtnJumpPair');

const ctxBtnJumpPairLabel = document.getElementById('ctxBtnJumpPairLabel');

const ctxBtnCopyText = document.getElementById('ctxBtnCopyText');

const ctxBtnCopyTextLabel = document.getElementById('ctxBtnCopyTextLabel');

const ctxBtnPasteText = document.getElementById('ctxBtnPasteText');

const ctxBtnFocusMode = document.getElementById('ctxBtnFocusMode');

const ctxBtnReloadPreview = document.getElementById('ctxBtnReloadPreview');

const ctxBtnFind = document.getElementById('ctxBtnFind');

const ctxBtnUndo = document.getElementById('ctxBtnUndo');

const ctxBtnNewWorkflow = document.getElementById('ctxBtnNewWorkflow');

const replaceTextModal = document.getElementById('replaceTextModal');

const replaceTextModalTitle = document.getElementById('replaceTextModalTitle');

const replaceTextSubTitle = document.getElementById('replaceTextSubTitle');

const closeReplaceTextModalBtn = document.getElementById('closeReplaceTextModalBtn');

const cancelReplaceTextModalBtn = document.getElementById('cancelReplaceTextModalBtn');

const confirmReplaceTextBtn = document.getElementById('confirmReplaceTextBtn');

const replaceEnglishRefBox = document.getElementById('replaceEnglishRefBox');

const replaceEnglishRefText = document.getElementById('replaceEnglishRefText');

const replaceInputLabel = document.getElementById('replaceInputLabel');

const replaceTextInput = document.getElementById('replaceTextInput');

const replaceTextCharCount = document.getElementById('replaceTextCharCount');

const downloadFrCodeBtn = document.getElementById('downloadFrCodeBtn');

const toast = document.getElementById('toast');

const tutorialConfirmModal = document.getElementById('tutorialConfirmModal');

const confirmTutorialBtn = document.getElementById('confirmTutorialBtn');

const cancelTutorialConfirmBtn = document.getElementById('cancelTutorialConfirmBtn');

const closeTutorialConfirmBtn = document.getElementById('closeTutorialConfirmBtn');

const tourBackBtn = document.getElementById('tourBackBtn');

const tourBody = document.getElementById('tourBody');

const tourCard = document.getElementById('tourCard');

const tourHighlight = document.getElementById('tourHighlight');

const tourHighlight2 = document.getElementById('tourHighlight2');

const tourNextBtn = document.getElementById('tourNextBtn');

const tourOverlay = document.getElementById('tourOverlay');

const tourSkipBtn = document.getElementById('tourSkipBtn');

const tourStep = document.getElementById('tourStep');

const tourTitle = document.getElementById('tourTitle');

const startNewWorkflowBtn = document.getElementById('startNewWorkflowBtn');

const startWorkflowModal = document.getElementById('startWorkflowModal');

const closeStartWorkflowModalBtn = document.getElementById('closeStartWorkflowModalBtn');

const cancelStartWorkflowBtn = document.getElementById('cancelStartWorkflowBtn');

const confirmStartWorkflowBtn = document.getElementById('confirmStartWorkflowBtn');

export {
  activeBlockHudTag,
  activeBlockHudText,
  activeBlockHudTotal,
  alignBtn,
  appHeader,
  blockJumpToggleBtn,
  btnClose,
  btnMaximize,
  btnMinimize,
  cAlt,
  cExtra,
  cHeadings,
  cLangEn,
  cLinks,
  cMismatch,
  cMissing,
  cQaDiff,
  cSkip,
  cTables,
  cTypo,
  cancelReplaceTextModalBtn,
  cancelSplitModalBtn,
  cancelStartWorkflowBtn,
  cancelTutorialConfirmBtn,
  clearDocxBtn,
  clearHtmlBtn,
  closeControlsModalBtn,
  closeDrawerBtn,
  closeReplaceTextModalBtn,
  closeSplitModalBtn,
  closeStartWorkflowModalBtn,
  closeTutorialConfirmBtn,
  closeWordDocPaneBtn,
  collapseSourcesBtn,
  condensedEnStat,
  condensedFrStat,
  confirmReplaceTextBtn,
  confirmSplitBlockBtn,
  confirmStartWorkflowBtn,
  confirmTutorialBtn,
  controlsModal,
  copyFrCodeBtn,
  ctxBtnCopyText,
  ctxBtnCopyTextLabel,
  ctxBtnDeleteText,
  ctxBtnDeleteTextLabel,
  ctxBtnFind,
  ctxBtnFocusMode,
  ctxBtnJumpPair,
  ctxBtnJumpPairLabel,
  ctxBtnNewWorkflow,
  ctxBtnPasteText,
  ctxBtnReloadPreview,
  ctxBtnReplaceText,
  ctxBtnReplaceTextLabel,
  ctxBtnResolve,
  ctxBtnRemoveLink,
  ctxBtnRemoveLinkLabel,
  ctxBtnSplitBlock,
  ctxBtnUndo,
  ctxMenuBlockBadge,
  ctxMenuHeader,
  ctxMenuIcon,
  ctxMenuTitle,
  customContextMenu,
  dismissControlsModalBtn,
  docxBlockCountBadge,
  docxFile,
  docxPreviewFrame,
  docxPreviewPane,
  docxStat,
  docxStatWrap,
  downloadFrCodeBtn,
  drawerBody,
  dropzone,
  dropzoneMain,
  enBlockCountBadge,
  enCodeEditor,
  enCodeEditorBox,
  enCodeHighlight,
  enCodeHighlightInner,
  enCodeGutter,
  enCodeStats,
  enCodeWrap,
  enCollapsePaneBtn,
  enExpandPaneBtn,
  enPreviewFrame,
  enSyncStatus,
  expandSourcesBtn,
  formatFrCodeBtn,
  frBlockCountBadge,
  frCodeEditor,
  frCodeEditorBox,
  frCodeGutter,
  frCodeHighlight,
  frCodeHighlightInner,
  frCodeStats,
  frCodeWrap,
  frPaneTitle,
  frPreviewFrame,
  frSyncStatus,
  frViewCodeBtn,
  frViewSplitBtn,
  frViewVisualBtn,
  healthPill,
  htmlInput,
  htmlInputGutter,
  htmlInputHighlight,
  htmlInputHighlightInner,
  htmlStat,
  loadSampleEnBtn,
  loadSampleFrBtn,
  mergeActiveBlockBtn,
  navSourcesCondensed,
  nextBlockBtn,
  openControlsModalBtn,
  openLangEnBtn,
  openQaDiffBtn,
  openTypographyBtn,
  parseHtmlBtn,
  prevBlockBtn,
  previewSection,
  replaceEnglishRefBox,
  replaceEnglishRefText,
  replaceInputLabel,
  replaceTextCharCount,
  replaceTextInput,
  replaceTextModal,
  replaceTextModalTitle,
  replaceTextSubTitle,
  rightBack,
  rightForward,
  sourceUploadSection,
  splitActiveBlockBtn,
  splitBlockModal,
  splitBlockSubTitle,
  splitByHalfBtn,
  splitByNewlineBtn,
  splitBySentenceBtn,
  splitOriginalText,
  splitPart1Text,
  splitPart2Text,
  startNewWorkflowBtn,
  startWorkflowModal,
  statDetailPanel,
  syncOffsetBadge,
  syncOffsetBtn,
  themeThumbIcon,
  themeToggle,
  titleBar,
  toast,
  toggleAutoSync,
  toggleBlurMode,
  toggleFocusMode,
  toggleFullscreenBtn,
  toggleHighlightBox,
  toggleWordDocBtn,
  tourBackBtn,
  tourBody,
  tourCard,
  tourHighlight,
  tourHighlight2,
  tourNextBtn,
  tourOverlay,
  tourSkipBtn,
  tourStep,
  tourTitle,
  tutorialConfirmModal,
  zoomControlGroup,
  zoomInBtn,
  zoomLevelDisplay,
  zoomOutBtn,
  zoomResetBtn,
  workspace,
};
