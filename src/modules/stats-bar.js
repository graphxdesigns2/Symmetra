// Auto-generated imports
import {
  cExtra,
  cLangEn,
  cMismatch,
  cMissing,
  cQaDiff,
  cSkip,
  cTypo,
  healthPill,
} from './dom-refs.js';
import {
  computeLangEnAudit,
  computeTypographyAudit,
} from './french-audit.js';
import {
  computeAltAudit,
  computeHeadingsAudit,
  computeLinkAudit,
  computeQaDiffAudit,
} from './qa-audit.js';
import {
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';


function renderStatsBar() {
  const nEn = state.enBlocks.length;
  const nFr = state.frBlocks.length;
  const nMis = state.issueGroups.mismatch.length;
  const nMiss = state.issueGroups.missing.length;
  const nExt = state.issueGroups.extra.length;
  const nSkip = state.alignRows.filter((r) => r.skip).length;
  const nMatched = state.alignPairs.length;

  const typoIssues = computeTypographyAudit();
  const langEnIssues = computeLangEnAudit();
  const qaIssues = computeQaDiffAudit();
  // Conversion is a report, not a task list. The tab shows every recorded
  // difference, because none of them are ever "closed" — they must be re-read
  // if the English HTML changes. Only a heading that is actually not carried
  // over earns a warning marker, since that is the only entry with a visible
  // cost.
  const nMisLossy = state.issueGroups.mismatch.filter((m) => m.lossy).length;
  const qaOpen = qaIssues.filter((q) => q.severity !== 'notice');
  const linkAudit = computeLinkAudit();
  const headAudit = computeHeadingsAudit();
  const altAudit = computeAltAudit();

  if (cMismatch) cMismatch.textContent = String(nMis);
  if (cMissing) cMissing.textContent = String(nMiss);
  if (cExtra) cExtra.textContent = String(nExt);
  if (cSkip) cSkip.textContent = String(nSkip);
  if (cQaDiff) cQaDiff.textContent = String(qaOpen.length);
  const cLinks = document.getElementById('cLinks');
  if (cLinks) cLinks.textContent = String(linkAudit.openCount);
  const cHeadings = document.getElementById('cHeadings');
  if (cHeadings) cHeadings.textContent = String(headAudit.openCount);
  const cAlt = document.getElementById('cAlt');
  if (cAlt) cAlt.textContent = String(altAudit.openCount);
  if (cTypo) cTypo.textContent = String(typoIssues.length);
  if (cLangEn) cLangEn.textContent = String(langEnIssues.length);

  // Style tabs based on issue counts and dim zero counts
  const tabMis = document.getElementById('tabMismatch');
  const tabMiss = document.getElementById('tabMissing');
  const tabExt = document.getElementById('tabExtra');
  const tabSkip = document.getElementById('tabSkipped');
  const tabQa = document.getElementById('tabQaDiff');
  const tabTypoEl = document.getElementById('tabTypography');
  const tabLangEl = document.getElementById('tabLangEn');

  if (tabMis) {
    tabMis.classList.toggle('has-issues', nMisLossy > 0);
    tabMis.classList.toggle('is-dim', nMis === 0);
  }
  if (tabMiss) {
    tabMiss.classList.toggle('has-danger', nMiss > 0);
    tabMiss.classList.toggle('is-dim', nMiss === 0);
  }
  if (tabExt) {
    tabExt.classList.toggle('has-issues', nExt > 0);
    tabExt.classList.toggle('is-dim', nExt === 0);
  }
  if (tabSkip) {
    tabSkip.classList.toggle('is-dim', nSkip === 0);
  }
  if (tabQa) {
    tabQa.classList.toggle('has-notice', qaOpen.length > 0);
    tabQa.classList.toggle('is-dim', qaOpen.length === 0);
  }
  const tabLinksEl = document.getElementById('tabLinks');
  if (tabLinksEl) {
    tabLinksEl.classList.toggle('has-notice', linkAudit.openCount > 0);
    tabLinksEl.classList.toggle('is-dim', linkAudit.openCount === 0);
  }
  const tabHeadingsEl = document.getElementById('tabHeadings');
  if (tabHeadingsEl) {
    tabHeadingsEl.classList.toggle('has-notice', headAudit.openCount > 0);
    tabHeadingsEl.classList.toggle('is-dim', headAudit.openCount === 0);
  }
  const tabAltEl = document.getElementById('tabAlt');
  if (tabAltEl) {
    tabAltEl.classList.toggle('has-notice', altAudit.openCount > 0);
    tabAltEl.classList.toggle('is-dim', altAudit.openCount === 0);
  }
  if (tabTypoEl) {
    tabTypoEl.classList.toggle('has-issues', typoIssues.length > 0);
    tabTypoEl.classList.toggle('is-dim', typoIssues.length === 0);
  }
  if (tabLangEl) {
    tabLangEl.classList.toggle('has-notice', langEnIssues.length > 0);
    tabLangEl.classList.toggle('is-dim', langEnIssues.length === 0);
  }
  // Collapse zero-issue categories into the "N clear" chip to keep the bar on one line.
  const dockCats = [
    ['tabMissing', nMiss],
    ['tabMismatch', nMis],
    ['tabExtra', nExt],
    ['tabQaDiff', qaOpen.length],
    ['tabLinks', linkAudit.openCount],
    ['tabHeadings', headAudit.openCount],
    ['tabAlt', altAudit.openCount],
    ['tabTypography', typoIssues.length],
    ['tabLangEn', langEnIssues.length],
  ];
  const expanded = state.qaDockExpanded === true;
  const clearCats = dockCats.filter(([, n]) => n === 0);
  dockCats.forEach(([id, n]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('qa-tab-hidden', !expanded && n === 0);
  });
  const segBar = document.querySelector('#previewStatsBar .qa-seg-bar');
  if (segBar) {
    const kids = Array.from(segBar.children);
    kids.forEach((el, i) => {
      if (!el.classList.contains('qa-seg-divider')) return;
      if (expanded) {
        el.style.display = '';
        return;
      }
      const prevBtn = [...kids.slice(0, i)].reverse().find((k) => k.tagName === 'BUTTON' && !k.classList.contains('qa-tab-hidden'));
      const nextBtn = kids.slice(i + 1).find((k) => k.tagName === 'BUTTON' && !k.classList.contains('qa-tab-hidden'));
      el.style.display = (prevBtn && nextBtn) ? '' : 'none';
    });
  }
  const clearChip = document.getElementById('qaClearChip');
  const clearLabel = document.getElementById('qaClearLabel');
  if (clearChip && clearLabel) {
    if (expanded) {
      clearChip.style.display = '';
      clearLabel.textContent = '− Less';
      clearChip.title = 'Collapse zero-issue categories';
    } else if (clearCats.length > 0) {
      clearChip.style.display = '';
      clearLabel.textContent = `✓ ${clearCats.length} clear`;
      clearChip.title = 'Show all categories';
    } else {
      clearChip.style.display = 'none';
    }
  }
  // Update Drawer Tab counters
  const dQa = document.getElementById('drawerTabQaDiff');
  const dTypo = document.getElementById('drawerTabTypography');
  const dLang = document.getElementById('drawerTabLangEn');
  const dMis = document.getElementById('drawerTabMismatch');
  const dMiss = document.getElementById('drawerTabMissing');
  const dExt = document.getElementById('drawerTabExtra');

  if (dQa) dQa.textContent = `QA & Diff (${qaOpen.length})`;
  const dLinks = document.getElementById('drawerTabLinks');
  if (dLinks) dLinks.textContent = `Links (${linkAudit.openCount})`;
  const dHeadings = document.getElementById('drawerTabHeadings');
  if (dHeadings) dHeadings.textContent = `Headings (${headAudit.openCount})`;
  const dAlt = document.getElementById('drawerTabAlt');
  if (dAlt) dAlt.textContent = `Alt Text (${altAudit.openCount})`;
  if (dTypo) dTypo.textContent = `Spaces (${typoIssues.length})`;
  if (dLang) dLang.textContent = `Smart lang="en" (${langEnIssues.length})`;
  if (dMis) dMis.textContent = `Conversion (${nMis})`;
  if (dMiss) dMiss.textContent = `Missing FR (${nMiss})`;
  if (dExt) dExt.textContent = `Extra FR (${nExt})`;

  // Overall Alignment Health Pill. Conversion only counts as a warning when a
  // heading is actually not carried over — the informational differences are
  // not something the user can act on, so they must not push the document out
  // of "Aligned".
  const hasErrors = nMiss > 0;
  const hasWarnings = nMisLossy > 0 || nExt > 0 || typoIssues.length > 0 || qaOpen.length > 0
    || linkAudit.openCount > 0 || headAudit.openCount > 0 || altAudit.openCount > 0;

  if (healthPill) {
    healthPill.className = 'preview-status-pill ' + (hasErrors ? 'status-danger' : hasWarnings ? 'status-warn' : 'status-clean') + ' cursor-pointer hover:opacity-90';
    
    if (hasErrors) {
      healthPill.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="qa-pill-icon"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span class="qa-pill-title">${nMiss} Missing</span>`;
    } else if (hasWarnings) {
      healthPill.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="qa-pill-icon"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span class="qa-pill-title">${nMisLossy > 0 ? `${nMisLossy} Conversion` : typoIssues.length > 0 ? `${typoIssues.length} Spaces` : qaOpen.length > 0 ? `${qaOpen.length} QA` : linkAudit.openCount > 0 ? `${linkAudit.openCount} Links` : headAudit.openCount > 0 ? `${headAudit.openCount} Headings` : altAudit.openCount > 0 ? `${altAudit.openCount} Alt` : `${nExt} Extra`}</span>`;
    } else {
      healthPill.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="qa-pill-icon"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <span class="qa-pill-title">Aligned</span>`;
    }
  }

  updateActiveBlockHud(state.activePreviewBlock);
}

export {
  renderStatsBar,
};
