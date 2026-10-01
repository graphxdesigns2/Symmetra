// Auto-generated imports
import {
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
} from './dom-refs.js';
import {
  state,
} from './state.ts';


function updateDetailsStateForActiveBlock(enIdx) {
  // Frozen while the tour auto-glide runs: opening/closing details mid-glide
  // shifts layout under its precomputed destination and the glide stutters.
  if (state.demoScrolling) return;
  const frames = [
    { frame: enPreviewFrame, name: 'en' },
    { frame: frPreviewFrame, name: 'fr' },
    { frame: docxPreviewFrame, name: 'docx' },
  ].filter((f) => f.frame);

  const pair = state.alignPairs ? state.alignPairs.find((p) => p.enIndex === enIdx && !p.skip) : null;
  const frIdx = pair && pair.frIndex !== null ? pair.frIndex : (typeof enIdx === 'number' ? enIdx + (state.syncOffset || 0) : null);
  const docxIdx = pair && pair.groupedFrIndices && pair.groupedFrIndices.length > 0
    ? pair.groupedFrIndices
    : frIdx;
  const docxIndices = Array.isArray(docxIdx) ? docxIdx : (docxIdx !== null ? [docxIdx] : []);

  const activeDetailsIndices = new Set();
  const activeDetailsSummaries = new Set();

  frames.forEach(({ frame, name }) => {
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const allDetails = Array.from(doc.querySelectorAll('details'));
      allDetails.forEach((d, i) => {
        let hasActive = false;
        if (d.classList.contains('gc-swap-active') || d.querySelector('.gc-swap-active')) {
          hasActive = true;
        } else if (name === 'en' && typeof enIdx === 'number') {
          if (d.querySelector(`[data-swap-index="${enIdx}"], [data-en-index="${enIdx}"]`)) {
            hasActive = true;
          }
        } else if (name === 'fr') {
          if (
            (typeof enIdx === 'number' && d.querySelector(`[data-swap-index="${enIdx}"], [data-en-index="${enIdx}"]`)) ||
            (frIdx !== null && d.querySelector(`[data-fr-index="${frIdx}"]`))
          ) {
            hasActive = true;
          }
        } else if (name === 'docx') {
          if (docxIndices.some((idx) => d.querySelector(`[data-swap-index="${idx}"], [data-fr-index="${idx}"]`))) {
            hasActive = true;
          }
        }

        if (hasActive) {
          activeDetailsIndices.add(i);
          const summary = d.querySelector('summary');
          if (summary) {
            const txt = summary.textContent.trim().toLowerCase();
            if (txt) activeDetailsSummaries.add(txt);
          }
        }
      });
    } catch (_) {}
  });

  frames.forEach(({ frame }) => {
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const allDetails = Array.from(doc.querySelectorAll('details'));
      allDetails.forEach((d, i) => {
        const summary = d.querySelector('summary');
        const txt = summary ? summary.textContent.trim().toLowerCase() : '';
        // _searchPinned marks a details the user navigated into via in-preview
        // search. Without this, the pass below closes it ~150ms after the jump
        // (it holds a search hit, not the active block), collapsing the hit
        // back out from under the viewport. It outranks _userClosed: jumping
        // to the word is an explicit request to see it.
        const searchPinned = Boolean(d._searchPinned);
        const shouldBeOpen = activeDetailsIndices.has(i) ||
          (txt && activeDetailsSummaries.has(txt)) ||
          d.classList.contains('gc-swap-active') ||
          Boolean(d.querySelector('.gc-swap-active')) ||
          searchPinned;

        if (shouldBeOpen) {
          if (!d.open && (!d._userClosed || searchPinned)) {
            d._programmatic = true;
            d.open = true;
            setTimeout(() => {
              d._programmatic = false;
            }, 60);
          }
        } else {
          d._userClosed = false;
          if (d.open) {
            d._programmatic = true;
            d.open = false;
            setTimeout(() => {
              d._programmatic = false;
            }, 60);
          }
        }
      });
    } catch (_) {}
  });
}

function syncDetailsToggle(sourceSide, { open, detailsIndex, swapIndex, enIndex, frIndex }) {
  const allFrames = [
    { frame: enPreviewFrame, name: 'en' },
    { frame: frPreviewFrame, name: 'fr' },
    { frame: docxPreviewFrame, name: 'docx' },
  ];

  allFrames.forEach(({ frame, name }) => {
    if (!frame || name === sourceSide) return;
    try {
      const tDoc = frame.contentDocument || frame.contentWindow?.document;
      if (!tDoc) return;

      let targetDetails = null;

      // 1. Match by summary swap-index or en-index
      if (swapIndex !== null || enIndex !== null) {
        const targetSummary = tDoc.querySelector(
          `details summary[data-swap-index="${swapIndex}"], details summary[data-en-index="${enIndex !== null ? enIndex : swapIndex}"]`
        );
        if (targetSummary) {
          targetDetails = targetSummary.closest('details');
        }
      }

      // 2. Match by summary fr-index
      if (!targetDetails && frIndex !== null) {
        const targetSummary = tDoc.querySelector(`details summary[data-fr-index="${frIndex}"]`);
        if (targetSummary) {
          targetDetails = targetSummary.closest('details');
        }
      }

      // 3. Fallback to matching by ordinal index among details elements
      if (!targetDetails && typeof detailsIndex === 'number' && detailsIndex >= 0) {
        const allTargetDetails = tDoc.querySelectorAll('details');
        if (allTargetDetails[detailsIndex]) {
          targetDetails = allTargetDetails[detailsIndex];
        }
      }

      if (targetDetails) {
        if (!open) {
          targetDetails._userClosed = true;
        } else {
          targetDetails._userClosed = false;
        }
        if (targetDetails.open !== open) {
          targetDetails._programmatic = true;
          targetDetails.open = open;
          setTimeout(() => {
            targetDetails._programmatic = false;
          }, 60);
        }
      }
    } catch (err) {
      console.warn('Error syncing details toggle', err);
    }
  });
}

export {
  syncDetailsToggle,
  updateDetailsStateForActiveBlock,
};
