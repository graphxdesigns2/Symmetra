// Auto-generated imports
import {
  truncateDocName,
} from './docx.js';
import {
  alignBtn,
  appHeader,
  collapseSourcesBtn,
  condensedEnStat,
  condensedFrStat,
  navSourcesCondensed,
  previewSection,
  sourceUploadSection,
} from './dom-refs.js';
import {
  state,
} from './state.ts';


function checkAlignReady() {
  const enReady = state.enBlocks.length > 0;
  const frReady = state.frBlocks.length > 0;
  const ready = enReady && frReady;
  alignBtn.disabled = !ready;
  alignBtn.classList.toggle('is-ready', ready);
}

function formatBlockCount(n) {
  const count = Number(n) || 0;
  return `${count} block${count === 1 ? '' : 's'}`;
}

function condenseSources() {
  if (!sourceUploadSection) return;
  state.sourcesCondensed = true;
  if (condensedEnStat) {
    condensedEnStat.textContent = formatBlockCount(state.enBlocks.length);
  }
  if (condensedFrStat) {
    condensedFrStat.textContent = formatBlockCount(state.frBlocks.length);
    condensedFrStat.removeAttribute('title');
  }
  sourceUploadSection.classList.add('is-condensed');
  if (appHeader) {
    appHeader.classList.add('has-condensed-sources');
  }
  if (navSourcesCondensed) {
    navSourcesCondensed.classList.add('is-visible');
  }
  if (collapseSourcesBtn) collapseSourcesBtn.style.display = 'none';
  if (alignBtn) alignBtn.style.display = 'none';
}

function expandSources(options = {}) {
  if (!sourceUploadSection) return;
  state.sourcesCondensed = false;
  sourceUploadSection.classList.remove('is-condensed');
  // Hide the preview side while editing sources so inputs get the full view.
  // Preview & Align (or undo) will re-show it and re-condense.
  if (previewSection) previewSection.classList.remove('show');
  if (appHeader) {
    appHeader.classList.remove('has-condensed-sources');
  }
  if (navSourcesCondensed) {
    navSourcesCondensed.classList.remove('is-visible');
  }
  if (collapseSourcesBtn) {
    const hasSources = state.enBlocks.length > 0 || state.frBlocks.length > 0;
    collapseSourcesBtn.style.display = hasSources ? 'inline-flex' : 'none';
    if (alignBtn) alignBtn.style.display = hasSources ? 'inline-flex' : 'none';
  }
  if (options.scrollIntoView !== false) {
    sourceUploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export {
  checkAlignReady,
  condenseSources,
  expandSources,
  formatBlockCount,
};
