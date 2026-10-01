// Auto-generated imports
import {
  isFootnoteHeadingBlock,
} from './footnotes.js';
import {
  isHeadingLikeBlock,
  isHeadingTag,
  isTableCaptionBlock,
} from './alignment.js';
import {
  alignByTag,
} from './alignment-ops.js';
import {
  previewSection,
} from './dom-refs.js';
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
  condenseSources,
} from './sources.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  updateSyncOffsetBadge,
  updateSyncStatusLabel,
} from './sync-status.js';


// An <img> can only be the translation of an <img>.
//
// Matching is by text, and an image's text is its alt. Two things push the
// aligner off an image: the French caption's text is often a *prefix* of the
// English alt ("Figure 1." against "Figure 1. Text version below."), and the
// French image's own alt is the same string wrapped in an injected
// [TRANSLATION MISSING: ...] marker. Either way the English image ends up
// paired with the French caption and the French image is left over, so in Code
// view the English bar lights the <img> while the French bar sits on the
// <figcaption> and the image never appears active on the French side.
//
// Repair those rows: hand each mis-paired English image the nearest French
// image, and give whatever the French image was paired with the French block
// the image had taken. Pure, and unit-tested.
function repairImagePairings(pairs, enBlocks, frBlocks) {
  if (!Array.isArray(pairs) || !enBlocks || !frBlocks) return;
  const isImg = (list, i) => Boolean(list && list[i] && list[i].tag === 'img');

  // French indices already spoken for by an English image.
  const claimedByImage = new Set();
  for (const p of pairs) {
    if (!p.skip && isImg(enBlocks, p.enIndex) && isImg(frBlocks, p.frIndex)) claimedByImage.add(p.frIndex);
  }

  for (const p of pairs) {
    if (p.skip || !isImg(enBlocks, p.enIndex) || isImg(frBlocks, p.frIndex)) continue;
    const displaced = p.frIndex;
    // Nearest French image that no other English image has taken.
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < frBlocks.length; i++) {
      if (!isImg(frBlocks, i) || claimedByImage.has(i)) continue;
      const d = Math.abs(i - displaced);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best === -1) continue;
    claimedByImage.add(best);
    // Hand the block the image had taken to whatever held the image, so the
    // French side does not simply lose a row.
    const previousHolder = pairs.find((q) => !q.skip && q.frIndex === best && q.enIndex !== p.enIndex);
    p.frIndex = best;
    p.groupedFrIndices = [best];
    if (previousHolder) previousHolder.frIndex = displaced;
  }
}

function computeAlignment(targetBlockIndex = null) {
  const enTags = state.enBlocks.map((b) => b.tag);
  const frTags = state.frBlocks.map((b) => b.tag);
  const rawRows = alignByTag(enTags, frTags, state.enBlocks, state.frBlocks);

  // Smart multi-line grouping pass:
  // When an English block contains line breaks (<br> tags or \n in text) and the corresponding
  // French translation in Word was split across consecutive individual paragraphs, group those
  // French paragraphs into this single English block so it formats with matching <br> tags!
  const absorbedRowIndices = new Set();
  const processedRows = rawRows.map((r) => ({ ...r }));

  for (let idx = 0; idx < processedRows.length; idx++) {
    const row = processedRows[idx];
    if (row.enIndex === null || row.skip) continue;

    const enB = state.enBlocks[row.enIndex];
    if (!enB) continue;

    const enLines = (enB.text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const enBrCount = enB.brCount !== undefined && enB.brCount > 0 ? enB.brCount : Math.max(0, enLines.length - 1);
    const isMultiLine = enB.hasBr || enBrCount > 0 || enLines.length > 1;

    if (!isMultiLine) continue;

    // Helper: is this French block a content block that can be grouped into a multi-line block?
    const isMergableFrBlock = (frIdx) => {
      if (frIdx === null || frIdx === undefined) return false;
      const frB = state.frBlocks[frIdx];
      if (!frB) return false;
      if (isHeadingTag(frB.tag) || isHeadingLikeBlock(frB) || isFootnoteHeadingBlock(frB)) return false;
      if (isTableCaptionBlock(enB) || isTableCaptionBlock(frB)) return false;
      if (Boolean(enB.inTable) !== Boolean(frB.inTable)) return false;
      return ['p', 'li', 'td', 'th', 'div', 'blockquote', 'dd', 'dt', 'address', 'span'].includes(frB.tag);
    };

    if (row.frIndex !== null) {
      const anchorFrIdx = row.frIndex;
      const backwardFr = [];
      const backwardRows = [];

      // 1. Scan backwards for unaligned consecutive French paragraphs
      let pIdx = idx - 1;
      while (pIdx >= 0) {
        const prevRow = processedRows[pIdx];
        if (!prevRow || prevRow.skip || prevRow.enIndex !== null || prevRow.frIndex === null) {
          break;
        }
        if (!isMergableFrBlock(prevRow.frIndex)) {
          break;
        }
        const currentLowestFr = backwardFr.length > 0 ? backwardFr[0] : anchorFrIdx;
        if (prevRow.frIndex === currentLowestFr - 1 || Math.abs(prevRow.frIndex - currentLowestFr) <= 2) {
          backwardFr.unshift(prevRow.frIndex);
          backwardRows.push(pIdx);
          pIdx--;
        } else {
          break;
        }
      }

      // 2. Scan forwards for unaligned consecutive French paragraphs
      const forwardFr = [];
      const forwardRows = [];
      let nIdx = idx + 1;
      while (nIdx < processedRows.length) {
        const nextRow = processedRows[nIdx];
        if (!nextRow || nextRow.skip || nextRow.enIndex !== null || nextRow.frIndex === null) {
          break;
        }
        if (!isMergableFrBlock(nextRow.frIndex)) {
          break;
        }
        const currentHighestFr = forwardFr.length > 0 ? forwardFr[forwardFr.length - 1] : anchorFrIdx;
        if (nextRow.frIndex === currentHighestFr + 1 || Math.abs(nextRow.frIndex - currentHighestFr) <= 2) {
          forwardFr.push(nextRow.frIndex);
          forwardRows.push(nIdx);
          nIdx++;
        } else {
          break;
        }
      }

      const allGroupedFr = [...backwardFr, anchorFrIdx, ...forwardFr];
      if (allGroupedFr.length > 1) {
        backwardRows.forEach((rIdx) => absorbedRowIndices.add(rIdx));
        forwardRows.forEach((rIdx) => absorbedRowIndices.add(rIdx));

        row.groupedFrIndices = allGroupedFr;
        row.frIndex = allGroupedFr[0];
        row.mergedFrText = allGroupedFr.map((fi) => (state.frBlocks[fi] ? state.frBlocks[fi].text : '')).join('\n');
        row.mergedFrSpans = allGroupedFr.flatMap((fi) => (state.frBlocks[fi] && state.frBlocks[fi].spans) || []);
      }
    } else {
      // row.frIndex === null: check if adjacent unaligned French blocks can be assigned to this multi-line block
      const candidateFr = [];
      const candidateRows = [];

      let pIdx = idx - 1;
      while (pIdx >= 0) {
        const prevRow = processedRows[pIdx];
        if (!prevRow || prevRow.skip || prevRow.enIndex !== null || prevRow.frIndex === null) break;
        if (!isMergableFrBlock(prevRow.frIndex)) break;
        candidateFr.unshift(prevRow.frIndex);
        candidateRows.push(pIdx);
        pIdx--;
      }

      let nIdx = idx + 1;
      while (nIdx < processedRows.length) {
        const nextRow = processedRows[nIdx];
        if (!nextRow || nextRow.skip || nextRow.enIndex !== null || nextRow.frIndex === null) break;
        if (!isMergableFrBlock(nextRow.frIndex)) break;
        candidateFr.push(nextRow.frIndex);
        candidateRows.push(nIdx);
        nIdx++;
      }

      if (candidateFr.length > 0) {
        candidateRows.forEach((rIdx) => absorbedRowIndices.add(rIdx));
        row.groupedFrIndices = candidateFr;
        row.frIndex = candidateFr[0];
        row.mergedFrText = candidateFr.map((fi) => (state.frBlocks[fi] ? state.frBlocks[fi].text : '')).join('\n');
        row.mergedFrSpans = candidateFr.flatMap((fi) => (state.frBlocks[fi] && state.frBlocks[fi].spans) || []);
      }
    }
  }

  const rows = processedRows.filter((_, rIdx) => !absorbedRowIndices.has(rIdx));

  const pairs = [];
  rows.forEach((r) => {
    if (r.enIndex !== null && r.frIndex !== null && !r.skip) {
      pairs.push({
        enIndex: r.enIndex,
        frIndex: r.frIndex,
        groupedFrIndices: r.groupedFrIndices || [r.frIndex],
        mergedFrText: r.mergedFrText,
        mergedFrSpans: r.mergedFrSpans,
        skip: false,
      });
    }
  });

  repairImagePairings(pairs, state.enBlocks, state.frBlocks);

  const issues = computeIssues(rows, state.enBlocks, state.frBlocks);

  state.alignRows = rows;
  state.alignPairs = pairs;
  state.issueGroups = issues;

  // Only a real number is a target index. Anything else (a click event handed
  // straight in by a listener, NaN, a string) must fall back to the current
  // block: Math.min() against a non-numeric value yields NaN, which then
  // poisons activePreviewBlock and makes every downstream querySelector and
  // scroll a silent no-op.
  const hasTarget = typeof targetBlockIndex === 'number' && !isNaN(targetBlockIndex);
  const targetIdx = hasTarget
    ? Math.max(0, Math.min(state.enBlocks.length - 1, targetBlockIndex))
    : (state.activePreviewBlock || 0);

  state.activePreviewBlock = targetIdx;
  state.lastKnownEnIndex = targetIdx;
  state.issueNavIndex = -1;
  state.syncOffset = 0;
  state.frCustomHtml = null;

  renderStatsBar();
  buildDualIframePreviews();
  updateSyncOffsetBadge();
  updateSyncStatusLabel();

  // Condense the source HTML & Word Document upload panels
  condenseSources();

  previewSection.classList.add('show');

  setTimeout(() => {
    applyActiveHighlight();
    alignPreviewBlocks(targetIdx);
    updateActiveBlockHud(targetIdx);
  }, 120);
}

export {
  repairImagePairings,
  computeAlignment,
};
