// English preview-pane collapse. The grid track animates shut via the
// .en-pane-collapsed class on #workspace (see global.css); this module owns
// the state, the reopen tab, and re-settling scroll once layout finishes.
import {
  enCollapsePaneBtn,
  enExpandPaneBtn,
  workspace,
} from './dom-refs.js';
import {
  alignPreviewBlocks,
  clearPreviewPairSpacers,
  jumpToBlock,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';


const COLLAPSED_CLASS = 'en-pane-collapsed';
// Matches the grid-template-columns transition in global.css.
const SETTLE_MS = 320;

function isEnPaneCollapsed() {
  return state.enPaneCollapsed === true;
}

function paintCollapsedUI() {
  const collapsed = isEnPaneCollapsed();
  if (workspace) workspace.classList.toggle(COLLAPSED_CLASS, collapsed);
  if (enExpandPaneBtn) enExpandPaneBtn.classList.toggle('is-visible', collapsed);
  if (enCollapsePaneBtn) {
    enCollapsePaneBtn.title = collapsed ? 'Show English panel' : 'Collapse English panel';
    enCollapsePaneBtn.setAttribute('aria-label', collapsed ? 'Show English panel' : 'Collapse English panel');
  }
}

function collapseEnPane() {
  if (isEnPaneCollapsed()) return;
  state.enPaneCollapsed = true;
  // Drop equalization spacers first: measured at zero track width, the
  // English side would stretch French blocks (and their highlight boxes)
  // into giant empty boxes. Rebuilt from natural layout on expand.
  clearPreviewPairSpacers();
  paintCollapsedUI();
  // Let the French pane take the freed width, then settle it on the active block.
  requestAnimationFrame(() => {
    try {
      alignPreviewBlocks(state.activePreviewBlock);
    } catch (_) {}
  });
}

function expandEnPane() {
  if (!isEnPaneCollapsed()) return;
  state.enPaneCollapsed = false;
  paintCollapsedUI();
  // Re-center once the track has animated back open; jumping earlier would
  // measure the still-collapsed layout.
  setTimeout(() => {
    try {
      if (!isEnPaneCollapsed()) jumpToBlock(state.activePreviewBlock);
    } catch (_) {}
  }, SETTLE_MS);
}

function toggleEnPane() {
  if (isEnPaneCollapsed()) expandEnPane();
  else collapseEnPane();
}

function initEnPaneCollapse() {
  paintCollapsedUI();
  if (enCollapsePaneBtn) enCollapsePaneBtn.addEventListener('click', toggleEnPane);
  if (enExpandPaneBtn) enExpandPaneBtn.addEventListener('click', expandEnPane);
}

export {
  collapseEnPane,
  expandEnPane,
  initEnPaneCollapse,
  isEnPaneCollapsed,
  toggleEnPane,
};
