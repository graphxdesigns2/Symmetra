// Auto-generated imports
import {
  enPreviewFrame,
  enSyncStatus,
  frPreviewFrame,
  frSyncStatus,
  syncOffsetBadge,
  syncOffsetBtn,
} from './dom-refs.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  findTopIndexForFrame,
  stepFrameBlock,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';


function getOffsetBtn() {
  if (syncOffsetBtn) return syncOffsetBtn;
  if (typeof document !== 'undefined') return document.getElementById('syncOffsetBtn');
  return null;
}

function getOffsetBadge() {
  if (syncOffsetBadge) return syncOffsetBadge;
  if (typeof document !== 'undefined') return document.getElementById('syncOffsetBadge');
  return null;
}

function nudgeSync(delta) {
  state.syncOffset += delta;
  updateSyncOffsetBadge();
  const currentEnIndex = typeof state.activePreviewBlock === 'number' && state.activePreviewBlock >= 0
    ? state.activePreviewBlock
    : (findTopIndexForFrame(enPreviewFrame) || 0);
  state.lastKnownEnIndex = currentEnIndex;
  
  if (state.autoSync && !state.syncPaused) {
    applyActiveHighlight();
    alignPreviewBlocks(currentEnIndex);
  } else {
    stepFrameBlock(frPreviewFrame, delta);
  }
}

function updateSyncStatusLabel() {
  let text = 'synced';
  let color = '#10b981';
  if (!state.autoSync) {
    text = 'manual';
    color = '#94a3b8';
  } else if (state.syncPaused) {
    text = 'paused';
    color = '#ee7100';
  }
  if (enSyncStatus) {
    enSyncStatus.style.color = color;
    enSyncStatus.title = `Sync status: ${text}`;
    enSyncStatus.setAttribute('aria-label', `Sync status: ${text}`);
  }
  if (frSyncStatus) {
    frSyncStatus.style.color = color;
    frSyncStatus.title = `Sync status: ${text}`;
    frSyncStatus.setAttribute('aria-label', `Sync status: ${text}`);
  }
}

function updateSyncOffsetBadge() {
  const offset = state.syncOffset || 0;
  const label = `${offset > 0 ? '+' : ''}${offset}`;
  const badge = getOffsetBadge();
  if (badge) {
    if (offset !== 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = `Offset: ${label}`;
    } else {
      badge.style.display = 'none';
    }
  }
  const btn = getOffsetBtn();
  if (btn) {
    btn.textContent = label;
    btn.classList.toggle('is-nonzero', offset !== 0);
    btn.disabled = offset === 0;
    btn.title = offset === 0
      ? 'Sync offset is 0 (panes aligned)'
      : `Sync offset ${label} — click to reset to 0`;
    btn.setAttribute('aria-label', offset === 0
      ? 'Sync offset 0, panes aligned'
      : `Sync offset ${label}, activate to reset`);
  }
}

export {
  nudgeSync,
  updateSyncOffsetBadge,
  updateSyncStatusLabel,
};
