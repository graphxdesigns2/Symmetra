// Guided product tour: dimmed spotlight + highlight ring + tooltip card.
// Dependency-free. Steps whose targets are hidden (e.g. preview steps with
// no alignment loaded) are skipped automatically.
import {
  cancelTutorialConfirmBtn,
  closeTutorialConfirmBtn,
  confirmTutorialBtn,
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
  previewSection,
  toggleBlurMode,
  toggleFocusMode,
  toggleHighlightBox,
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
} from './dom-refs.js';
import {
  state,
} from './state.ts';
import {
  applyActiveHighlight,
  findTopIndexForFrame,
  getSyncItems,
  jumpToBlock,
  programmaticScrollEls,
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  updateDetailsStateForActiveBlock,
} from './details-sync.js';
import {
  resetToNewWorkflow,
} from './workflow-modal.js';
import {
  isPreviewFullscreen,
  setPreviewFullscreen,
} from './fullscreen.js';
import {
  switchFrenchView,
} from './code-view.js';
import {
  expandEnPane,
  isEnPaneCollapsed,
} from './pane-visibility.js';

const CARD_WIDTH = 340;
const HIGHLIGHT_PAD = 6;
const CARD_GAP = 12;
const WAIT_POLL_MS = 300;
const WAIT_MAX_TRIES = 40;
const REFRESH_MS = 250;

const steps = [
  {
    title: 'Take a tour of Symmetra',
    body: 'A guided walkthrough — we will load sample documents and build the preview together. Takes about 6 minutes.',
  },
  {
    selector: '#startNewWorkflowBtn',
    title: 'Start new workflow',
    body: 'After clicking the button to preview and align, this button will wipe the inputs and alignment for a clean run.',
  },
  {
    selector: '#openControlsModalBtn',
    title: 'Controls & Help',
    body: 'Shortcuts, tips, and reference for every view and control.',
  },
  {
    selector: '#sourceHtmlPanel',
    title: 'Paste your English HTML',
    body: 'Paste your formatted English HTML here. Ensure your code passes validation and all classes have been applied to your code.',
    centerOnTarget: true,
  },
  {
    selector: '#loadSampleEnBtn',
    awaitClick: '#loadSampleEnBtn',
    title: 'Load the English sample',
    body: 'Click Load sample template to continue — the text area below will populate with sample code.',
    pauseAfterMs: 2000,
    postClickCutout: '#sourceHtmlPanel',
  },
  {
    selector: '#dropzone',
    title: 'Upload the French Word file',
    body: 'Drop the translated .docx anywhere in this box. It is parsed locally within the application.',
  },
  {
    selector: '#loadSampleFrBtn',
    awaitClick: '#loadSampleFrBtn',
    title: 'Load the French sample',
    body: 'Click Load sample French text to continue — a french equivalent document will be uploaded.',
    pauseAfterMs: 2000,
    postClickCutout: '#docxPanel',
  },
  {
    selectors: ['#htmlStat', '#docxStat'],
    title: 'Two streams, counted',
    whiteCounts: true,
    body: () => {
      const en = state.enBlocks ? state.enBlocks.length : 0;
      const fr = state.frBlocks ? state.frBlocks.length : 0;
      return `English carries ${en} block${en === 1 ? '' : 's'}, French carries ${fr} block${fr === 1 ? '' : 's'}. Each pair becomes one aligned row in the preview — matching counts mean a clean one-to-one alignment.`;
    },
  },
  {
    selector: '#alignBtn',
    awaitClick: '#alignBtn',
    title: 'Preview & Align',
    body: 'Needs both streams filled — the border spins once it is ready. Click it to continue and build the preview.',
  },
  {
    selector: '#enPreviewPane',
    title: 'Side-by-side previews',
    body: 'English source will appear on the left showing a visual representation of the formatted code you created.',
    cardSide: 'right',
    waitFor: () => {
      const ps = document.getElementById('previewSection');
      const fr = document.getElementById('enPreviewFrame');
      return !!(ps && ps.classList.contains('show') && fr && fr.contentDocument && fr.contentDocument.body && fr.contentDocument.body.childElementCount > 0);
    },
  },
  {
    selector: '#frPreviewPane',
    title: 'French aligned document',
    body: 'French aligned document will appear on the right side. Generating a visual using the English formatted code.',
    cardSide: 'left',
  },
  {
    selector: '#toggleFocusMode',
    title: 'Focus mode',
    awaitClick: '#toggleFocusMode',
    demoAfterClick: 4000,
    demoBlocks: 5,
    awaitOffAfterDemo: true,
    ensureModesOff: ['focus', 'blur'],
    awaitOffBody: 'Glide done — 5 blocks down. Click Focus mode again to turn it off and continue.',
    body: 'Dims every block except the active one. Click it, then watch the preview glide down 5 blocks.',
  },
  {
    selector: '#toggleBlurMode',
    title: 'Blur mode',
    awaitClick: '#toggleBlurMode',
    demoAfterClick: 4000,
    demoBlocks: 5,
    ensureModesOff: ['focus', 'blur'],
    body: 'Blurs inactive blocks into the background while you read the active one. Click it, then watch the preview glide down 5 blocks. We will leave it on for the next step.',
  },
  {
    selector: '#toggleFocusMode',
    title: 'Both together',
    body: 'Blur is on and focus is off. Click Focus mode again to turn both on — then watch it glide down 5 blocks. Both modes will turn off when we move on.',
    awaitClick: '#toggleFocusMode',
    demoAfterClick: 4000,
    demoBlocks: 5,
    ensureModes: ['blur'],
    ensureModesOff: ['focus'],
    modesOffAfterDemo: ['focus', 'blur'],
  },
  {
    selector: '#toggleHighlightBox',
    title: 'Active box',
    body: 'Toggles the outline around the active block. Click it to turn the box off, then watch the preview glide down 5 blocks.',
    awaitClick: '#toggleHighlightBox',
    demoAfterClick: 4000,
    demoBlocks: 5,
    awaitOffAfterDemo: true,
    ensureHighlightBox: true,
    awaitOffBody: 'Glide done — 5 blocks down. Click the box again to turn it back on and continue.',
  },
  {
    selectors: ['#frViewVisualBtn'],
    unionHighlight: ['#enPreviewPane', '#frPreviewPane'],
    title: 'Visual view',
    body: 'Visual shows the rendered French preview with live editing & the English. You are already on it — hit Next to continue.',
    scrollToBlockOnShow: 0,
  },
  {
    selectors: ['#frViewCodeBtn'],
    unionHighlight: ['#enPreviewPane', '#frPreviewPane'],
    title: 'Code view',
    body: 'Code shows the English & French HTML behind the preview. Click Code to continue.',
    awaitClick: '#frViewCodeBtn',
  },
  {
    selectors: ['#wrapEnCodeBtn', '#wrapFrCodeBtn'],
    unionHighlight: ['#enPreviewPane', '#frPreviewPane'],
    title: 'Code wrap',
    body: 'Wrap is on by default so long lines stay readable in the code editors. Click either Wrap button to toggle it.',
    awaitClick: '#wrapFrCodeBtn, #wrapEnCodeBtn',
  },
  {
    selectors: ['#copyEnCodeBtn', '#copyFrCodeBtn'],
    unionHighlight: ['#enPreviewPane', '#frPreviewPane'],
    title: 'Copy code',
    body: 'Copy grabs HTML from either code editor to your clipboard for pasting elsewhere. Click a Copy button to try it.',
    awaitClick: '#copyFrCodeBtn, #copyEnCodeBtn',
    pauseAfterMs: 2200,
  },
  {
    selector: '#frViewSplitBtn',
    title: 'Split view',
    body: 'Split shows both views at once — Click Split to see them side by side, then continue.',
    awaitClick: '#frViewSplitBtn',
    awaitOffSelector: '#frViewSplitBtn',
    awaitOffBody: 'The visual preview is on top and the code view is on the bottom.',
    undimAfterClick: true,
    showNextInPhaseTwo: true,
  },
  {
    selector: '#zoomControlGroup',
    unionHighlight: ['#enPreviewPane', '#frPreviewPane'],
    title: 'Preview zoom',
    body: 'Scale the compare screens without touching your data. Click zoom out (−) once to try it.',
    awaitClick: '#zoomOutBtn',
    awaitOffSelector: '#zoomInBtn',
    awaitOffBody: 'Zoomed out. Now click zoom in (+) to return to normal and continue.',
    lockZoomButtons: true,
  },
  {
    selector: '#toggleWordDocBtn',
    title: 'Word doc pane',
    body: 'Opens the original Word document as a third pane for reference.',
  },
  {
    selector: '#toggleFullscreenBtn',
    title: 'Fullscreen',
    body: 'Hides the inputs and panels for a full-height preview workspace. Click it to enter fullscreen.',
    awaitClick: '#toggleFullscreenBtn',
    awaitOffAfterDemo: true,
    ensureFullscreenOff: true,
    undimAfterClick: true,
    keepSelectorRingWhenUndimmed: true,
    awaitOffBody: 'You are in fullscreen mode, feel free to scroll around. Click the button again to exit and continue.',
  },
  {
    awaitKey: 'Alt',
    title: 'Pause sync',
    body: 'Hold Alt to scroll panes independently — the status dot turns orange. While holding Alt, scroll either preview, then release Alt to continue.',
    awaitKeyHeldBody: 'Alt held — scroll either preview, then release Alt to continue.',
    awaitKeyNoScrollBody: 'You let go without scrolling — hold Alt again, scroll either preview, then release to continue.',
    pauseAfterKeyMs: 2000,
    switchToVisualOnShow: true,
    overlayClickThrough: true,
    clipOnly: ['#enPreviewPane', '#frPreviewPane'],
    cardAbove: '#previewStatsBar',
  },
  {
    selector: '#toggleAutoSync',
    title: 'Stay in sync',
    body: 'Auto-sync is what keeps the English & French previews in sync. Toggle it here to scroll independently on each side.',
  },
  {
    selector: '#syncStepper',
    title: 'Nudge and reset',
    body: 'Step the French pane a block at a time with − 1 / + 1, or click the offset in the middle to reset and recenter on the active block.',
  },
  {
    selector: '#frOpenSearchBtn',
    title: 'Find in pane',
    body: 'In-panel search with match counts and keyboard navigation, per preview pane.',
  },
  {
    selector: '#enCollapsePaneBtn',
    title: 'Collapse pane',
    body: 'Tuck the English pane away to give the French preview the full width. Click Collapse to try it.',
    awaitClick: '#enCollapsePaneBtn',
    awaitOffSelector: '#enExpandPaneBtn',
    awaitOffHighlight: '#enExpandPaneBtn',
    awaitOffBody: 'English is tucked away. Click the EN tab to pull it back out and continue.',
    ensureEnPaneExpanded: true,
  },
  {
    selector: '#previewStatsBar',
    title: 'Issues at a glance',
    body: 'QA counters live here; open the drawer tabs below for the full breakdown.',
  },
  {
    selector: '#blockJumpToggleBtn',
    title: 'Block navigator',
    body: 'Shows your position — block number, total, and tag. Type a number and press Enter to jump straight there.',
  },
  {
    selector: '#startNewWorkflowBtn',
    awaitClick: '#startNewWorkflowBtn',
    title: "You're set",
    body: "That's the loop: sources in, aligned pair out. Click Start new workflow to exit — it resets everything for a clean run.",
  },
];

let idx = -1;
let skippedIdx = new Set();
let onResize = null;
let onKey = null;
let awaitListener = null;
let waitTimer = 0;
let waitTries = 0;
let refreshTimer = 0;
let autoTimer = 0;
let pauseTimer = 0;
let keyListener = null;
let keyUpListener = null;
let demoToken = 0;
const extraHighlights = [];

function targetRect(step) {
  if (!step.selector) return null;
  let el = null;
  try {
    el = document.querySelector(step.selector);
  } catch (_) {
    return null;
  }
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return r;
}

function rectForSelector(sel) {
  let el = null;
  try {
    el = document.querySelector(sel);
  } catch (_) {
    el = null;
  }
  if (el && el.isConnected) {
    const r = el.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) return r;
  }
  return null;
}

function stepRects(step) {
  // Second phase of a two-control interaction can spotlight a different
  // control than the first click (e.g. the reopen tab after collapsing).
  if (step._awaitingOff && step.awaitOffHighlight) {
    const sels = Array.isArray(step.awaitOffHighlight) ? step.awaitOffHighlight : [step.awaitOffHighlight];
    const out = [];
    sels.forEach((sel) => {
      const r = rectForSelector(sel);
      if (r) out.push(r);
    });
    return out;
  }
  if (step.selectors && Array.isArray(step.selectors)) {
    const out = [];
    step.selectors.forEach((sel) => {
      const r = rectForSelector(sel);
      if (r) out.push(r);
    });
    return out;
  }
  if (!step.selector) return [];
  const r = targetRect(step);
  return r ? [r] : [];
}

function hasVisibleTarget(step) {
  if (!step.selector && !step.selectors) return true;
  if (step.waitFor) return true;
  return stepRects(step).length > 0;
}

function setOverlayClip(rects) {
  if (!tourOverlay) return;
  let holes = (rects || [])
    .filter((r) => r && r.width >= 0 && r.height >= 0)
    .map((r) => ({ l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height }));
  // Merge touching/overlapping cutouts first: with the evenodd rule, a shared
  // edge between adjacent holes can leave a faint seam line (anti-aliasing)
  // down the middle that is not part of the real UI.
  let merged = true;
  while (merged && holes.length > 1) {
    merged = false;
    for (let i = 0; i < holes.length && !merged; i++) {
      for (let j = i + 1; j < holes.length && !merged; j++) {
        const a = holes[i], b = holes[j];
        if (a.l <= b.r + 2 && b.l <= a.r + 2 && a.t <= b.b + 2 && b.t <= a.b + 2) {
          holes[i] = { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) };
          holes.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  // Drop cutouts nested inside a bigger one: with the evenodd rule,
  // overlapping holes cancel out and the nested area would stay dimmed
  // (e.g. toolbar buttons inside a lit preview pane).
  holes.sort((a, b) => ((b.r - b.l) * (b.b - b.t)) - ((a.r - a.l) * (a.b - a.t)));
  const kept = [];
  holes.forEach((h) => {
    const nested = kept.some((o) =>
      o.l <= h.l + 1 && o.t <= h.t + 1 && o.r >= h.r - 1 && o.b >= h.b - 1
    );
    if (!nested) kept.push(h);
  });
  if (kept.length === 0) {
    tourOverlay.style.clipPath = '';
    return;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  let d = `M0,0H${W}V${H}H0Z`;
  kept.forEach((h) => {
    const x0 = Math.max(0, Math.round(h.l - HIGHLIGHT_PAD));
    const y0 = Math.max(0, Math.round(h.t - HIGHLIGHT_PAD));
    const x1 = Math.round(h.r + HIGHLIGHT_PAD);
    const y1 = Math.round(h.b + HIGHLIGHT_PAD);
    d += `M${x0},${y0}H${x1}V${y1}H${x0}Z`;
  });
  tourOverlay.style.clipPath = `path(evenodd, "${d}")`;
}

function hideAll() {
  [tourOverlay, tourHighlight, tourHighlight2, tourCard].forEach((el) => {
    if (el) el.hidden = true;
  });
  setOverlayClip([]);
}

// Post-click spotlight: while a pauseAfterMs pause runs, dim everything
// except one panel (no rings, no card) so the user watches that panel load.
function showCutoutInterlude(selector) {
  allHighlightEls().forEach((el) => {
    if (el) el.hidden = true;
  });
  if (tourCard) tourCard.hidden = true;
  if (tourOverlay) tourOverlay.hidden = false;
  const r = selector ? rectForSelector(selector) : null;
  setOverlayClip(r ? [r] : []);
}

function placeHighlightEl(el, r) {
  el.style.left = `${Math.max(0, r.left - HIGHLIGHT_PAD)}px`;
  el.style.top = `${Math.max(0, r.top - HIGHLIGHT_PAD)}px`;
  el.style.width = `${r.width + HIGHLIGHT_PAD * 2}px`;
  el.style.height = `${r.height + HIGHLIGHT_PAD * 2}px`;
}

function placeHighlight(r) {
  placeHighlightEl(tourHighlight, r);
}

function placeCard(r, step) {
  const cardW = Math.min(CARD_WIDTH, window.innerWidth - 24);
  const cardH = tourCard.offsetHeight || 200;
  const centerOnTarget = step && step.centerOnTarget;
  let left;
  let top;
  if (r && step && step.cardSide === 'right') {
    left = r.right + CARD_GAP;
    top = r.top + (r.height - cardH) / 2;
    left = Math.min(Math.max(12, left), window.innerWidth - cardW - 12);
    top = Math.max(12, top);
  } else if (r && step && step.cardSide === 'left') {
    left = r.left - cardW - CARD_GAP;
    top = r.top + (r.height - cardH) / 2;
    left = Math.min(Math.max(12, left), window.innerWidth - cardW - 12);
    top = Math.max(12, top);
  } else if (r && centerOnTarget) {
    left = r.left + (r.width - cardW) / 2;
    top = r.top + (r.height - cardH) / 2;
    left = Math.min(Math.max(12, left), window.innerWidth - cardW - 12);
    top = Math.max(12, top);
  } else if (!r) {
    left = Math.max(12, (window.innerWidth - cardW) / 2);
    top = Math.max(12, (window.innerHeight - cardH) / 2);
  } else if (r.bottom + CARD_GAP + cardH <= window.innerHeight) {
    left = Math.min(Math.max(12, r.left), window.innerWidth - cardW - 12);
    top = r.bottom + CARD_GAP;
  } else if (r.top - CARD_GAP - cardH >= 0) {
    left = Math.min(Math.max(12, r.left), window.innerWidth - cardW - 12);
    top = r.top - CARD_GAP - cardH;
  } else {
    left = Math.min(Math.max(12, r.left), window.innerWidth - cardW - 12);
    top = Math.max(12, (window.innerHeight - cardH) / 2);
  }
  tourCard.style.left = `${Math.round(left)}px`;
  tourCard.style.top = `${Math.round(top)}px`;
}

function placeCardAbove(r) {
  const cardW = Math.min(CARD_WIDTH, window.innerWidth - 24);
  const cardH = tourCard.offsetHeight || 200;
  let left = r.left + (r.width - cardW) / 2;
  left = Math.min(Math.max(12, left), window.innerWidth - cardW - 12);
  let top = r.top - CARD_GAP - cardH;
  top = Math.max(12, top);
  tourCard.style.left = `${Math.round(left)}px`;
  tourCard.style.top = `${Math.round(top)}px`;
}

function clearAwait() {
  if (awaitListener) {
    document.removeEventListener('click', awaitListener, true);
    awaitListener = null;
  }
}

function clearWait() {
  if (waitTimer) {
    clearTimeout(waitTimer);
    waitTimer = 0;
  }
  waitTries = 0;
}

function clearRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = 0;
  }
}

function clearAuto() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = 0;
  }
}

function clearKey() {
  if (keyListener) {
    window.removeEventListener('keydown', keyListener, true);
    keyListener = null;
  }
  if (keyUpListener) {
    window.removeEventListener('keyup', keyUpListener, true);
    keyUpListener = null;
  }
}

function highlightEls(n) {
  const base = [tourHighlight, tourHighlight2].filter(Boolean);
  while (base.length + extraHighlights.length < n) {
    const d = document.createElement('div');
    d.className = 'tour-highlight';
    d.hidden = true;
    document.body.appendChild(d);
    extraHighlights.push(d);
  }
  return base.concat(extraHighlights).slice(0, Math.max(n, 0));
}

function allHighlightEls() {
  return [tourHighlight, tourHighlight2].concat(extraHighlights).filter(Boolean);
}

function clearPause() {
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = 0;
  }
}

function stopDemo() {
  demoToken += 1;
  // An aborted glide must not leave the followers frozen.
  try {
    state.demoScrolling = false;
  } catch (_) {}
}

function readPreviewScrollTops() {
  return [enPreviewFrame, frPreviewFrame].map((frame) => {
    try {
      const doc = frame && frame.contentDocument;
      if (!doc) return null;
      const scroller = doc.scrollingElement || doc.documentElement;
      return scroller ? scroller.scrollTop : null;
    } catch (_) {
      return null;
    }
  });
}

function setTourMode(mode, on) {
  const frames = [enPreviewFrame, frPreviewFrame, docxPreviewFrame].filter(Boolean);
  if (mode === 'focus') {
    state.focusMode = on;
    if (toggleFocusMode) toggleFocusMode.classList.toggle('is-active', on);
    frames.forEach((frame) => {
      try {
        if (frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('mode-focus', on);
        }
      } catch (_) {}
    });
  } else if (mode === 'blur') {
    state.blurMode = on;
    if (toggleBlurMode) toggleBlurMode.classList.toggle('is-active', on);
    frames.forEach((frame) => {
      try {
        if (frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.classList.toggle('mode-blur', on);
        }
      } catch (_) {}
    });
  }
}

function ensureModes(modes) {
  (modes || []).forEach((mode) => {
    if (mode === 'focus' && !state.focusMode) setTourMode('focus', true);
    if (mode === 'blur' && !state.blurMode) setTourMode('blur', true);
  });
}

function ensureModesOff(modes) {
  (modes || []).forEach((mode) => {
    if (mode === 'focus' && state.focusMode) setTourMode('focus', false);
    if (mode === 'blur' && state.blurMode) setTourMode('blur', false);
  });
}

function setTourHighlightBox(on) {
  state.showHighlightBox = on;
  try {
    if (toggleHighlightBox) {
      toggleHighlightBox.classList.toggle('is-active', on);
      const label = toggleHighlightBox.querySelector('span');
      if (label) label.textContent = 'Active box';
      else toggleHighlightBox.textContent = 'Active box';
    }
  } catch (_) {}
  [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
    try {
      if (frame.contentDocument && frame.contentDocument.body) {
        frame.contentDocument.body.classList.toggle('hide-highlight', !on);
      }
    } catch (_) {}
  });
  try {
    applyActiveHighlight();
  } catch (_) {}
}

function demoScrollPreview(durationMs, done, blockCount = 0) {
  const myToken = ++demoToken;
  const jobs = [];
  [enPreviewFrame, frPreviewFrame].forEach((frame) => {
    if (!frame) return;
    let scroller = null;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      scroller = doc.scrollingElement || doc.documentElement;
    } catch (_) {
      return;
    }
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (max <= 0) return;
    const from = scroller.scrollTop;
    let dest = from;
    if (blockCount > 0) {
      // Glide exactly blockCount blocks down from the current position.
      try {
        const items = getSyncItems(frame);
        if (!items.length) return;
        const currentIdx = findTopIndexForFrame(frame);
        let pos = items.findIndex((it) => it.index === currentIdx);
        if (pos === -1) pos = 0;
        const destPos = Math.max(0, Math.min(pos + blockCount, items.length - 1));
        if (destPos === pos) return;
        const target = items[destPos];
        dest = Math.max(0, Math.min(target.top + target.height / 2 - scroller.clientHeight / 2, max));
      } catch (_) {
        return;
      }
    } else {
      dest = (max - from > 40) ? max : 0;
    }
    if (Math.abs(dest - from) < 2) return;
    jobs.push({ frame, scroller, from, dest });
  });
  if (jobs.length === 0) {
    done();
    return;
  }
  jobs.forEach((job) => {
    try {
      programmaticScrollEls.add(job.scroller);
    } catch (_) {}
  });
  const finish = () => {
    jobs.forEach((job) => {
      try {
        programmaticScrollEls.delete(job.scroller);
      } catch (_) {}
    });
    done();
  };
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  let lastHud = 0;
  const tick = (now) => {
    if (myToken !== demoToken) {
      jobs.forEach((job) => {
        try {
          programmaticScrollEls.delete(job.scroller);
        } catch (_) {}
      });
      return;
    }
    const t = Math.min(1, (now - t0) / durationMs);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    jobs.forEach((job) => {
      try {
        job.scroller.scrollTop = job.from + (job.dest - job.from) * eased;
      } catch (_) {}
    });
    if (now - lastHud > 200) {
      lastHud = now;
      try {
        const topIdx = findTopIndexForFrame(jobs[0].frame);
        if (topIdx !== null && topIdx !== undefined) {
          state.activePreviewBlock = topIdx;
          state.lastKnownEnIndex = topIdx;
          applyActiveHighlight();
          updateActiveBlockHud(topIdx);
        }
      } catch (_) {}
    }
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  };
  requestAnimationFrame(tick);
}

function setDemoViewing(on) {
  if (tourOverlay) tourOverlay.hidden = on;
  if (tourCard) tourCard.hidden = on;
  allHighlightEls().forEach((el) => {
    if (el) el.hidden = on ? true : el.hidden;
  });
  state.demoScrolling = !!on;
  if (!on) {
    // Glide over: settle the followers that stayed quiet during it so the
    // final position (not a stale mid-glide one) is what they align to.
    try {
      if (typeof state.activePreviewBlock === 'number' && !isNaN(state.activePreviewBlock)) {
        applyActiveHighlight();
        updateActiveBlockHud(state.activePreviewBlock);
        updateDetailsStateForActiveBlock(state.activePreviewBlock);
      }
    } catch (_) {}
  }
}

function runDemoThenAdvance(durationMs, blockCount = 0, step = null) {
  const myIdx = idx;
  clearRefresh();
  setDemoViewing(true);
  const delayMs = (step && step.demoDelayMs) || 0;
  const start = () => {
    if (idx !== myIdx) return;
    demoScrollPreview(durationMs, () => {
      setDemoViewing(false);
      if (idx !== myIdx) return;
      try {
        if (step && Array.isArray(step.modesOffAfterDemo)) ensureModesOff(step.modesOffAfterDemo);
      } catch (_) {}
      if (idx === myIdx) show(idx + 1, 1);
    }, blockCount);
  };
  if (delayMs > 0) {
    // Let the button's own handler (e.g. a view switch that changes layout)
    // run and settle before measuring scroll destinations.
    setTimeout(() => {
      if (idx !== myIdx) return;
      start();
    }, delayMs);
  } else {
    start();
  }
}

function runDemoThenAwaitToggleOff(durationMs, blockCount) {
  const myIdx = idx;
  const step = steps[myIdx];
  clearRefresh();
  setDemoViewing(true);
  demoScrollPreview(durationMs, () => {
    setDemoViewing(false);
    if (idx !== myIdx) return;
    // Second phase of the same step: prompt the user to click the
    // button again to disable the mode, then move on.
    try {
      if (step) step._awaitingOff = true;
    } catch (_) {}
    render();
    scheduleRefresh();
  }, blockCount);
}

function scheduleRefresh() {
  clearRefresh();
  const shown = idx;
  refreshTimer = setTimeout(() => {
    refreshTimer = 0;
    if (idx === shown) render();
  }, REFRESH_MS);
}

function render() {
  const step = steps[idx];
  const total = steps.length;
  document.documentElement.classList.toggle('tour-white-counts', !!step.whiteCounts);
  tourStep.textContent = `Step ${idx + 1} of ${total}`;
  tourTitle.textContent = step.title;
  let body = typeof step.body === 'function' ? step.body() : step.body;
  if (step._awaitingOff && step.awaitOffBody) {
    body = typeof step.awaitOffBody === 'function' ? step.awaitOffBody() : step.awaitOffBody;
  }
  const skipped = skippedIdx.size;
  if (idx === total - 1 && skipped > 0) {
    body += ` (${skipped} preview step${skipped === 1 ? ' was' : 's were'} skipped — align documents to see ${skipped === 1 ? 'it' : 'them'}.)`;
  }
  tourBody.textContent = body;
  tourBackBtn.hidden = idx === 0;
  tourNextBtn.textContent = idx === 0 ? 'Start tour' : (idx === total - 1 ? 'Finish' : 'Next');
  // Most click-to-continue steps hide Next until the click lands. Steps with
  // showNextInPhaseTwo also offer Next once the second prompt is showing.
  const phaseTwoNext = !!(step._awaitingOff && step.showNextInPhaseTwo);
  tourNextBtn.hidden = !!(step.awaitClick || step.awaitKey) && !phaseTwoNext;
  tourSkipBtn.hidden = idx === total - 1;
  // undimAfterClick removes all dimming/spotlights once the step's click
  // has happened (e.g. fullscreen second phase) while keeping the card.
  const undimmed = !!(step._awaitingOff && step.undimAfterClick);
  if (tourOverlay) tourOverlay.hidden = undimmed ? true : false;
  if (tourOverlay) tourOverlay.style.pointerEvents = (step.awaitClick || step.overlayClickThrough) ? 'none' : '';
  const rs = stepRects(step);
  // unionHighlight merges several rects (e.g. the two side-by-side preview
  // panes) into ONE ring so their touching edges don't draw a doubled
  // highlight line down the middle. Overlay cutouts stay per-rect so the
  // panes themselves remain undimmed.
  let clipRs = rs;
  let ringRs = rs;
  if (step.unionHighlight && Array.isArray(step.unionHighlight)) {
    const urs = [];
    step.unionHighlight.forEach((sel) => {
      const r = rectForSelector(sel);
      if (r) urs.push(r);
    });
    if (urs.length > 0) {
      clipRs = rs.concat(urs);
      const l = Math.min.apply(null, urs.map((r) => r.left));
      const t = Math.min.apply(null, urs.map((r) => r.top));
      const rr = Math.max.apply(null, urs.map((r) => r.right));
      const bb = Math.max.apply(null, urs.map((r) => r.bottom));
      ringRs = rs.concat([{ left: l, top: t, width: rr - l, height: bb - t }]);
    }
  }
  if (undimmed) {
    setOverlayClip([]);
    // Most undimmed second phases drop every ring. Steps with
    // keepSelectorRingWhenUndimmed keep the (purple, awaiting) ring on their
    // own control so it still reads as the thing to click.
    const keepRs = step.keepSelectorRingWhenUndimmed ? stepRects(step) : [];
    const pool = highlightEls(keepRs.length);
    keepRs.forEach((r, k) => {
      const el = pool[k];
      el.hidden = false;
      el.classList.toggle('awaiting', !!step.awaitClick);
      el.classList.toggle('pass', !!(step.awaitClick || step.awaitKey));
      el.classList.toggle('plain', !!step.plainSpotlight);
      el.style.borderColor = step.ringColor || '';
      placeHighlightEl(el, r);
    });
    allHighlightEls().slice(keepRs.length).forEach((el) => {
      if (el) el.hidden = true;
    });
  } else {
    // clipOnly adds undimmed cutouts without rings (e.g. preview panes the
  // user must watch while the card sits elsewhere).
  if (step.clipOnly && Array.isArray(step.clipOnly)) {
    const extra = [];
    step.clipOnly.forEach((sel) => {
      const r = rectForSelector(sel);
      if (r) extra.push(r);
    });
    if (extra.length > 0) clipRs = clipRs.concat(extra);
  }
  setOverlayClip(clipRs);
    const pool = highlightEls(ringRs.length);
    ringRs.forEach((r, k) => {
      const el = pool[k];
      el.hidden = false;
      el.classList.toggle('awaiting', !!step.awaitClick);
      el.classList.toggle('pass', !!(step.awaitClick || step.awaitKey));
      el.classList.toggle('plain', !!step.plainSpotlight);
      el.style.borderColor = step.ringColor || '';
      placeHighlightEl(el, r);
    });
    allHighlightEls().slice(ringRs.length).forEach((el) => {
      el.hidden = true;
    });
  }
  tourCard.hidden = false;
  if (step.cardAbove) {
    // Pin the card right above a given element, centered on it.
    const ar = rectForSelector(step.cardAbove);
    if (ar) placeCardAbove(ar);
    else placeCard(step.selectors ? null : (rs[0] || null), step);
  } else {
    placeCard(step.selectors ? null : (rs[0] || null), step);
  }
  ((step.awaitClick || step.awaitKey) && !phaseTwoNext ? tourBackBtn : tourNextBtn).focus({ preventScroll: true });
  clearAuto();
  if (step.autoAdvanceMs && idx < steps.length - 1) {
    autoTimer = setTimeout(() => {
      autoTimer = 0;
      if (idx >= 0) show(idx + 1, 1);
    }, step.autoAdvanceMs);
  }
  clearAwait();
  clearKey();
  if (step.awaitClick) {
    // Second phase of a two-control interaction (e.g. zoom out then in)
    // listens on a different control than the first click.
    const listenSel = (step._awaitingOff && step.awaitOffSelector) ? step.awaitOffSelector : step.awaitClick;
    awaitListener = (e) => {
      const t = e.target && e.target.closest ? e.target.closest(listenSel) : null;
      if (t) {
        // Second click: mode is being disabled after the 5-block glide.
        if (step._awaitingOff) {
          clearAwait();
          try {
            step._awaitingOff = false;
          } catch (_) {}
          const curIdx = idx;
          const isLast = curIdx >= steps.length - 1;
          // Defer so the button's own toggle handler (target/bubble phase)
          // runs before we switch steps — otherwise show()'s entry-state
          // enforcement would run first and the toggle would re-enable the mode.
          setTimeout(() => {
            if (idx !== curIdx) return;
            if (isLast) end();
            else show(curIdx + 1, 1);
          }, 0);
          return;
        }
        clearAwait();
        if (idx >= steps.length - 1) {
          end();
          return;
        }
        if (step.demoAfterClick) {
          if (step.awaitOffAfterDemo) {
            runDemoThenAwaitToggleOff(step.demoAfterClick, step.demoBlocks || 0);
          } else {
            runDemoThenAdvance(step.demoAfterClick, step.demoBlocks || 0, step);
          }
          return;
        }
        if ((step.awaitOffSelector || step.awaitOffAfterDemo) && !step._awaitingOff) {
          // Two-click interaction with no demo (e.g. zoom out, then in, or
          // enter fullscreen, then exit): first click moves to the second
          // prompt instead of advancing.
          try {
            step._awaitingOff = true;
          } catch (_) {}
          if (step.lockZoomButtons) {
            // Single-click demo: the counted zoom-out must land before the
            // buttons swap, so defer past the button's own click handler.
            const firstSel = step.awaitClick;
            const secondSel = step.awaitOffSelector;
            setTimeout(() => {
              try {
                const first = firstSel ? document.querySelector(firstSel) : null;
                const second = secondSel ? document.querySelector(secondSel) : null;
                if (first) first.disabled = true;
                if (second) second.disabled = false;
              } catch (_) {}
            }, 0);
          }
          render();
          scheduleRefresh();
          return;
        }
        const pause = step.pauseAfterMs || 0;
        if (pause > 0) {
          if (step.postClickCutout) showCutoutInterlude(step.postClickCutout);
          else hideAll();
          clearPause();
          pauseTimer = setTimeout(() => {
            pauseTimer = 0;
            if (idx >= 0) show(idx + 1, 1);
          }, pause);
        } else {
          // Defer so the clicked control's own handler (target/bubble phase)
          // runs first — it may change layout (e.g. opening code view) that
          // the next step's target visibility depends on. Advancing
          // synchronously here would measure hidden targets and skip steps.
          const curIdx = idx;
          setTimeout(() => {
            if (idx !== curIdx) return;
            show(curIdx + 1, 1);
          }, 0);
        }
      }
    };
    document.addEventListener('click', awaitListener, true);
  }
  clearKey();
  if (step.awaitKey) {
    // Hold, scroll, then release: keydown marks the hold (recording scroll
    // positions) with prompt feedback; keyup only finishes if either preview
    // was scrolled while held, then pauses before advancing.
    keyListener = (e) => {
      if (e && e.key === step.awaitKey && !e.repeat) {
        try {
          step._awaitKeyHeld = true;
          step._holdScrollTops = readPreviewScrollTops();
        } catch (_) {}
        clearRefresh();
        try {
          if (tourBody && step.awaitKeyHeldBody) tourBody.textContent = step.awaitKeyHeldBody;
        } catch (_) {}
      }
    };
    window.addEventListener('keydown', keyListener, true);
    keyUpListener = (e) => {
      if (e && e.key === step.awaitKey) {
        if (!step._awaitKeyHeld) return;
        try {
          step._awaitKeyHeld = false;
        } catch (_) {}
        let scrolled = false;
        try {
          const before = step._holdScrollTops;
          const now = readPreviewScrollTops();
          if (before && now) {
            scrolled = now.some((v, i) => v !== null && before[i] !== null && Math.abs(v - before[i]) > 4);
          }
        } catch (_) {}
        if (!scrolled) {
          try {
            if (tourBody && step.awaitKeyNoScrollBody) tourBody.textContent = step.awaitKeyNoScrollBody;
          } catch (_) {}
          return;
        }
        clearKey();
        if (idx >= steps.length - 1) {
          end();
          return;
        }
        hideAll();
        clearPause();
        pauseTimer = setTimeout(() => {
          pauseTimer = 0;
          if (idx >= 0) show(idx + 1, 1);
        }, step.pauseAfterKeyMs || 2000);
      }
    };
    window.addEventListener('keyup', keyUpListener, true);
  }
}

function pollWait() {
  clearWait();
  waitTimer = setTimeout(() => {
    waitTimer = 0;
    if (idx < 0 || idx >= steps.length) return;
    const step = steps[idx];
    let ok = false;
    try {
      ok = !step.waitFor || !!step.waitFor();
    } catch (_) {
      ok = false;
    }
    if (ok || waitTries >= WAIT_MAX_TRIES) {
      if (!ok) skippedIdx.add(idx);
      render();
    } else {
      waitTries += 1;
      pollWait();
    }
  }, WAIT_POLL_MS);
}

function show(i, dir = 1) {
  clearAwait();
  clearKey();
  clearWait();
  clearAuto();
  clearPause();
  clearRefresh();
  stopDemo();
  // Leaving a step cancels its pending "click again to disable" phase.
  try {
    steps.forEach((s) => { if (s) { s._awaitingOff = false; s._awaitKeyHeld = false; } });
  } catch (_) {}
  idx = i;
  while (idx > 0 && idx < steps.length - 1) {
    const step = steps[idx];
    if (hasVisibleTarget(step)) break;
    skippedIdx.add(idx);
    idx += dir;
  }
  const step = steps[idx];
  if (step && step.waitFor) {
    let ok = false;
    try {
      ok = !!step.waitFor();
    } catch (_) {
      ok = false;
    }
    if (!ok) {
      hideAll();
      pollWait();
      return;
    }
  }
  // Enforce the entry-state so each click step starts deterministically:
  // focus step starts both modes off, blur step starts both off (stays on after),
  // both-together step starts blur on + focus off so the focus click ends
  // with both modes on, highlight-box step starts with the box on.
  try {
    if (step && Array.isArray(step.ensureModesOff)) ensureModesOff(step.ensureModesOff);
    if (step && Array.isArray(step.ensureModes)) ensureModes(step.ensureModes);
    if (step && typeof step.ensureHighlightBox === 'boolean' && state.showHighlightBox !== step.ensureHighlightBox) {
      setTourHighlightBox(step.ensureHighlightBox);
    }
    if (step && step.ensureFullscreenOff && isPreviewFullscreen()) {
      setPreviewFullscreen(false);
    }
    // The collapse step needs its button measurable: if a Back-navigation
    // lands here while the pane is still tucked away, reopen it first.
    if (step && step.ensureEnPaneExpanded) {
      try {
        if (isEnPaneCollapsed()) expandEnPane();
      } catch (_) {}
    }
    if (step && step.switchToVisualOnShow && state.frViewMode !== 'visual') {
      switchFrenchView('visual');
    }
    // Single-click zoom demo: entering the zoom step arms zoom-out only.
    // Every other step leaves both buttons usable again.
    try {
      const zOut = document.querySelector('#zoomOutBtn');
      const zIn = document.querySelector('#zoomInBtn');
      if (step && step.lockZoomButtons) {
        if (zOut) zOut.disabled = false;
        if (zIn) zIn.disabled = true;
      } else {
        if (zOut) zOut.disabled = false;
        if (zIn) zIn.disabled = false;
      }
    } catch (_) {}
  } catch (_) {}
  render();
  // Some steps reset the reading position (e.g. back to block 1 for the views).
  try {
    if (step && typeof step.scrollToBlockOnShow === 'number') jumpToBlock(step.scrollToBlockOnShow);
  } catch (_) {}
  scheduleRefresh();
  if (step && step.demoOnShow) {
    if (step.ensureModes) {
      try {
        ensureModes(step.ensureModes);
      } catch (_) {}
    }
    runDemoThenAdvance(step.demoOnShow, step.demoBlocks || 0, step);
  }
}

function end() {
  idx = -1;
  clearAwait();
  clearKey();
  clearWait();
  clearAuto();
  clearPause();
  clearRefresh();
  stopDemo();
  try {
    steps.forEach((s) => { if (s) { s._awaitingOff = false; s._awaitKeyHeld = false; } });
  } catch (_) {}
  try {
    const zOut = document.querySelector('#zoomOutBtn');
    const zIn = document.querySelector('#zoomInBtn');
    if (zOut) zOut.disabled = false;
    if (zIn) zIn.disabled = false;
  } catch (_) {}
  document.documentElement.classList.remove('tour-white-counts');
  hideAll();
  if (tourOverlay) tourOverlay.style.pointerEvents = '';
  [tourHighlight, tourHighlight2].forEach((el) => {
    if (!el) return;
    el.classList.remove('awaiting');
    el.classList.remove('plain');
    el.classList.remove('pass');
  });
  if (onResize) {
    window.removeEventListener('resize', onResize);
    onResize = null;
  }
  if (onKey) {
    window.removeEventListener('keydown', onKey, true);
    onKey = null;
  }
}

function startTour() {
  if (!tourOverlay || !tourCard) return;
  skippedIdx = new Set();
  try {
    ensureModesOff(['focus', 'blur']);
    if (!state.showHighlightBox) setTourHighlightBox(true);
  } catch (_) {}
  tourOverlay.hidden = false;
  onResize = () => {
    if (idx >= 0) render();
  };
  window.addEventListener('resize', onResize);
  onKey = (e) => {
    if (e.key === 'Escape') end();
  };
  window.addEventListener('keydown', onKey, true);
  show(0);
}

function hasActiveWorkflow() {
  try {
    if (previewSection && previewSection.classList.contains('show')) return true;
  } catch (_) {}
  return Boolean(
    (state.enHtml && state.enHtml.trim()) ||
    (state.frBlocks && state.frBlocks.length > 0) ||
    state.alignRows.length > 0
  );
}

function openTutorialConfirm() {
  if (!hasActiveWorkflow()) {
    startTour();
    return;
  }
  if (!tutorialConfirmModal) {
    startTour();
    return;
  }
  tutorialConfirmModal.style.display = 'flex';
  setTimeout(() => tutorialConfirmModal.classList.add('is-open'), 10);
}

function closeTutorialConfirm() {
  if (!tutorialConfirmModal) return;
  tutorialConfirmModal.classList.remove('is-open');
  setTimeout(() => {
    tutorialConfirmModal.style.display = 'none';
  }, 200);
}

function wireTour() {
  if (wireTour.bound) return;
  wireTour.bound = true;
  if (tourNextBtn) {
    tourNextBtn.addEventListener('click', () => {
      if (idx >= steps.length - 1) end();
      else show(idx + 1, 1);
    });
  }
  if (tourBackBtn) {
    tourBackBtn.addEventListener('click', () => {
      if (idx > 0) show(idx - 1, -1);
    });
  }
  if (tourSkipBtn) {
    tourSkipBtn.addEventListener('click', end);
  }
  if (confirmTutorialBtn) {
    confirmTutorialBtn.addEventListener('click', () => {
      closeTutorialConfirm();
      resetToNewWorkflow();
      startTour();
    });
  }
  if (cancelTutorialConfirmBtn) {
    cancelTutorialConfirmBtn.addEventListener('click', closeTutorialConfirm);
  }
  if (closeTutorialConfirmBtn) {
    closeTutorialConfirmBtn.addEventListener('click', closeTutorialConfirm);
  }
}

if (typeof window !== 'undefined') {
  window.startTour = startTour;
  window.openTutorialConfirm = openTutorialConfirm;
}

export {
  end as endTour,
  openTutorialConfirm,
  startTour,
  wireTour,
};
