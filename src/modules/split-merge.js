// Auto-generated imports
import {
  computeAlignment,
} from './alignment-compute.js';
import {
  splitBlockModal,
  splitBlockSubTitle,
  splitOriginalText,
  splitPart1Text,
  splitPart2Text,
} from './dom-refs.js';
import {
  state,
} from './state.ts';
import {
  showToast,
} from './ui-toast.js';
import {
  pushUndoState,
} from './undo.js';


function openSplitBlockModal(targetFrIdx) {
  if (targetFrIdx === undefined || targetFrIdx === null) {
    const pair = state.alignPairs.find((p) => p.enIndex === state.activePreviewBlock);
    targetFrIdx = pair ? pair.frIndex : state.activePreviewBlock;
  }
  if (!state.frBlocks[targetFrIdx]) {
    showToast('Select a valid block to split');
    return;
  }

  state.splitBlockIndex = targetFrIdx;
  const block = state.frBlocks[targetFrIdx];
  if (splitBlockSubTitle) {
    splitBlockSubTitle.textContent = `Splitting French block #${targetFrIdx + 1} (<${block.tag}>)`;
  }
  if (splitOriginalText) {
    splitOriginalText.value = block.text;
  }

  const text = block.text;
  let part1 = '';
  let part2 = '';
  const periodIdx = text.indexOf('. ');
  if (periodIdx !== -1) {
    part1 = text.substring(0, periodIdx + 1).trim();
    part2 = text.substring(periodIdx + 2).trim();
  } else {
    const half = Math.floor(text.length / 2);
    const spaceIdx = text.indexOf(' ', half);
    if (spaceIdx !== -1) {
      part1 = text.substring(0, spaceIdx).trim();
      part2 = text.substring(spaceIdx + 1).trim();
    } else {
      part1 = text;
      part2 = '';
    }
  }

  if (splitPart1Text) splitPart1Text.value = part1;
  if (splitPart2Text) splitPart2Text.value = part2;

  if (splitBlockModal) {
    splitBlockModal.style.display = 'flex';
    requestAnimationFrame(() => {
      splitBlockModal.classList.add('is-open');
      if (splitPart1Text) splitPart1Text.focus();
    });
  }
}

function closeSplitBlockModal() {
  if (!splitBlockModal) return;
  splitBlockModal.classList.remove('is-open');
  setTimeout(() => {
    splitBlockModal.style.display = 'none';
    state.splitBlockIndex = null;
  }, 200);
}

function applySplitBlock() {
  const currentActiveBlock = state.activePreviewBlock;
  const targetIdx = state.splitBlockIndex;
  if (targetIdx === null || !state.frBlocks[targetIdx]) {
    closeSplitBlockModal();
    return;
  }

  const p1 = (splitPart1Text.value || '').trim();
  const p2 = (splitPart2Text.value || '').trim();

  if (!p1 || !p2) {
    showToast('Both split portions must contain text');
    return;
  }

  pushUndoState(`Split block #${targetIdx + 1}`);
  const originalBlock = state.frBlocks[targetIdx];
  const block1 = {
    ...originalBlock,
    text: p1,
    spans: originalBlock.spans ? [...originalBlock.spans] : [],
  };
  const block2 = {
    ...originalBlock,
    text: p2,
    spans: [],
  };

  state.frBlocks.splice(targetIdx, 1, block1, block2);
  closeSplitBlockModal();
  computeAlignment(currentActiveBlock);
  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

function mergeWithNextBlock(targetFrIdx) {
  const currentActiveBlock = state.activePreviewBlock;
  if (targetFrIdx === undefined || targetFrIdx === null) {
    const pair = state.alignPairs.find((p) => p.enIndex === state.activePreviewBlock);
    targetFrIdx = pair ? pair.frIndex : state.activePreviewBlock;
  }
  if (!state.frBlocks[targetFrIdx] || !state.frBlocks[targetFrIdx + 1]) {
    showToast('No subsequent block available to merge with');
    return;
  }

  pushUndoState(`Merge block #${targetFrIdx + 1} with block #${targetFrIdx + 2}`);
  const b1 = state.frBlocks[targetFrIdx];
  const b2 = state.frBlocks[targetFrIdx + 1];

  const b1Len = (b1.text || '').length;
  b1.text = `${b1.text} ${b2.text}`.trim();
  if (b2.spans && b2.spans.length > 0) {
    // b2's text is appended after b1's plus one join space: shift its span
    // offsets so styling still pins to the right occurrences.
    const shifted = b2.spans.map((s) => (
      s && typeof s.start === 'number' ? { ...s, start: s.start + b1Len + 1 } : s
    ));
    b1.spans = (b1.spans || []).concat(shifted);
  }

  state.frBlocks.splice(targetFrIdx + 1, 1);
  computeAlignment(currentActiveBlock);
  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

export {
  applySplitBlock,
  closeSplitBlockModal,
  mergeWithNextBlock,
  openSplitBlockModal,
};
