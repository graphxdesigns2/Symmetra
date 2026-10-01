// Auto-generated imports
import {
  ctxBtnCopyTextLabel,
  ctxBtnDeleteText,
  ctxBtnJumpPairLabel,
  ctxBtnReplaceTextLabel,
  ctxBtnResolve,
  ctxBtnRemoveLink,
  ctxBtnRemoveLinkLabel,
  ctxBtnSplitBlock,
  ctxMenuBlockBadge,
  ctxMenuIcon,
  ctxMenuTitle,
  customContextMenu,
} from './dom-refs.js';
import {
  state,
} from './state.ts';
import {
  countBlockLinks,
} from './inline-edit.js';


let currentContextMenuTarget = null;

function setCtxMenuBadge(lang) {
  if (!ctxMenuIcon) return;
  const badge = lang === 'en' ? 'tag-en' : 'tag-fr';
  const label = lang === 'en' ? 'EN' : 'FR';
  ctxMenuIcon.innerHTML = `<span class="tag ${badge}">${label}</span>`;
}

function openContextMenu({ kind = 'block', enIndex = null, frIndex = null, text = '', selectedText = '', side = 'fr', x = 0, y = 0 }) {
  if (frIndex === null && enIndex !== null && state.alignRows) {
    const row = state.alignRows.find((r) => r.enIndex === enIndex);
    if (row && row.frIndex !== null) frIndex = row.frIndex;
  }
  if (enIndex === null && frIndex !== null && state.alignRows) {
    const row = state.alignRows.find((r) => r.frIndex === frIndex);
    if (row && row.enIndex !== null) enIndex = row.enIndex;
  }

  currentContextMenuTarget = { kind, enIndex, frIndex, text, selectedText, side };

  if (!customContextMenu) return;

  if (kind === 'missing') {
    setCtxMenuBadge('fr');
    if (ctxMenuTitle) ctxMenuTitle.textContent = 'French Content Missing';
    if (ctxMenuBlockBadge) ctxMenuBlockBadge.textContent = enIndex !== null ? `Block #${enIndex + 1}` : 'Missing';
    if (ctxBtnReplaceTextLabel) ctxBtnReplaceTextLabel.textContent = 'Replace / Provide text';
    if (ctxBtnDeleteText) ctxBtnDeleteText.style.display = 'none';
    if (ctxBtnResolve) ctxBtnResolve.style.display = 'none';
    if (ctxBtnSplitBlock) ctxBtnSplitBlock.style.display = enIndex !== null ? 'flex' : 'none';
  } else if (kind === 'extra') {
    setCtxMenuBadge('fr');
    if (ctxMenuTitle) ctxMenuTitle.textContent = 'Extra French Content';
    if (ctxMenuBlockBadge) ctxMenuBlockBadge.textContent = frIndex !== null ? `Word #${frIndex + 1}` : 'Extra';
    if (ctxBtnReplaceTextLabel) ctxBtnReplaceTextLabel.textContent = 'Replace French text';
    if (ctxBtnDeleteText) ctxBtnDeleteText.style.display = 'flex';
    if (ctxBtnResolve) ctxBtnResolve.style.display = 'flex';
    if (ctxBtnSplitBlock) ctxBtnSplitBlock.style.display = frIndex !== null ? 'flex' : 'none';
  } else {
    // Regular document block
    const isFrSide = side === 'fr' || (frIndex !== null && enIndex === null);
    setCtxMenuBadge(isFrSide ? 'fr' : 'en');
    if (ctxMenuTitle) ctxMenuTitle.textContent = isFrSide ? 'French Block Actions' : 'English Block Actions';
    if (ctxMenuBlockBadge) {
      const bNum = isFrSide ? (frIndex !== null ? frIndex + 1 : (enIndex !== null ? enIndex + 1 : '')) : (enIndex !== null ? enIndex + 1 : '');
      ctxMenuBlockBadge.textContent = bNum ? `Block #${bNum}` : 'Block';
    }
    if (ctxBtnReplaceTextLabel) ctxBtnReplaceTextLabel.textContent = 'Replace text…';
    if (ctxBtnDeleteText) ctxBtnDeleteText.style.display = isFrSide && frIndex !== null ? 'flex' : 'none';
    if (ctxBtnResolve) ctxBtnResolve.style.display = 'none';
    if (ctxBtnSplitBlock) ctxBtnSplitBlock.style.display = 'flex';
  }

  // Update Jump to pair label
  if (ctxBtnJumpPairLabel) {
    ctxBtnJumpPairLabel.textContent = (side === 'fr') ? 'Jump to English match' : 'Jump to French match';
  }

  // Update Copy button label
  if (ctxBtnCopyTextLabel) {
    ctxBtnCopyTextLabel.textContent = selectedText ? 'Copy selected text' : 'Copy block text';
  }

  // Show "Remove hyperlink" only when this block actually has one. Offering it
  // unconditionally would put a no-op in the menu, since applyRemoveHyperlink
  // returns 0 when there is nothing to strip.
  if (ctxBtnRemoveLink) {
    const n = frIndex !== null && frIndex !== undefined ? countBlockLinks(frIndex) : 0;
    ctxBtnRemoveLink.style.display = n > 0 ? 'flex' : 'none';
    if (ctxBtnRemoveLinkLabel) {
      ctxBtnRemoveLinkLabel.textContent = n > 1 ? `Remove ${n} hyperlinks` : 'Remove hyperlink';
    }
  }

  customContextMenu.style.display = 'block';
  customContextMenu.classList.remove('hidden');

  const menuWidth = 320;
  const menuHeight = 460;

  const posX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
  const posY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));

  customContextMenu.style.left = `${posX}px`;
  customContextMenu.style.top = `${posY}px`;
}

function closeContextMenu() {
  if (customContextMenu) {
    customContextMenu.style.display = 'none';
    customContextMenu.classList.add('hidden');
  }
}

export {
  closeContextMenu,
  currentContextMenuTarget,
  openContextMenu,
};
