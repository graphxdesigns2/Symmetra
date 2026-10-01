// Auto-generated imports
import {
  openContextMenu,
} from './context-menu.js';
import {
  updateDetailsStateForActiveBlock,
} from './details-sync.js';
import {
  activeBlockHudTag,
  activeBlockHudText,
  activeBlockHudTotal,
  docxPreviewFrame,
  docxPreviewPane,
  enPreviewFrame,
  frCodeEditor,
  frPreviewFrame,
} from './dom-refs.js';
import {
  isTogglingWordDoc,
  setupToggleDetailsForDoc,
} from './iframe-preview.js';
import {
  handleKeyNavigation,
} from './keyboard-nav.js';
import {
  state,
} from './state.ts';
import {
  updateSyncStatusLabel,
} from './sync-status.js';
import {
  updateIframesTheme,
} from './theme.js';
import {
  showHeaderNote,
} from './ui-toast.js';
import {
  applyPreviewZoom,
  zoomIn,
  zoomOut,
  zoomReset,
} from './zoom.js';


const programmaticScrollEls = new Set();

// A footnote jump lands its target near the TOP of the pane (so the previous
// note scrolls out of view), but active-block detection reads the viewport
// CENTER line, so the pane would immediately crown the following block. The
// pin holds the jumped-to block. Sibling panes are pinned too, otherwise their
// scroll-sync derives the centre-line block and eases this pane off target.
// The pin must survive our own follower easing, so programmatic writes refresh
// the baseline and only unguarded movement counts as a real user scroll.
const fnLandingPins = new WeakMap();

function pinFnLanding(scrollEl, index) {
  if (!scrollEl || typeof index !== 'number' || isNaN(index)) return;
  try {
    fnLandingPins.set(scrollEl, { index, top: scrollEl.scrollTop || 0 });
  } catch (_) {}
}

function noteFnLandingScroll(scrollEl) {
  if (!scrollEl) return;
  try {
    const pin = fnLandingPins.get(scrollEl);
    if (pin) pin.top = scrollEl.scrollTop || 0;
  } catch (_) {}
}

function readFnLandingPin(scrollEl) {
  if (!scrollEl) return null;
  let pin = null;
  try {
    pin = fnLandingPins.get(scrollEl) || null;
  } catch (_) {
    return null;
  }
  if (!pin) return null;
  let moved = false;
  try {
    moved = Math.abs((scrollEl.scrollTop || 0) - pin.top) > 4;
  } catch (_) {
    moved = true;
  }
  if (moved && !programmaticScrollEls.has(scrollEl)) {
    clearFnLandingPin(scrollEl);
    return null;
  }
  return pin;
}

function clearFnLandingPin(scrollEl) {
  if (!scrollEl) return;
  try {
    fnLandingPins.delete(scrollEl);
  } catch (_) {}
}

function getSyncItems(frame) {
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return [];
    const scrollEl = doc.scrollingElement || doc.documentElement;
    if (!scrollEl || scrollEl.clientHeight === 0) return [];
    return Array.from(doc.querySelectorAll('[data-swap-index]'))
      .filter((el) => {
        if (el.classList.contains('gc-img-replaced') || el.style.display === 'none') {
          return false;
        }
        // Elements hidden inside closed details should not be treated as visible sync items
        const closedDetails = el.closest('details:not([open])');
        if (closedDetails && !el.closest('summary')) {
          return false;
        }
        return true;
      })
      .map((el) => ({
        index: parseInt(el.getAttribute('data-swap-index'), 10),
        el,
      }))
      .filter((o) => Number.isFinite(o.index))
      .map((o) => {
        const rect = o.el.getBoundingClientRect();
        return {
          index: o.index,
          el: o.el,
          top: rect.top + scrollEl.scrollTop,
          height: rect.height,
        };
      })
      .sort((a, b) => a.top - b.top);
  } catch (_) {
    return [];
  }
}

function activateHighlightElement(el) {
  if (!el || el.nodeType !== 1) return;
  el.classList.add('gc-swap-active');
  if (el.nextElementSibling && el.nextElementSibling.classList.contains('gc-img-placeholder')) {
    el.nextElementSibling.classList.add('gc-swap-active');
  }

  // When the highlighted bar is over a detail list (either its summary or an interior block),
  // open the details list so it is visible
  const parentDetails = el.closest('details');
  if (parentDetails && !parentDetails.open && !parentDetails._userClosed) {
    parentDetails._programmatic = true;
    parentDetails.open = true;
    setTimeout(() => {
      parentDetails._programmatic = false;
    }, 60);
  }
}

function highlightIndexInFrame(frame, index) {
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;
    doc.querySelectorAll('.gc-swap-active').forEach((el) => el.classList.remove('gc-swap-active'));
    if (state.showHighlightBox === false) return;
    // Fast path: resolve the target element directly. Building the full sync
    // item list forces a layout measurement per block in the document, and on
    // large docs that stalls the move enough for the outline to visibly
    // flicker. The measured list is only needed for the fallbacks below, so
    // build it lazily and at most once per call.
    let lazyItems = null;
    const getItems = () => {
      if (lazyItems === null) lazyItems = getSyncItems(frame);
      return lazyItems;
    };
    // The first block stays highlighted: a missing/invalid index falls back
    // to the first sync item instead of leaving the preview unhighlighted.
    if (index === null || index === undefined || (typeof index === 'number' && isNaN(index))) {
      const items = getItems();
      if (items.length > 0) {
        activateHighlightElement(items[0].el);
      }
      return;
    }

    const indices = Array.isArray(index) ? index : [index];
    indices.forEach((idx) => {
      if (!Number.isFinite(idx)) return;
      let el = doc.querySelector(`[data-swap-index="${idx}"]`);
      if (!el && frame === frPreviewFrame) {
        el = doc.querySelector(`[data-fr-index="${idx}"]`);
      }
      if (!el && indices.length === 1) {
        const items = getItems();
        if (items.length > 0) {
          const best = items.reduce((b, it) =>
            Math.abs(it.index - idx) < Math.abs(b.index - idx) ? it : b, items[0]);
          el = best && best.el;
        }
      }
      if (el) activateHighlightElement(el);
    });
  } catch (_) {}
}

function applyActiveHighlight() {
  // Normalize first: the first block is the default highlight target.
  if (typeof state.activePreviewBlock !== 'number' || isNaN(state.activePreviewBlock)) {
    state.activePreviewBlock = 0;
    state.lastKnownEnIndex = 0;
  }
  highlightIndexInFrame(enPreviewFrame, state.activePreviewBlock);
  if (state.autoSync && !state.syncPaused) {
    highlightIndexInFrame(frPreviewFrame, state.activePreviewBlock + state.syncOffset);
    if (state.showWordDocView && docxPreviewFrame) {
      const pair = state.alignPairs.find((p) => p.enIndex === state.activePreviewBlock && !p.skip);
      const docxIdx = pair && pair.groupedFrIndices && pair.groupedFrIndices.length > 0
        ? pair.groupedFrIndices
        : (pair && pair.frIndex !== null ? pair.frIndex : state.activePreviewBlock + state.syncOffset);
      highlightIndexInFrame(docxPreviewFrame, docxIdx);
    }
  }
  updateDetailsStateForActiveBlock(state.activePreviewBlock);
  try {
    if (state.frViewMode !== 'visual' && typeof window !== 'undefined') {
      if (typeof window.syncCodeViewToActiveBlock === 'function') {
        window.syncCodeViewToActiveBlock();
      } else if (typeof window.updateCodeActiveBlockHighlight === 'function') {
        window.updateCodeActiveBlockHighlight();
      }
    }
  } catch (_) {}
}

function findTopIndexForFrame(frame) {
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return null;
    const scrollEl = doc.scrollingElement || doc.documentElement;
    const items = getSyncItems(frame);
    if (!items.length) return null;

    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    // Force top/bottom element only at the true edges of scroll
    if (scrollEl.scrollTop <= 4) return items[0].index;
    if (maxScroll > 0 && scrollEl.scrollTop >= maxScroll - 4) return items[items.length - 1].index;

    // Walk down the sorted items and keep the last one whose top has
    // already crossed the reading line. This is monotonic with scrollTop,
    // so short blocks (e.g. a lone heading) can never be stepped over.
    // The line sits at the vertical center of the viewport so the active
    // block stays the one visually in the middle of the screen.
    const topThreshold = scrollEl.scrollTop + scrollEl.clientHeight / 2;
    let candidate = items[0];
    for (const item of items) {
      if (item.top <= topThreshold) {
        candidate = item;
      } else {
        break;
      }
    }
    const pin = readFnLandingPin(scrollEl);
    if (pin) {
      const pinned = items.find((it) => it.index === pin.index);
      if (pinned) return pinned.index;
    }
    return candidate.index;
  } catch (_) {
    return null;
  }
}

function scrollFrameToIndex(frame, index) {
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;
    const scrollEl = doc.scrollingElement || doc.documentElement;
    cancelSmoothFollowScroll(scrollEl); // don't fight an in-flight follow-scroll ease
    const items = getSyncItems(frame);
    if (!items.length) return;
    let target = items.find((it) => it.index === index);
    if (!target) {
      target = items.reduce((best, it) =>
        Math.abs(it.index - index) < Math.abs(best.index - index) ? it : best, items[0]);
    }
    if (!target) return;
    const max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    if (items.indexOf(target) === 0 && index <= items[0].index) {
      scrollEl.scrollTop = 0;
      return;
    }
    const destination = target.top + target.height / 2 - scrollEl.clientHeight / 2;
    scrollEl.scrollTop = Math.max(0, Math.min(destination, max));
  } catch (_) {}
}

function stepFrameBlock(frame, stepCount) {
  try {
    // Bail on a pane that isn't laid out: its scrollTop reads 0, so
    // findTopIndexForFrame below would hand back the first item and every
    // press would slam the active block to 1 (or 5 for a 5-step).
    if (!isFrameSteppable(frame)) return;
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;
    const scrollEl = doc.scrollingElement || doc.documentElement;
    if (!scrollEl) return;

    cancelSmoothFollowScroll(scrollEl);
    clearFnLandingPin(scrollEl);

    const items = getSyncItems(frame);
    if (!items.length) return;

    const currentIdx = findTopIndexForFrame(frame);
    let itemPos = items.findIndex((it) => it.index === currentIdx);
    if (itemPos === -1) {
      itemPos = stepCount > 0 ? 0 : items.length - 1;
    }

    let nextPos = itemPos + stepCount;
    nextPos = Math.max(0, Math.min(nextPos, items.length - 1));

    const nextTarget = items[nextPos];
    if (!nextTarget) return;

    scrollFrameToIndex(frame, nextTarget.index);
    highlightIndexInFrame(frame, nextTarget.index);

    if (frame === enPreviewFrame) {
      state.activePreviewBlock = nextTarget.index;
      state.lastKnownEnIndex = nextTarget.index;
      updateActiveBlockHud(nextTarget.index);
    } else if (frame === docxPreviewFrame) {
      const pair = state.alignPairs.find(
        (p) => !p.skip && (p.frIndex === nextTarget.index || (p.groupedFrIndices && p.groupedFrIndices.includes(nextTarget.index)))
      );
      const enIdx = pair && typeof pair.enIndex === 'number'
        ? pair.enIndex
        : Math.max(0, Math.min(nextTarget.index - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
      state.activePreviewBlock = enIdx;
      state.lastKnownEnIndex = enIdx;
      updateActiveBlockHud(enIdx);
    } else if (frame === frPreviewFrame) {
      const enIdx = Math.max(0, Math.min(nextTarget.index - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
      state.activePreviewBlock = enIdx;
      state.lastKnownEnIndex = enIdx;
      updateActiveBlockHud(enIdx);
    }
    updateDetailsStateForActiveBlock(state.activePreviewBlock);
  } catch (_) {}
}

function alignPreviewBlocks(index, opts = {}) {
  if (!enPreviewFrame || !frPreviewFrame) return;
  // A non-numeric index would build the selectors as "[data-swap-index="NaN"]"
  // and return silently further down, which reads as "the button did nothing".
  if (typeof index !== 'number' || isNaN(index)) return;
  // Footnote jumps teleport instead of gliding: one synchronous placement,
  // no dueling easings, no settle timeouts.
  const placeInstant = !!(opts && opts.instant);
  const place = (scrollEl, dest) => {
    try {
      if (placeInstant) {
        cancelSmoothFollowScroll(scrollEl);
        // Flag as programmatic so the scroll events this write fires aren't
        // mistaken for user input (which would retarget followers and drift
        // the landing after the jump).
        programmaticScrollEls.add(scrollEl);
        scrollEl.scrollTop = Math.max(0, dest);
        noteFnLandingScroll(scrollEl);
        setTimeout(() => {
          try { programmaticScrollEls.delete(scrollEl); } catch (_) {}
        }, 80);
      } else {
        smoothFollowScroll(scrollEl, dest);
      }
    } catch (_) {}
  };

  let enScroll = null;
  let frScroll = null;
  try {
    const enDoc = enPreviewFrame.contentDocument || enPreviewFrame.contentWindow.document;
    const frDoc = frPreviewFrame.contentDocument || frPreviewFrame.contentWindow.document;
    if (!enDoc || !frDoc) return;

    enScroll = enDoc.scrollingElement || enDoc.documentElement;
    frScroll = frDoc.scrollingElement || frDoc.documentElement;

    const frIndex = index + state.syncOffset;
    const enEl = enDoc.querySelector(`[data-swap-index="${index}"]`);
    const frEl = frDoc.querySelector(`[data-swap-index="${frIndex}"]`);

    if (!enEl && !frEl) return;

    // Ease (don't teleport): instant scrollTop jumps strobe bright content
    // across the dark canvas at 60Hz, which reads as white blinking while
    // stepping blocks. smoothFollowScroll glides instead, retargets cleanly
    // on rapid steps, and guards its own scroll events while easing.
    if (enEl) {
      if (index === 0) {
        place(enScroll, 0);
      } else {
        const enRect = enEl.getBoundingClientRect();
        const enTop = enRect.top + enScroll.scrollTop;
        const enMax = Math.max(0, enScroll.scrollHeight - enScroll.clientHeight);
        const enDestination = enTop + enRect.height / 2 - enScroll.clientHeight / 2;
        place(enScroll, Math.max(0, Math.min(enDestination, enMax)));
      }
    }

    if (state.autoSync && !state.syncPaused) {
      if (frEl) {
        if (frIndex === 0) {
          place(frScroll, 0);
        } else {
          const frRect = frEl.getBoundingClientRect();
          const frTop = frRect.top + frScroll.scrollTop;
          const frMax = Math.max(0, frScroll.scrollHeight - frScroll.clientHeight);
          const frDestination = frTop + frRect.height / 2 - frScroll.clientHeight / 2;
          place(frScroll, Math.max(0, Math.min(frDestination, frMax)));
        }
      } else if (frDoc) {
        const frItems = getSyncItems(frPreviewFrame);
        if (frItems.length) {
          if (frIndex <= 0) {
            place(frScroll, 0);
          } else {
            const closest = frItems.reduce((best, it) =>
              Math.abs(it.index - frIndex) < Math.abs(best.index - frIndex) ? it : best, frItems[0]);
            if (closest) {
              const frMax = Math.max(0, frScroll.scrollHeight - frScroll.clientHeight);
              const frDestination = closest.top + closest.height / 2 - frScroll.clientHeight / 2;
              place(frScroll, Math.max(0, Math.min(frDestination, frMax)));
            }
          }
        }
      }

      // Synchronize Word Doc Pane if open
      if (state.showWordDocView && docxPreviewFrame) {
        try {
          const docxDoc = docxPreviewFrame.contentDocument || docxPreviewFrame.contentWindow.document;
          if (docxDoc) {
            const docxScroll = docxDoc.scrollingElement || docxDoc.documentElement;

            const pair = state.alignPairs.find((p) => p.enIndex === index && !p.skip);
            const docxIdx = pair && pair.frIndex !== null ? pair.frIndex : frIndex;
            const docxEl = docxDoc.querySelector(`[data-swap-index="${docxIdx}"]`);

            if (docxEl) {
              if (docxIdx === 0) {
                place(docxScroll, 0);
              } else {
                const docxRect = docxEl.getBoundingClientRect();
                const docxTop = docxRect.top + docxScroll.scrollTop;
                const docxMax = Math.max(0, docxScroll.scrollHeight - docxScroll.clientHeight);
                const docxDestination = docxTop + docxRect.height / 2 - docxScroll.clientHeight / 2;
                place(docxScroll, Math.max(0, Math.min(docxDestination, docxMax)));
              }
            } else {
              const docxItems = getSyncItems(docxPreviewFrame);
              if (docxItems.length) {
                if (docxIdx <= 0) {
                  place(docxScroll, 0);
                } else {
                  const closest = docxItems.reduce((best, it) =>
                    Math.abs(it.index - docxIdx) < Math.abs(best.index - docxIdx) ? it : best, docxItems[0]);
                  if (closest) {
                    const docxMax = Math.max(0, docxScroll.scrollHeight - docxScroll.clientHeight);
                    const docxDestination = closest.top + closest.height / 2 - docxScroll.clientHeight / 2;
                    place(docxScroll, Math.max(0, Math.min(docxDestination, docxMax)));
                  }
                }
              }
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {
    if (enScroll) programmaticScrollEls.delete(enScroll);
    if (frScroll) programmaticScrollEls.delete(frScroll);
  }
}

function jumpToBlock(enIdx, opts = {}) {
  // Invalid input is ignored (never invent block 1 from garbage): legit
  // callers always pass validated indices, and a no-op keeps the current
  // highlight/HUD instead of teleporting to the first block.
  if (typeof enIdx !== 'number' || isNaN(enIdx)) return;
  if (enIdx < 0 || enIdx >= state.enBlocks.length) return;
  state.activePreviewBlock = enIdx;
  state.lastKnownEnIndex = enIdx;

  applyActiveHighlight();
  updateActiveBlockHud(enIdx);
  alignPreviewBlocks(enIdx, opts);
}

// --- Preview pair height equalization (visual comparison only) ---
// French translations usually run longer than the English source, so the two
// sides of a pair can have different heights, and every difference compounds:
// one pair's extra height offsets everything below it in the other pane.
//
// Every pair is padded on its shorter side, not just the focused one. Padding
// only the focused pair left the pairs above it at natural height, so the
// panes were offset for the whole stretch between the top of the document and
// wherever you happened to be looking — the "everything below the H1 is a
// screen lower" effect at the start of a document. With all pairs padded the
// cumulative tops match from block 0 down. Preview-only: the export reads
// text/state (never preview styles), and the DOCX pane is left untouched as
// the unmodified reference.
const EQ_ATTR = 'data-symmetra-eq';
// Sub-pixel, because every pair is padded now: rect heights are fractional,
// so a 2px threshold would let ~0.5px of drift accumulate per pair and end
// up tens of pixels adrift by the bottom of a long document. Only exact ties
// are skipped.
const EQ_MIN_DELTA = 0.5;
const EQ_SKIP_TAGS = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'EMBED', 'OBJECT']);

function eqIsVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.classList.contains('gc-img-replaced') || el.style.display === 'none') return false;
  const closed = el.closest ? el.closest('details:not([open])') : null;
  if (closed && !(el.closest && el.closest('summary'))) return false;
  return true;
}

// Replaced/hidden images can't take a min-height: measure their visible
// placeholder sibling instead (same fallback as the highlight logic).
function eqMeasurable(el) {
  if (!el || el.nodeType !== 1) return null;
  if (eqIsVisible(el) && !EQ_SKIP_TAGS.has(el.tagName)) return el;
  const sib = el.nextElementSibling;
  if (sib && sib.classList && sib.classList.contains('gc-img-placeholder') && eqIsVisible(sib)) {
    return sib;
  }
  return null;
}

// Pure helper (takes docs + pairs as args so it stays testable): returns stats.
function equalizePreviewPairHeights(enDoc, frDoc, pairs) {
  const stats = { pairs: 0, adjusted: 0 };
  try {
    if (!enDoc || !frDoc || !Array.isArray(pairs) || !pairs.length) return stats;

    // Reset-first: clear any previous pass so re-measurement is never polluted.
    [enDoc, frDoc].forEach((doc) => {
      doc.querySelectorAll(`[${EQ_ATTR}]`).forEach((el) => {
        el.style.minHeight = '';
        el.removeAttribute(EQ_ATTR);
      });
    });

    // Phase 1 — reads only (no writes, so layout is measured exactly once).
    const ops = [];
    pairs.forEach((pair) => {
      if (!pair || pair.skip) return;
      const enIndex = pair.enIndex;
      const frIndices = pair.groupedFrIndices && pair.groupedFrIndices.length
        ? pair.groupedFrIndices
        : (pair.frIndex !== null && pair.frIndex !== undefined ? [pair.frIndex] : []);
      if (typeof enIndex !== 'number' || !frIndices.length) return;

      const collectSpan = (doc, attr, values) => {
        const seen = new Set();
        let els = [];
        values.forEach((v) => {
          if (v === null || v === undefined) return;
          doc.querySelectorAll(`[${attr}="${v}"]`).forEach((el) => {
            if (!seen.has(el)) {
              seen.add(el);
              els.push(el);
            }
          });
        });
        els = els.map(eqMeasurable).filter(Boolean).filter((el) => {
          const r = el.getBoundingClientRect();
          return r && (r.width > 0 || r.height > 0);
        });
        if (!els.length) return null;
        els.sort((a, b) => (
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        ));
        const first = els[0].getBoundingClientRect();
        const last = els[els.length - 1].getBoundingClientRect();
        return { lastEl: els[els.length - 1], lastH: last.height, spanH: last.bottom - first.top };
      };

      // EN doc tags by EN index; FR doc mirrors the EN structure (data-swap-index
      // is the EN index) and additionally carries data-fr-index.
      const enSpan = collectSpan(enDoc, 'data-swap-index', [enIndex]);
      const frSpan = collectSpan(frDoc, 'data-swap-index', [enIndex])
        || collectSpan(frDoc, 'data-fr-index', frIndices);
      if (!enSpan || !frSpan) return;
      stats.pairs++;

      const delta = enSpan.spanH - frSpan.spanH;
      if (Math.abs(delta) <= EQ_MIN_DELTA) return;
      const target = delta > 0
        ? { el: frSpan.lastEl, h: frSpan.lastH, need: frSpan.lastH + delta }
        : { el: enSpan.lastEl, h: enSpan.lastH, need: enSpan.lastH - delta };
      ops.push(target);
    });

    // Phase 2 — writes only.
    ops.forEach((op) => {
      op.el.style.minHeight = `${Math.max(0, op.need)}px`;
      op.el.setAttribute(EQ_ATTR, '1');
      stats.adjusted++;
    });
  } catch (_) {}
  return stats;
}

// Equalizing is a full measure-and-write pass over every pair, so gate it on
// the content it actually depends on — NOT on the focused block. Padding is
// focus-independent (that is the whole point: the panes stay row-aligned
// everywhere, not just below wherever you happen to be), so navigating must
// not trigger a pass. It used to: updateActiveBlockHud runs on every scroll
// tick, so each focus change cleared every spacer, reflowed the whole
// document, measured, and re-padded it — layout oscillating underneath the
// scroll handler, which made the active block get derived from intermediate
// geometry and appear to skip.
let lastEqSignature = '';

function eqSignature(enDoc, frDoc, enScroll, frScroll) {
  return [
    enScroll.scrollHeight,
    frScroll.scrollHeight,
    enDoc.querySelectorAll(`[${EQ_ATTR}]`).length,
    frDoc.querySelectorAll(`[${EQ_ATTR}]`).length,
  ].join('|');
}

function equalizePreviewHeights() {
  try {
    if (!enPreviewFrame || !frPreviewFrame) return { pairs: 0, adjusted: 0 };
    // Skip while the English pane is collapsed: at zero track width its text
    // wraps into enormously tall elements, and matching them would stretch
    // the French side (and its highlight box) into giant empty boxes.
    if (state.enPaneCollapsed) return { pairs: 0, adjusted: 0 };
    const enDoc = enPreviewFrame.contentDocument || enPreviewFrame.contentWindow.document;
    const frDoc = frPreviewFrame.contentDocument || frPreviewFrame.contentWindow.document;
    if (!enDoc || !frDoc) return { pairs: 0, adjusted: 0 };
    // Skip while the panes aren't laid out (e.g. code view hides them).
    const enScroll = enDoc.scrollingElement || enDoc.documentElement;
    const frScroll = frDoc.scrollingElement || frDoc.documentElement;
    if (!enScroll || enScroll.clientHeight === 0 || !frScroll || frScroll.clientHeight === 0) {
      return { pairs: 0, adjusted: 0 };
    }
    if (eqSignature(enDoc, frDoc, enScroll, frScroll) === lastEqSignature) {
      return { pairs: 0, adjusted: 0 };
    }
    const stats = equalizePreviewPairHeights(enDoc, frDoc, state.alignPairs || []);
    // Record the POST-pass state, so the next call sees an unchanged document
    // and settles after a single pass instead of oscillating.
    lastEqSignature = eqSignature(enDoc, frDoc, enScroll, frScroll);
    return stats;
  } catch (_) {
    return { pairs: 0, adjusted: 0 };
  }
}

// Strip every equalization spacer and forget the layout they were built from,
// so the next pass rebuilds from natural layout (used when collapsing the
// English pane, whose zero-width measurements must never linger).
function clearPreviewPairSpacers() {
  try {
    [enPreviewFrame, frPreviewFrame].forEach((frame) => {
      const doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
      if (doc) {
        doc.querySelectorAll(`[${EQ_ATTR}]`).forEach((el) => {
          el.style.minHeight = '';
          el.removeAttribute(EQ_ATTR);
        });
      }
    });
  } catch (_) {}
  lastEqSignature = '';
}

// Equalization depends only on the document content, never on the focused
// block, so this is a no-op once a pass has settled. It stays wired into
// updateActiveBlockHud because that runs *before* alignPreviewBlocks on every
// jump: centering has to measure the post-spacer layout, and on a freshly
// rebuilt document the pass may not have run yet.
function maybeEqualizeActivePair() {
  // Frozen while the tour auto-glide runs: resetting spacers mid-glide
  // shifts layout under its precomputed destination and the glide stutters.
  if (state.demoScrolling) return;
  equalizePreviewHeights();
}

function updateActiveBlockHud(enIdx) {
  // Equalize before any re-centering, so centering measures the post-spacer
  // layout. Equalization is content-gated, not focus-gated, so this is a no-op
  // once a pass has settled.
  maybeEqualizeActivePair();
  if (!activeBlockHudText || !activeBlockHudTag) return;
  // Sanitize here too: any invalid index becomes block 1 so the HUD never shows NaN.
  if (typeof enIdx !== 'number' || isNaN(enIdx)) enIdx = 0;
  const total = state.enBlocks ? state.enBlocks.length : 0;
  if (total > 0) enIdx = Math.max(0, Math.min(enIdx, total - 1));
  const currentBlock = state.enBlocks && state.enBlocks[enIdx] ? state.enBlocks[enIdx] : null;
  const tag = currentBlock ? `<${currentBlock.tag}>` : '';
  const displayNum = total > 0 ? enIdx + 1 : 0;
  // The HUD number is now an inline-editable input: don't clobber it while focused.
  if (document.activeElement !== activeBlockHudText) {
    activeBlockHudText.value = `${displayNum}`;
  }
  activeBlockHudText.style.width = `${String(displayNum).length + 1.5}ch`;
  if (activeBlockHudTotal) activeBlockHudTotal.textContent = `${total}`;
  activeBlockHudTag.textContent = tag;
}

const scrollAnimState = new WeakMap();

function cancelSmoothFollowScroll(scrollEl) {
  const anim = scrollAnimState.get(scrollEl);
  if (anim && anim.raf) {
    cancelAnimationFrame(anim.raf);
    anim.raf = null;
  }
  programmaticScrollEls.delete(scrollEl);
}

// Scrollbar drags and trackpad gestures fire dozens of scroll events per
// second. Opening/closing <details> on every tick mutates page height under
// the user's thumb, so the browser clamps scrollTop and the pane feels
// stuck, rubber-banding back. Defer that layout-mutating sync until the
// gesture settles; highlight/HUD/active updates above stay immediate.
// Reads live state at fire time, so a discrete jump in between still lands
// correctly. Discrete paths (jumpToBlock, stepFrameBlock) keep calling the
// direct version.
let detailsScrollSyncTimer = null;

function scheduleDetailsSyncFromScroll() {
  if (detailsScrollSyncTimer) clearTimeout(detailsScrollSyncTimer);
  detailsScrollSyncTimer = setTimeout(() => {
    detailsScrollSyncTimer = null;
    try {
      if (typeof state.activePreviewBlock === 'number' && !isNaN(state.activePreviewBlock)) {
        updateDetailsStateForActiveBlock(state.activePreviewBlock);
      }
    } catch (_) {}
  }, 150);
}

function smoothFollowScroll(scrollEl, destination) {
  let anim = scrollAnimState.get(scrollEl);
  if (!anim) {
    anim = { raf: null, dest: destination, lastSet: null, ticks: 0 };
    scrollAnimState.set(scrollEl, anim);
  } else {
    anim.dest = destination;
    anim.ticks = 0;
  }
  if (anim.lastSet === null || anim.lastSet === undefined) {
    try { anim.lastSet = scrollEl.scrollTop || 0; } catch (_) {}
  }
  programmaticScrollEls.add(scrollEl);
  if (anim.raf) return; // loop already running; it'll pick up the new dest next frame

  const step = () => {
    // Layout can shrink mid-ease (details closing, spacer resets): clamp the
    // destination to what's still reachable, otherwise the loop below never
    // converges — spinning forever, pinning scrollTop and swallowing every
    // later scroll event behind a never-released programmatic guard.
    let max = 0;
    try { max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight); } catch (_) {}
    if (anim.dest > max) anim.dest = max;
    if (anim.dest < 0) anim.dest = 0;
    anim.ticks = (anim.ticks || 0) + 1;
    const cur = scrollEl.scrollTop;
    const diff = anim.dest - cur;
    // Watchdog: never ease for more than ~2s, no matter what layout does.
    if (Math.abs(diff) < 0.5 || anim.ticks > 120) {
      scrollEl.scrollTop = anim.dest;
      noteFnLandingScroll(scrollEl);
      try { anim.lastSet = scrollEl.scrollTop; } catch (_) {}
      anim.raf = null;
      // Let one more frame pass so the programmatic scroll event this
      // final write triggers gets swallowed before we release the flag.
      requestAnimationFrame(() => {
        programmaticScrollEls.delete(scrollEl);
      });
      return;
    }
    scrollEl.scrollTop = cur + diff * 0.25;
    noteFnLandingScroll(scrollEl);
    try { anim.lastSet = scrollEl.scrollTop; } catch (_) {}
    anim.raf = requestAnimationFrame(step);
  };
  anim.raf = requestAnimationFrame(step);
}

// A scroll event on a guarded element is ours only if the position matches
// the easing loop's last write. Anything else means the user grabbed the
// scrollbar mid-ease: cancel the loop and handle the gesture as user input
// instead of swallowing it (which felt stuck, snapping back to the stale
// destination until the ease finished).
function userOverrodeProgrammaticScroll(scrollEl) {
  try {
    const anim = scrollAnimState.get(scrollEl);
    if (!anim || typeof anim.lastSet !== 'number') return false;
    if (Math.abs((scrollEl.scrollTop || 0) - anim.lastSet) > 2) {
      cancelSmoothFollowScroll(scrollEl);
      return true;
    }
  } catch (_) {}
  return false;
}

function syncScroll(sourceFrame, targetFrame) {
  try {
    if (isTogglingWordDoc) return;
    if (!state.showWordDocView && sourceFrame === docxPreviewFrame) return;
    // Ignore scroll events from hidden/collapsed panes. Hiding a frame
    // (display:none on view switches, 0-width track on EN collapse) clamps
    // its scrollTop to 0 and fires a scroll event; without this guard that
    // event reads position 0 while layout is stale and wrongly crowns block
    // 1 as the active block. The frame element's own rect is synchronously
    // accurate even when the inner document's metrics lag a frame behind.
    try {
      const frameRect = sourceFrame && sourceFrame.getBoundingClientRect
        ? sourceFrame.getBoundingClientRect()
        : null;
      if (!frameRect || frameRect.width < 2 || frameRect.height < 2) return;
    } catch (_) {
      return;
    }

    const srcDoc = sourceFrame.contentDocument || sourceFrame.contentWindow.document;
    if (!srcDoc) return;
    const srcScroll = srcDoc.scrollingElement || srcDoc.documentElement;
    if (!srcScroll || srcScroll.clientHeight === 0) return;
    // Guarded elements are mid-ease from our own code — unless the position no
    // longer matches the loop's last write, which proves the user grabbed the
    // scrollbar. Take over instead of swallowing the gesture.
    if (programmaticScrollEls.has(srcScroll) && !userOverrodeProgrammaticScroll(srcScroll)) return;
    // A live user gesture wins over any in-flight programmatic ease on this
    // pane; otherwise the easing loop keeps yanking scrollTop toward a stale
    // destination and the drag feels stuck, snapping back.
    cancelSmoothFollowScroll(srcScroll);
    const srcItems = getSyncItems(sourceFrame);
    if (!srcItems.length) return;

    const maxScroll = Math.max(0, srcScroll.scrollHeight - srcScroll.clientHeight);
    const viewportCenter = srcScroll.scrollTop + srcScroll.clientHeight / 2;

    // Pick active block. Pin both scroll edges (mirrors findTopIndexForFrame):
    // a short last block never crosses the viewport-center line because of
    // the frame's bottom padding, so without the bottom pin the final block
    // — e.g. the last footnote — can never become active by scrolling.
    let candidate = srcItems[0];
    if (srcScroll.scrollTop <= 10) {
      candidate = srcItems[0];
    } else if (maxScroll > 0 && srcScroll.scrollTop >= maxScroll - 4) {
      candidate = srcItems[srcItems.length - 1];
    } else {
      const topThreshold = viewportCenter;
      for (const item of srcItems) {
        if (item.top <= topThreshold) {
          candidate = item;
        } else {
          break;
        }
      }
    }

    const fnPin = readFnLandingPin(srcScroll);
    if (fnPin) {
      const pinned = srcItems.find((it) => it.index === fnPin.index);
      if (pinned) candidate = pinned;
    }

    const pixelOffset = viewportCenter - (candidate.top + candidate.height / 2);
    const sourceIndex = candidate.index;
    const isEn = sourceFrame === enPreviewFrame;
    const isDocx = sourceFrame === docxPreviewFrame;

    let enIndex;
    if (isEn) {
      enIndex = sourceIndex;
    } else if (isDocx) {
      const pair = state.alignPairs.find(
        (p) => !p.skip && (p.frIndex === sourceIndex || (p.groupedFrIndices && p.groupedFrIndices.includes(sourceIndex)))
      );
      enIndex = pair && typeof pair.enIndex === 'number' ? pair.enIndex : sourceIndex - (state.syncOffset || 0);
    } else {
      enIndex = sourceIndex - state.syncOffset;
    }

    state.lastKnownEnIndex = enIndex;
    state.activePreviewBlock = Math.max(0, Math.min(enIndex, state.enBlocks.length - 1));

    // The highlighted bar actively follows the scroll position!
    highlightIndexInFrame(sourceFrame, sourceIndex);
    updateActiveBlockHud(state.activePreviewBlock);

    // If auto-sync is enabled and not paused with Alt, synchronize other frames too
    if (state.autoSync && !state.syncPaused) {
      const targets = [];
      if (sourceFrame !== enPreviewFrame) {
        targets.push({ frame: enPreviewFrame, index: state.activePreviewBlock });
      }
      if (sourceFrame !== frPreviewFrame) {
        targets.push({ frame: frPreviewFrame, index: state.activePreviewBlock + state.syncOffset });
      }
      if (state.showWordDocView && docxPreviewFrame && sourceFrame !== docxPreviewFrame) {
        const pair = state.alignPairs.find((p) => p.enIndex === state.activePreviewBlock && !p.skip);
        const docxIdx = pair && pair.frIndex !== null ? pair.frIndex : state.activePreviewBlock + state.syncOffset;
        targets.push({ frame: docxPreviewFrame, index: docxIdx });
      }

      targets.forEach(({ frame: tFrame, index: tIndex }) => {
        highlightIndexInFrame(tFrame, tIndex);
        const tDoc = tFrame.contentDocument || tFrame.contentWindow.document;
        if (!tDoc) return;
        const tScroll = tDoc.scrollingElement || tDoc.documentElement;
        const tItems = getSyncItems(tFrame);
        if (!tItems.length) return;

        let tItem = tItems.find((it) => it.index === tIndex);
        if (!tItem) {
          tItem = tItems.reduce((best, it) =>
            Math.abs(it.index - tIndex) < Math.abs(best.index - tIndex) ? it : best, tItems[0]);
        }
        if (!tItem) return;

        const tMax = Math.max(0, tScroll.scrollHeight - tScroll.clientHeight);
        let destination;
        if (srcScroll.scrollTop <= 10 && state.syncOffset === 0) {
          destination = 0;
        } else {
          destination = Math.max(0, Math.min(tItem.top + tItem.height / 2 - tScroll.clientHeight / 2 + (pixelOffset || 0), tMax));
        }

        smoothFollowScroll(tScroll, destination);
      });
    }
    scheduleDetailsSyncFromScroll();
  } catch (_) {}
}

let wheelLock = false;

let altWheelLock = false;

let wheelResetTimer = null;

let accumulatedDeltaY = 0;

let lastHoveredFrame = null;

// A pane that isn't laid out (display:none in Code mode, or a collapsed
// track) always reads scrollTop 0, so findTopIndexForFrame returns its first
// item and stepFrameBlock jumps the active block to 1 (or 5 for a 5-step)
// from anywhere. Callers resolve the target through this first.
function isFrameSteppable(frame) {
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

// Discrete threshold: standard mouse wheel notches emit ~50-120 delta in a
// single event. Trackpad events emit continuous smaller deltas that
// accumulate smoothly.
const WHEEL_STEP_THRESHOLD = 20;

// Shared synced-mode stepping: accumulate wheel delta and advance exactly one
// block per threshold quantum (with cooldown), so neither mouse notches nor
// trackpad flicks can skip blocks. Used by the visual view and the code view.
function stepSyncedBlockFromWheel(e, delta) {
  // Prevent browser default raw pixel jumping so blocks aren't skipped
  if (e.cancelable) {
    e.preventDefault();
  }

  accumulatedDeltaY += delta;

  if (wheelResetTimer) {
    clearTimeout(wheelResetTimer);
  }
  wheelResetTimer = setTimeout(() => {
    accumulatedDeltaY = 0;
    wheelLock = false;
  }, 180);

  if (wheelLock) return;

  if (Math.abs(accumulatedDeltaY) >= WHEEL_STEP_THRESHOLD || Math.abs(delta) >= WHEEL_STEP_THRESHOLD) {
    const direction = accumulatedDeltaY > 0 || delta > 0 ? 1 : -1;
    accumulatedDeltaY = 0;
    wheelLock = true;

    if (direction > 0) {
      if (state.activePreviewBlock < state.enBlocks.length - 1) {
        jumpToBlock(state.activePreviewBlock + 1);
      }
    } else {
      if (state.activePreviewBlock > 0) {
        jumpToBlock(state.activePreviewBlock - 1);
      }
    }

    // Cooldown prevents multiple jumps from a single flick/notch of mouse wheel
    setTimeout(() => {
      wheelLock = false;
    }, 140);
  }
}

function handleWheelNavigation(e, sourceFrameOverride = null) {
  if (e.ctrlKey || e.metaKey) {
    if (e.cancelable) e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else if (e.deltaY > 0) {
      zoomOut();
    }
    return;
  }
  if (!state.enBlocks || state.enBlocks.length === 0) return;

  const rawDelta = e.deltaY;
  if (Math.abs(rawDelta) < 0.5) return;

  // Normalize delta across line and pixel deltaModes
  const delta = e.deltaMode === 1 ? rawDelta * 30 : e.deltaMode === 2 ? rawDelta * 100 : rawDelta;

  const isAlt = e.altKey || state.syncPaused || !state.autoSync;

  // Code view editors use the same discrete block-stepping as the visual
  // view so trackpad/wheel gestures can't skip blocks. With Alt held (or
  // paused/manual sync), keep free native scrolling — the code scroll
  // listeners follow the active block instead.
  const overCodeEditor = state.frViewMode !== 'visual' && (
    e.target?.closest?.('#frCodeEditor') ||
    e.target?.id === 'frCodeEditor' ||
    e.target?.closest?.('#enCodeHighlight') ||
    e.target?.closest?.('#enCodeEditor') ||
    e.target?.id === 'enCodeHighlight' ||
    e.target?.id === 'enCodeEditor'
  );
  if (overCodeEditor) {
    if (isAlt) return;
    stepSyncedBlockFromWheel(e, delta);
    return;
  }

  // When Alt is held or Auto-sync is off, allow independent scrolling for the pane under the cursor
  if (isAlt) {
    if (e.cancelable) {
      e.preventDefault();
    }

    let targetFrame = sourceFrameOverride || lastHoveredFrame;
    if (!isFrameSteppable(targetFrame)) {
      // Stale hover (pane got hidden by a view switch) or no pointer context:
      // re-resolve from the element under the cursor, and only accept a pane
      // that is actually laid out.
      targetFrame = null;
      if (e.target && typeof e.target.closest === 'function') {
        if (e.target.closest('#docxPreviewPane') || e.target.closest('#docxPreviewFrame')) {
          targetFrame = docxPreviewFrame;
        } else if (e.target.closest('#frPreviewPane') || e.target.closest('#frPreviewFrame')) {
          targetFrame = frPreviewFrame;
        } else {
          targetFrame = enPreviewFrame;
        }
      } else {
        targetFrame = enPreviewFrame;
      }
      if (!isFrameSteppable(targetFrame)) targetFrame = null;
    }

    if (targetFrame) {
      // Check if it's a discrete mouse wheel notch vs continuous smooth trackpad gesture
      const isMouseWheelNotch = e.deltaMode !== 0 || Math.abs(rawDelta) >= 40;
      if (isMouseWheelNotch) {
        if (altWheelLock) return;
        altWheelLock = true;
        const direction = delta > 0 ? 1 : -1;
        stepFrameBlock(targetFrame, direction);
        setTimeout(() => {
          altWheelLock = false;
        }, 140);
      } else {
        // Continuous smooth trackpad gesture
        const doc = targetFrame.contentDocument || targetFrame.contentWindow?.document;
        if (doc) {
          const scrollEl = doc.scrollingElement || doc.documentElement;
          if (scrollEl) {
            cancelSmoothFollowScroll(scrollEl);
            scrollEl.scrollTop += delta;
            const topIdx = findTopIndexForFrame(targetFrame);
            if (topIdx !== null) {
              highlightIndexInFrame(targetFrame, topIdx);
              if (targetFrame === enPreviewFrame) {
                state.activePreviewBlock = topIdx;
                state.lastKnownEnIndex = topIdx;
                updateActiveBlockHud(topIdx);
              } else if (targetFrame === docxPreviewFrame) {
                const pair = state.alignPairs.find(
                  (p) => !p.skip && (p.frIndex === topIdx || (p.groupedFrIndices && p.groupedFrIndices.includes(topIdx)))
                );
                const enIdx = pair && typeof pair.enIndex === 'number'
                  ? pair.enIndex
                  : Math.max(0, Math.min(topIdx - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
                state.activePreviewBlock = enIdx;
                state.lastKnownEnIndex = enIdx;
                updateActiveBlockHud(enIdx);
              } else if (targetFrame === frPreviewFrame) {
                const enIdx = Math.max(0, Math.min(topIdx - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
                state.activePreviewBlock = enIdx;
                state.lastKnownEnIndex = enIdx;
                updateActiveBlockHud(enIdx);
              }
              scheduleDetailsSyncFromScroll();
            }
          }
        }
      }
    }
    return;
  }

  stepSyncedBlockFromWheel(e, delta);
}

function setupIframeEventListeners() {
  const attachListeners = (frame, targetFrame) => {
    const attachToWindow = () => {
      updateIframesTheme();
      applyPreviewZoom();
      try {
        const win = frame.contentWindow;
        if (!win) return;

        if (frame === docxPreviewFrame && state.showWordDocView) {
          setTimeout(() => {
            if (state.showWordDocView && typeof state.activePreviewBlock === 'number') {
              alignPreviewBlocks(state.activePreviewBlock);
              applyActiveHighlight();
            }
          }, 60);
        }

        // Scroll sync (for manual drag of scrollbar)
        if (win._symmetraScrollHandler) {
          win.removeEventListener('scroll', win._symmetraScrollHandler);
        }
        win._symmetraScrollHandler = () => {
          lastHoveredFrame = frame;
          syncScroll(frame, targetFrame);
        };
        win.addEventListener('scroll', win._symmetraScrollHandler, { passive: true });

        // Wheel navigation (1 notch = 1 block down/up, or independent scroll when Alt is held)
        if (win._symmetraWheelHandler) {
          win.removeEventListener('wheel', win._symmetraWheelHandler);
        }
        win._symmetraWheelHandler = (e) => {
          lastHoveredFrame = frame;
          handleWheelNavigation(e, frame);
        };
        win.addEventListener('wheel', win._symmetraWheelHandler, { passive: false });

        const doc = frame.contentDocument;
        if (doc) {
          if (doc._symmetraWheelHandler) {
            doc.removeEventListener('wheel', doc._symmetraWheelHandler);
          }
          doc._symmetraWheelHandler = (e) => {
            lastHoveredFrame = frame;
            handleWheelNavigation(e, frame);
          };
          doc.addEventListener('wheel', doc._symmetraWheelHandler, { passive: false });

          // Live visual-edit sync: typing in the FR pane refreshes the code
          // pane (when visible) via window bridge to avoid a code-view import
          // cycle. Rebound per document so rebuilt frames stay covered.
          if (frame === frPreviewFrame) {
            if (!doc._symmetraVisualEditSync) {
              doc._symmetraVisualEditSync = true;
              doc.addEventListener('input', () => {
                try {
                  if (typeof window !== 'undefined' && typeof window.refreshCodeFromVisualEdits === 'function') {
                    window.refreshCodeFromVisualEdits();
                  }
                } catch (_) {}
              });
            }
          }

          doc.addEventListener('mousemove', () => {
            lastHoveredFrame = frame;
          }, { passive: true });

          doc.addEventListener('mouseenter', () => {
            lastHoveredFrame = frame;
          }, { passive: true });
        }

        // Keyboard navigation & Alt detection inside iframe
        if (win._symmetraKeyHandler) {
          win.removeEventListener('keydown', win._symmetraKeyHandler);
        }
        win._symmetraKeyHandler = (e) => {
          if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
            e.preventDefault();
            if (e.key === '=' || e.key === '+') zoomIn();
            else if (e.key === '-' || e.key === '_') zoomOut();
            else if (e.key === '0') zoomReset();
            return;
          }
          if (e.key === 'Alt' && !e.repeat) {
            if (!state.syncPaused) showHeaderNote('Sync paused — panes scroll independently', 'paused');
            state.syncPaused = true;
            updateSyncStatusLabel();
          }
          handleKeyNavigation(e);
        };
        win.addEventListener('keydown', win._symmetraKeyHandler);

        if (win._symmetraKeyUpHandler) {
          win.removeEventListener('keyup', win._symmetraKeyUpHandler);
        }
        win._symmetraKeyUpHandler = (e) => {
          if (e.key === 'Alt') {
            if (state.syncPaused) showHeaderNote('Sync resumed', 'live');
            state.syncPaused = false;
            updateSyncStatusLabel();
          }
        };
        win.addEventListener('keyup', win._symmetraKeyUpHandler);

        win.addEventListener('blur', () => {
          state.syncPaused = false;
          updateSyncStatusLabel();
        });

        // Focus sync — keep activePreviewBlock in sync when Tabbing inside iframe
        if (win._symmetraFocusHandler) {
          win.removeEventListener('focusin', win._symmetraFocusHandler);
        }
        win._symmetraFocusHandler = (e) => {
          const target = e.target.closest('[data-swap-index]');
          if (target) {
            const idx = parseInt(target.getAttribute('data-swap-index'), 10);
            if (!isNaN(idx) && idx >= 0 && idx < state.enBlocks.length) {
              state.activePreviewBlock = idx;
              state.lastKnownEnIndex = idx;
              applyActiveHighlight();
              updateActiveBlockHud(idx);
            }
          }
        };
        win.addEventListener('focusin', win._symmetraFocusHandler);

        // Ensure details toggle sync listeners are bound for this document
        if (doc) {
          setupToggleDetailsForDoc(
            doc,
            frame === enPreviewFrame ? 'en' : (frame === docxPreviewFrame ? 'docx' : 'fr')
          );
        }

        // Prevent default browser context menu and show personal context menu in visual preview
        const iframeCtxHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();

          let side = 'fr';
          if (frame === enPreviewFrame) side = 'en';
          else if (frame === docxPreviewFrame) side = 'docx';

          const target = e.target ? (e.target.closest('[data-swap-index], [data-fr-index], [data-en-index], .gc-swap-missing, .gc-swap-extra, [data-extra-fr], p, h1, h2, h3, h4, h5, h6, li, dd, dt, th, td, blockquote, figcaption, div, section, article, table, img, a') || e.target) : null;
          const text = target ? (target.textContent || '').trim() : '';
          const lower = text.toLowerCase();

          const isMissing = Boolean(
            (target && target.classList && target.classList.contains('gc-swap-missing')) ||
            lower.includes('translation missing') ||
            lower.includes('traduction manquante') ||
            lower.includes('french content missing') ||
            (target && target.getAttribute && /missing/i.test(target.getAttribute('title') || ''))
          );

          const isExtra = Boolean(
            (target && ((target.classList && target.classList.contains('gc-swap-extra')) || (target.hasAttribute && target.hasAttribute('data-extra-fr')))) ||
            lower.includes('extra french content') ||
            lower.includes('contenu français supplémentaire') ||
            lower.includes('contenu francais supplementaire') ||
            (target && target.getAttribute && /extra/i.test(target.getAttribute('title') || ''))
          );

          let enIdx = null;
          let frIdx = null;
          if (target && target.getAttribute) {
            const rawEn = target.getAttribute('data-en-index') || target.getAttribute('data-swap-index') || target.closest('[data-swap-index]')?.getAttribute('data-swap-index');
            if (rawEn !== null && rawEn !== undefined && rawEn !== '') enIdx = parseInt(rawEn, 10);
            const rawFr = target.getAttribute('data-fr-index') || target.closest('[data-fr-index]')?.getAttribute('data-fr-index');
            if (rawFr !== null && rawFr !== undefined && rawFr !== '') frIdx = parseInt(rawFr, 10);
          }

          let rect = { left: 0, top: 0 };
          try {
            rect = frame.getBoundingClientRect();
          } catch (_) {}

          let selText = '';
          try {
            selText = (win.getSelection ? win.getSelection().toString() : '').trim();
          } catch (_) {}

          openContextMenu({
            kind: isExtra ? 'extra' : (isMissing ? 'missing' : 'block'),
            enIndex: !isNaN(enIdx) && enIdx !== null ? enIdx : null,
            frIndex: !isNaN(frIdx) && frIdx !== null ? frIdx : null,
            text: text,
            selectedText: selText,
            side: side,
            x: rect.left + (e.clientX || 0),
            y: rect.top + (e.clientY || 0),
          });
        };

        if (win._symmetraCtxHandler) {
          win.removeEventListener('contextmenu', win._symmetraCtxHandler, true);
        }
        win._symmetraCtxHandler = iframeCtxHandler;
        win.addEventListener('contextmenu', iframeCtxHandler, true);

        if (doc) {
          if (doc._symmetraCtxHandler) {
            doc.removeEventListener('contextmenu', doc._symmetraCtxHandler, true);
          }
          doc._symmetraCtxHandler = iframeCtxHandler;
          doc.addEventListener('contextmenu', iframeCtxHandler, true);
        }
      } catch (e) {
        console.warn('Iframe attach error', e);
      }
    };

    // Remove any previous load listener so they don't accumulate
    if (frame._symmetraLoadHandler) {
      frame.removeEventListener('load', frame._symmetraLoadHandler);
    }
    frame._symmetraLoadHandler = attachToWindow;
    frame.addEventListener('load', frame._symmetraLoadHandler);

    // If frame is already loaded, attach immediately
    try {
      if (frame.contentDocument && (frame.contentDocument.readyState === 'complete' || frame.contentDocument.readyState === 'interactive')) {
        attachToWindow();
      }
    } catch (_) {}
  };

  attachListeners(enPreviewFrame, frPreviewFrame);
  attachListeners(frPreviewFrame, enPreviewFrame);
  if (docxPreviewFrame) {
    attachListeners(docxPreviewFrame, enPreviewFrame);
  }
}

export {
  accumulatedDeltaY,
  alignPreviewBlocks,
  altWheelLock,
  applyActiveHighlight,
  cancelSmoothFollowScroll,
  clearFnLandingPin,
  clearPreviewPairSpacers,
  equalizePreviewHeights,
  equalizePreviewPairHeights,
  findTopIndexForFrame,
  getSyncItems,
  handleWheelNavigation,
  highlightIndexInFrame,
  jumpToBlock,
  lastHoveredFrame,
  noteFnLandingScroll,
  pinFnLanding,
  programmaticScrollEls,
  scrollAnimState,
  scrollFrameToIndex,
  setupIframeEventListeners,
  smoothFollowScroll,
  stepFrameBlock,
  syncScroll,
  updateActiveBlockHud,
  wheelLock,
  wheelResetTimer,
};
