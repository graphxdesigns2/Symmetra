// Auto-generated imports
import {
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
  replaceEnglishRefBox,
  replaceEnglishRefText,
  replaceInputLabel,
  replaceTextCharCount,
  replaceTextInput,
  replaceTextModal,
  replaceTextModalTitle,
  replaceTextSubTitle,
} from './dom-refs.js';
import {
  renderDrawerBody,
} from './drawer.js';
import {
  computeIssues,
} from './issues.js';
import {
  appendTextWithLineBreaks,
} from './french-url.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  showToast,
} from './ui-toast.js';
import {
  pushUndoState,
} from './undo.js';


let activeReplaceTarget = null;

// New French blocks for a missing EN must be spliced into frBlocks at the
// document-order position (between the neighbouring aligned FR indices), not
// appended at the end. Appending breaks the invariant that frBlocks order
// matches code order, so the code-view block index (which matches blocks
// sequentially) can never locate the new text and centering/highlight fails.
function getFrInsertIndexForEn(enIndex) {
  const rows = state.alignRows || [];
  const rowPos = rows.findIndex((r) => r && r.enIndex === enIndex);
  if (rowPos === -1) return state.frBlocks.length;
  for (let i = rowPos - 1; i >= 0; i--) {
    const r = rows[i];
    if (r && r.frIndex !== null && r.frIndex !== undefined) {
      const vals = Array.isArray(r.groupedFrIndices) && r.groupedFrIndices.length
        ? r.groupedFrIndices
        : [r.frIndex];
      return Math.min(Math.max(...vals) + 1, state.frBlocks.length);
    }
  }
  for (let i = rowPos + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.frIndex !== null && r.frIndex !== undefined) {
      const vals = Array.isArray(r.groupedFrIndices) && r.groupedFrIndices.length
        ? r.groupedFrIndices
        : [r.frIndex];
      return Math.max(0, Math.min(Math.min(...vals), state.frBlocks.length));
    }
  }
  return state.frBlocks.length;
}

function shiftFrIndicesOnInsert(insertIdx) {
  const bump = (v) => (typeof v === 'number' && v >= insertIdx ? v + 1 : v);
  (state.alignRows || []).forEach((r) => {
    if (!r) return;
    if (r.frIndex !== null && r.frIndex !== undefined && r.frIndex >= insertIdx) r.frIndex += 1;
    if (Array.isArray(r.groupedFrIndices)) r.groupedFrIndices = r.groupedFrIndices.map(bump);
  });
  (state.alignPairs || []).forEach((p) => {
    if (!p) return;
    if (p.frIndex !== null && p.frIndex !== undefined && p.frIndex >= insertIdx) p.frIndex += 1;
    if (Array.isArray(p.groupedFrIndices)) p.groupedFrIndices = p.groupedFrIndices.map(bump);
  });
}

function jumpToPairedBlock(target) {
  if (!target) return;
  const { enIndex, frIndex, side } = target;
  let pairEn = enIndex;
  let pairFr = frIndex;
  if (pairEn === null && pairFr !== null && state.alignRows) {
    const r = state.alignRows.find((row) => row.frIndex === pairFr);
    if (r && r.enIndex !== null) pairEn = r.enIndex;
  }
  if (pairFr === null && pairEn !== null && state.alignRows) {
    const r = state.alignRows.find((row) => row.enIndex === pairEn);
    if (r && r.frIndex !== null) pairFr = r.frIndex;
  }

  if (side === 'fr') {
    if (pairEn !== null) {
      state.activePreviewBlock = pairEn;
      state.lastKnownEnIndex = pairEn;
      applyActiveHighlight();
      alignPreviewBlocks(pairEn);
      updateActiveBlockHud(pairEn);
    } else {
      showToast('No paired English block found');
    }
  } else {
    if (pairFr !== null) {
      try {
        const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
        if (frDoc) {
          const el = frDoc.querySelector(`[data-fr-index="${pairFr}"], [data-swap-index="${pairEn}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'box-shadow 0.3s ease, outline 0.3s ease';
            el.style.outline = '2px solid #10b981';
            setTimeout(() => { if (el) el.style.outline = ''; }, 2000);
          }
        }
      } catch (_) {}
    } else {
      showToast('No paired French block found');
    }
  }
}

function copyTargetText(target) {
  if (!target) return;
  const textToCopy = target.selectedText || target.text || (target.enIndex !== null ? state.enBlocks[target.enIndex]?.text : (target.frIndex !== null ? state.frBlocks[target.frIndex]?.text : ''));
  if (textToCopy) {
    navigator.clipboard.writeText(textToCopy).catch(() => {
      showToast('Could not copy to clipboard');
    });
  } else {
    showToast('No text available to copy');
  }
}

async function pasteTargetText(target) {
  if (!target) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      applyReplaceText(target.kind, target.enIndex, target.frIndex, text);
    } else {
      showToast('Clipboard is empty');
    }
  } catch (err) {
    openReplaceTextModal(target);
    showToast('Please paste text in the replacement modal');
  }
}

function openReplaceTextModal(target) {
  if (!target) return;
  activeReplaceTarget = target;

  if (!replaceTextModal) return;

  const { kind, enIndex, frIndex } = target;

  if (kind === 'missing') {
    if (replaceTextModalTitle) replaceTextModalTitle.textContent = 'Replace Missing French Text';
    if (replaceTextSubTitle) {
      replaceTextSubTitle.textContent = enIndex !== null
        ? `Enter French translation for English block #${enIndex + 1}`
        : 'Enter French translation';
    }
    if (replaceInputLabel) replaceInputLabel.textContent = 'Replacement French Text:';

    const enBlock = enIndex !== null && state.enBlocks ? state.enBlocks[enIndex] : null;
    if (enBlock && replaceEnglishRefBox && replaceEnglishRefText) {
      replaceEnglishRefBox.classList.remove('hidden');
      replaceEnglishRefText.textContent = enBlock.text || '';
    } else if (replaceEnglishRefBox) {
      replaceEnglishRefBox.classList.add('hidden');
    }

    let initialVal = '';
    if (frIndex !== null && state.frBlocks && state.frBlocks[frIndex]) {
      const t = state.frBlocks[frIndex].text || '';
      if (!/\[?(?:TRANSLATION\s+MISSING|TRADUCTION\s+MANQUANTE)/i.test(t)) {
        initialVal = t;
      }
    }
    if (replaceTextInput) replaceTextInput.value = initialVal;
  } else if (kind === 'extra') {
    if (replaceTextModalTitle) replaceTextModalTitle.textContent = 'Replace Extra French Content';
    if (replaceTextSubTitle) {
      replaceTextSubTitle.textContent = frIndex !== null
        ? `Edit or replace French content for Word block #${frIndex + 1}`
        : 'Edit or replace extra French content';
    }
    if (replaceInputLabel) replaceInputLabel.textContent = 'French Content:';
    if (replaceEnglishRefBox) replaceEnglishRefBox.classList.add('hidden');

    let initialVal = '';
    if (frIndex !== null && state.frBlocks && state.frBlocks[frIndex]) {
      initialVal = state.frBlocks[frIndex].text || '';
    } else if (target.text) {
      initialVal = target.text;
    }
    initialVal = initialVal
      .replace(/^\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)\s*:\s*/i, '')
      .replace(/\]$/, '')
      .trim();

    if (replaceTextInput) replaceTextInput.value = initialVal;
  } else {
    // Normal preview block
    const isFr = target.side === 'fr' || (frIndex !== null && enIndex === null);
    if (replaceTextModalTitle) replaceTextModalTitle.textContent = isFr ? 'Edit French Block Text' : 'Edit English Block Text';
    if (replaceTextSubTitle) {
      const bNum = isFr ? (frIndex !== null ? frIndex + 1 : (enIndex !== null ? enIndex + 1 : '')) : (enIndex !== null ? enIndex + 1 : '');
      replaceTextSubTitle.textContent = bNum ? `Edit content for block #${bNum}` : 'Edit block content';
    }
    if (replaceInputLabel) replaceInputLabel.textContent = isFr ? 'French Text:' : 'English Text:';

    const enBlock = enIndex !== null && state.enBlocks ? state.enBlocks[enIndex] : null;
    if (isFr && enBlock && replaceEnglishRefBox && replaceEnglishRefText) {
      replaceEnglishRefBox.classList.remove('hidden');
      replaceEnglishRefText.textContent = enBlock.text || '';
    } else if (replaceEnglishRefBox) {
      replaceEnglishRefBox.classList.add('hidden');
    }

    let initialVal = '';
    if (isFr) {
      if (frIndex !== null && state.frBlocks && state.frBlocks[frIndex]) {
        initialVal = state.frBlocks[frIndex].text || '';
      } else if (target.text) {
        initialVal = target.text;
      }
    } else {
      if (enIndex !== null && state.enBlocks && state.enBlocks[enIndex]) {
        initialVal = state.enBlocks[enIndex].text || '';
      } else if (target.text) {
        initialVal = target.text;
      }
    }
    if (replaceTextInput) replaceTextInput.value = initialVal;
  }

  updateReplaceCharCount();

  replaceTextModal.style.display = 'flex';
  requestAnimationFrame(() => {
    replaceTextModal.classList.add('is-open');
    if (replaceTextInput) {
      replaceTextInput.focus();
      replaceTextInput.setSelectionRange(replaceTextInput.value.length, replaceTextInput.value.length);
    }
  });
}

function closeReplaceTextModal() {
  if (!replaceTextModal) return;
  replaceTextModal.classList.remove('is-open');
  setTimeout(() => {
    replaceTextModal.style.display = 'none';
    activeReplaceTarget = null;
  }, 200);
}

function updateReplaceCharCount() {
  if (replaceTextCharCount && replaceTextInput) {
    const len = (replaceTextInput.value || '').length;
    replaceTextCharCount.textContent = `${len} character${len === 1 ? '' : 's'}`;
  }
}

function confirmReplaceText() {
  if (!activeReplaceTarget) {
    closeReplaceTextModal();
    return;
  }
  const newText = (replaceTextInput ? replaceTextInput.value : '').trim();
  if (!newText) {
    showToast('Please enter replacement text');
    if (replaceTextInput) replaceTextInput.focus();
    return;
  }

  const { kind, enIndex, frIndex, side } = activeReplaceTarget;
  applyReplaceText(kind, enIndex, frIndex, newText, side);
  closeReplaceTextModal();
}

function applyReplaceText(kind, enIndex, frIndex, newText, side = 'fr') {
  newText = (newText || '').trim();
  if (!newText) return;

  pushUndoState(side === 'en' ? `Edit English text (#${enIndex !== null ? enIndex + 1 : '?'})` : `Replace text for block #${frIndex !== null ? frIndex + 1 : (enIndex !== null ? enIndex + 1 : '?')}`);

  if (side === 'en' && enIndex !== null && state.enBlocks && state.enBlocks[enIndex]) {
    state.enBlocks[enIndex].text = newText;
    try {
      const enDoc = enPreviewFrame ? (enPreviewFrame.contentDocument || enPreviewFrame.contentWindow?.document) : null;
      if (enDoc) {
        const el = enDoc.querySelector(`[data-swap-index="${enIndex}"], [data-en-index="${enIndex}"]`);
        if (el) {
          el.textContent = newText;
          el.style.transition = 'background-color 0.4s ease';
          el.style.backgroundColor = 'rgba(59, 130, 246, 0.25)';
          setTimeout(() => { if (el) el.style.backgroundColor = ''; }, 1200);
        }
      }
    } catch (_) {}
    state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
    renderStatsBar();
    if (state.drawerOpen && state.activeCategory) {
      renderDrawerBody(state.activeCategory);
    }
    try {
      if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
        window.refreshCodeViewAfterBlockEdit();
      }
    } catch (_) {}
    return;
  }

  if (kind === 'missing' || (enIndex !== null && frIndex === null)) {
    let pair = state.alignPairs.find((p) => p.enIndex === enIndex);
    let row = state.alignRows.find((r) => r.enIndex === enIndex);

    if (!pair) {
      pair = { enIndex, frIndex: null };
      state.alignPairs.push(pair);
    }

    let targetFrIdx = pair.frIndex !== null ? pair.frIndex : (row && row.frIndex !== null ? row.frIndex : null);

    if (targetFrIdx === null) {
      const enB = state.enBlocks && enIndex !== null ? state.enBlocks[enIndex] : null;
      const newFrBlock = {
        tag: enB ? enB.tag : 'p',
        attrTarget: enB ? enB.attrTarget : 'text',
        text: newText,
        spans: [],
        resolved: true,
      };
      targetFrIdx = getFrInsertIndexForEn(enIndex);
      shiftFrIndicesOnInsert(targetFrIdx);
      state.frBlocks.splice(targetFrIdx, 0, newFrBlock);
      pair.frIndex = targetFrIdx;
      pair.groupedFrIndices = [targetFrIdx];
      delete pair.mergedFrText;
      delete pair.mergedFrSpans;
      if (row) {
        row.frIndex = targetFrIdx;
        row.groupedFrIndices = [targetFrIdx];
        delete row.mergedFrText;
        delete row.mergedFrSpans;
      }
    } else if (state.frBlocks[targetFrIdx]) {
      state.frBlocks[targetFrIdx].text = newText;
      state.frBlocks[targetFrIdx].resolved = true;
    }

    pair.resolved = true;
    if (row) row.resolved = true;

    try {
      const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
      if (frDoc) {
        let el = frDoc.querySelector(`[data-swap-index="${enIndex}"], [data-en-index="${enIndex}"]`);
        if (!el && targetFrIdx !== null) el = frDoc.querySelector(`[data-fr-index="${targetFrIdx}"]`);
        if (el) {
          el.replaceChildren();
          appendTextWithLineBreaks(el, newText);
          el.classList.remove('gc-swap-missing');
          el.removeAttribute('title');
          el.setAttribute('data-fr-index', targetFrIdx);
          el.style.transition = 'background-color 0.4s ease';
          el.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
          setTimeout(() => { if (el) el.style.backgroundColor = ''; }, 1200);
        }
      }
    } catch (err) {
      console.warn('Could not update live preview DOM directly:', err);
    }
  } else {
    // Extra French content
    if (frIndex !== null && state.frBlocks[frIndex]) {
      state.frBlocks[frIndex].text = newText;
      state.frBlocks[frIndex].resolved = true;
    }
    const row = state.alignRows.find((r) => r.frIndex === frIndex && r.enIndex === null);
    if (row) row.resolved = true;
    const pair = state.alignPairs.find((p) => p.frIndex === frIndex && p.enIndex === null);
    if (pair) pair.resolved = true;

    try {
      const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
      if (frDoc && frIndex !== null) {
        const el = frDoc.querySelector(`[data-fr-index="${frIndex}"]`);
        if (el) {
          el.replaceChildren();
          appendTextWithLineBreaks(el, newText);
          el.classList.remove('gc-swap-extra');
          el.removeAttribute('data-extra-fr');
          el.removeAttribute('title');
          el.style.transition = 'background-color 0.4s ease';
          el.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
          setTimeout(() => { if (el) el.style.backgroundColor = ''; }, 1200);
        }
      }
    } catch (err) {
      console.warn('Could not update live preview DOM directly:', err);
    }
  }

  state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
  renderStatsBar();
  if (state.drawerOpen && state.activeCategory) {
    renderDrawerBody(state.activeCategory);
  }

  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

function applyDeleteText(frIndex) {
  if (frIndex === null || !state.frBlocks[frIndex]) return;

  pushUndoState(`Delete extra French block #${frIndex + 1}`);
  state.frBlocks[frIndex].deleted = true;
  state.frBlocks[frIndex].text = '';

  const row = state.alignRows.find((r) => r.frIndex === frIndex && r.enIndex === null);
  if (row) {
    row.skip = true;
    row.deleted = true;
  }
  const pair = state.alignPairs.find((p) => p.frIndex === frIndex && p.enIndex === null);
  if (pair) {
    pair.skip = true;
    pair.deleted = true;
  }

  try {
    const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
    if (frDoc) {
      const el = frDoc.querySelector(`[data-fr-index="${frIndex}"]`);
      if (el) {
        el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)';
        setTimeout(() => { if (el && el.parentNode) el.parentNode.removeChild(el); }, 250);
      }
    }
  } catch (err) {
    console.warn('Could not remove element from live preview DOM:', err);
  }

  state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
  renderStatsBar();
  if (state.drawerOpen && state.activeCategory) {
    renderDrawerBody(state.activeCategory);
  }

  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

function applyResolveExtraText(frIndex) {
  if (frIndex === null || !state.frBlocks[frIndex]) return;

  pushUndoState(`Resolve extra French block #${frIndex + 1}`);
  const rawText = state.frBlocks[frIndex].text || '';
  const cleanText = rawText
    .replace(/^\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)\s*:\s*/i, '')
    .replace(/\]$/, '')
    .trim();

  state.frBlocks[frIndex].text = cleanText;
  state.frBlocks[frIndex].resolved = true;

  const row = state.alignRows.find((r) => r.frIndex === frIndex && r.enIndex === null);
  if (row) row.resolved = true;
  const pair = state.alignPairs.find((p) => p.frIndex === frIndex && p.enIndex === null);
  if (pair) pair.resolved = true;

  try {
    const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
    if (frDoc) {
      const el = frDoc.querySelector(`[data-fr-index="${frIndex}"]`);
      if (el) {
        if (el.innerHTML && /\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)/i.test(el.innerHTML)) {
          el.innerHTML = el.innerHTML
            .replace(/\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)\s*:\s*/gi, '')
            .replace(/\]/g, '');
        } else {
          el.textContent = cleanText;
        }
        el.classList.remove('gc-swap-extra');
        el.removeAttribute('data-extra-fr');
        el.removeAttribute('title');
        el.style.transition = 'background-color 0.4s ease';
        el.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
        setTimeout(() => { if (el) el.style.backgroundColor = ''; }, 1200);
      }
    }
  } catch (err) {
    console.warn('Could not update live preview DOM:', err);
  }

  state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
  renderStatsBar();
  if (state.drawerOpen && state.activeCategory) {
    renderDrawerBody(state.activeCategory);
  }

  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}
}

// How many hyperlinks a block carries. The live preview is asked first because
// it is what the reader is looking at, and it is the only side that reflects a
// link added by hand in the code view; the block's spans are the fallback for a
// block with no rendered element yet.
function countBlockLinks(frIndex) {
  const block = state.frBlocks[frIndex];
  if (!block) return 0;
  let n = 0;
  try {
    const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
    const el = frDoc && frDoc.querySelector(`[data-fr-index="${frIndex}"]`);
    if (el) n = el.querySelectorAll('a[href]').length;
  } catch (_) {
    n = 0;
  }
  if (!n && Array.isArray(block.spans)) {
    n = block.spans.filter((s) => s && s.type === 'a' && s.href).length;
  }
  return n;
}

// Removes every hyperlink in a French block, keeping the text.
//
// Two places carry the link, and both have to change. The block's spans are what
// the generator turns back into <a> elements on every rebuild
// (block-text-replace.js creates the element from a span whose type is 'a'), so
// dropping the span here is what actually removes the tag from the generated
// code. The rendered element is unwrapped separately, because leaving a live
// <a> on screen under a code view that no longer has one is the kind of
// half-applied edit that makes the two panes disagree.
//
// The text is untouched: an <a> is replaced by its own children, which is the
// whole point of the operation — the sentence reads the same, it just stops
// being a link.
function applyRemoveHyperlink(frIndex) {
  const block = state.frBlocks[frIndex];
  if (!block) return 0;

  let el = null;
  try {
    const frDoc = frPreviewFrame ? (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document) : null;
    el = frDoc && frDoc.querySelector(`[data-fr-index="${frIndex}"]`);
  } catch (_) {
    el = null;
  }

  const domLinks = el ? Array.from(el.querySelectorAll('a[href]')) : [];
  const spanLinks = Array.isArray(block.spans)
    ? block.spans.filter((s) => s && s.type === 'a' && s.href)
    : [];
  if (!domLinks.length && !spanLinks.length) return 0;

  pushUndoState(`Remove hyperlink${frIndex !== null ? ` from French block #${frIndex + 1}` : ''}`);

  if (Array.isArray(block.spans)) {
    block.spans = block.spans.filter((s) => !(s && s.type === 'a' && s.href));
  }

  let removed = 0;
  if (el) {
    // Walk a copy first: unwrapping mutates the live child list underneath the
    // NodeList an iterator would be holding.
    const links = Array.from(el.querySelectorAll('a[href]'));
    links.forEach((a) => {
      const parent = a.parentNode;
      if (!parent) return;
      while (a.firstChild) parent.insertBefore(a.firstChild, a);
      parent.removeChild(a);
      removed += 1;
    });
    // A leftover empty anchor would leave a bare "" behind; drop those too.
    el.querySelectorAll('a:not([href])').forEach((a) => {
      if (!a.textContent && !a.querySelector('img')) a.parentNode && a.parentNode.removeChild(a);
    });
    el.style.transition = 'background-color 0.4s ease';
    el.style.backgroundColor = 'rgba(244, 63, 94, 0.22)';
    setTimeout(() => { if (el) el.style.backgroundColor = ''; }, 1200);
  }

  state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
  renderStatsBar();
  if (state.drawerOpen && state.activeCategory) {
    renderDrawerBody(state.activeCategory);
  }

  try {
    if (typeof window !== 'undefined' && typeof window.refreshCodeViewAfterBlockEdit === 'function') {
      window.refreshCodeViewAfterBlockEdit();
    }
  } catch (_) {}

  return Math.max(removed, spanLinks.length);
}

export {
  activeReplaceTarget,
  applyDeleteText,
  applyRemoveHyperlink,
  applyReplaceText,
  applyResolveExtraText,
  closeReplaceTextModal,
  confirmReplaceText,
  copyTargetText,
  countBlockLinks,
  jumpToPairedBlock,
  openReplaceTextModal,
  pasteTargetText,
  updateReplaceCharCount,
};
