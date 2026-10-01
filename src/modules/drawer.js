// Auto-generated imports
import {
  issueSnippet,
} from './alignment-ops.js';
import {
  escapeHtml,
} from './code-view.js';
import {
  controlsModal,
  docxPreviewFrame,
  drawerBody,
  frPreviewFrame,
  statDetailPanel,
} from './dom-refs.js';
import {
  computeLangEnAudit,
  computeTypographyAudit,
  fixAllFrenchTypography,
  fixFrenchTypographyBlock,
  getTypoSnippetWindow,
  highlightTypoOriginal,
  tagAllEnglishTerms,
  tagEnglishTermInBlock,
} from './french-audit.js';
import {
  buildDualIframePreviews,
} from './iframe-preview.js';
import {
  applyDeleteText,
  applyResolveExtraText,
  openReplaceTextModal,
} from './inline-edit.js';
import {
  computeIssues,
} from './issues.js';
import {
  computeAltAudit,
  computeHeadingsAudit,
  computeLinkAudit,
  computeQaDiffAudit,
} from './qa-audit.js';
import {
  highlightIndexInFrame,
  jumpToBlock,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';


function openDrawer(category) {
  state.activeCategory = category;
  state.drawerOpen = true;
  if (statDetailPanel) statDetailPanel.classList.add('show');

  // Update active state on segmented tabs
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.getAttribute('data-category') === category);
  });

  // Update active state on drawer header tabs
  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    const isActive = tab.getAttribute('data-category') === category;
    tab.className = `drawer-tab px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
      isActive ? 'bg-accent text-white shadow-sm' : 'bg-surface hover:bg-surface-hover text-text-secondary'
    }`;
  });

  renderDrawerBody(category);
}

function closeDrawer() {
  state.drawerOpen = false;
  if (statDetailPanel) statDetailPanel.classList.remove('show');
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.classList.remove('is-active');
  });
}

function openControlsModal() {
  if (!controlsModal) return;
  state.controlsModalOpen = true;
  controlsModal.style.display = 'flex';
  requestAnimationFrame(() => {
    controlsModal.classList.add('is-open');
  });
}

function closeControlsModal() {
  if (!controlsModal) return;
  state.controlsModalOpen = false;
  controlsModal.classList.remove('is-open');
  setTimeout(() => {
    if (!state.controlsModalOpen) {
      controlsModal.style.display = 'none';
    }
  }, 220);
}


function renderDrawerBody(category) {
  if (!drawerBody) return;
  drawerBody.innerHTML = '';

  if (category === 'qa-diff') {
    const qaList = computeQaDiffAudit();
    const qaOpenCount = qaList.filter((q) => q.severity !== 'notice').length;
    // Footnote rows are grouped so the two halves of the verdict read apart:
    // recognition is a fact about the sources, placement is a guess about where
    // a marker landed in a French sentence. Both stay on screen, but only the
    // first is an open finding.
    const footRows = qaList.filter((q) => q.type === 'footnote_place' || q.type === 'footnote_recog');
    const otherRows = qaList.filter((q) => q.type !== 'footnote_place' && q.type !== 'footnote_recog');
    const renderRow = (qa) => `
        <div class="issue-row issue-row-clickable${qa.severity === 'notice' ? ' qa-notice-row' : ''}"
             ${qa.enIndex !== null && qa.enIndex !== undefined ? `data-jump-en="${qa.enIndex}"` : ''}
             ${qa.frIndex !== null && qa.enIndex === null && qa.frIndex !== undefined ? `data-jump-fr="${qa.frIndex}"` : ''}>
          <div class="issue-side ${qa.severity === 'warn' ? 'warn' : 'info'}">${qa.type === 'footnote_place' ? 'PLACED' : qa.type === 'footnote_recog' ? 'NOTE' : qa.type.toUpperCase()}</div>
          <div>
            <div class="issue-title">${escapeHtml(qa.title)}</div>
            <div class="issue-detail">${escapeHtml(qa.detail)}</div>
          </div>
          <div class="issue-status">${qa.action}</div>
          <div>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`;
    if (!qaList.length) {
      drawerBody.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="text-sm font-bold text-text">Dual Preview QA &amp; Diff Clean</div>
          <p class="text-xs text-text-secondary mt-1">All hyperlinks, footnote callouts, and structural elements are balanced between English and French.</p>
        </div>`;
    } else {
      const rows = otherRows.map(renderRow).join('')
        + (footRows.length
          ? `<div class="p-3 bg-surface-soft border-y border-border flex items-center justify-between">
               <span class="text-xs font-bold text-text">Footnotes — recognition and placement</span>
               <span class="text-[11px] text-text-secondary">Notes were recognised from evidence; positions marked <em>inferred</em> were guessed from the English position and need a look.</span>
             </div>${footRows.map(renderRow).join('')}`
          : '');
      drawerBody.innerHTML = `
        <div class="p-3 bg-surface-soft border-b border-border flex items-center justify-between">
          <span class="text-xs font-bold text-text">Side-by-Side QA Discrepancies (${qaOpenCount} open${qaList.length - qaOpenCount > 0 ? ` + ${qaList.length - qaOpenCount} verified` : ''})</span>
        </div>
        <div>${rows}</div>`;
    }
  } else if (category === 'links') {
    const linkAudit = computeLinkAudit();
    // Only links that need attention are listed. Rows that resolve cleanly
    // ("ok") are a review record, not findings — the Conversion tab already
    // keeps that record for the carried anchor links, and listing every
    // healthy hyperlink here buried the ones that needed a decision.
    const openRows = linkAudit.rows.filter((r) => r.status !== 'ok');
    if (!linkAudit.rows.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">No hyperlinks found in the aligned blocks.</div>`;
    } else if (!openRows.length) {
      drawerBody.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="text-sm font-bold text-text">All Hyperlinks Valid</div>
          <p class="text-xs text-text-secondary mt-1">All ${linkAudit.rows.length} hyperlink${linkAudit.rows.length === 1 ? '' : 's'} carry${linkAudit.rows.length === 1 ? 'ies' : ''} into the French output with working French URLs — no action needed.</p>
        </div>`;
    } else {
      const statusBadge = (s) => s === 'missing'
        ? '<span class="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Missing FR link</span>'
        : s === 'en-url'
          ? '<span class="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">EN URL kept</span>'
          : '<span class="text-[11px] px-2 py-0.5 rounded font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Broken anchor</span>';
      drawerBody.innerHTML = `
        <div class="p-3 bg-surface-soft border-b border-border flex items-center justify-between">
          <span class="text-xs font-bold text-text">Hyperlinks Needing Attention (${openRows.length})</span>
          <span class="text-[11px] text-text-secondary">Only links with a problem are listed — healthy links are omitted.</span>
        </div>
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-left border-collapse border border-border rounded-lg overflow-hidden bg-surface">
            <thead>
              <tr class="bg-surface-soft border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <th class="p-3 w-16 border-r border-border">Block</th>
                <th class="p-3 w-2/5 border-r border-border text-sky-600 dark:text-sky-400">English link</th>
                <th class="p-3 w-2/5 border-r border-border text-emerald-600 dark:text-emerald-400">French link</th>
                <th class="p-3 w-32">Status</th>
                <th class="p-3 w-20 text-right">Jump</th>
              </tr>
            </thead>
            <tbody>
              ${openRows.map((r) => `
              <tr class="border-b border-border/70 hover:bg-surface-hover/40 transition-colors">
                <td class="p-3 align-top font-mono text-xs text-text whitespace-nowrap">#${r.enIndex + 1}</td>
                <td class="p-3 align-top text-xs leading-relaxed font-mono break-all"><span class="text-text">${escapeHtml(r.enAnchor || '—')}</span><br><span class="text-text-secondary">${escapeHtml(r.enHref || '—')}</span></td>
                <td class="p-3 align-top text-xs leading-relaxed font-mono break-all"><span class="text-text">${escapeHtml(r.frAnchor || '—')}</span><br><span class="text-text-secondary">${escapeHtml(r.frHref || '—')}</span></td>
                <td class="p-3 align-top whitespace-nowrap">${statusBadge(r.status)}<div class="text-[11px] text-text-muted mt-1 whitespace-normal">${escapeHtml(r.note)}</div></td>
                <td class="p-3 align-top text-right"><button type="button" class="btn btn-secondary text-xs px-2.5 py-1 issue-row-clickable" data-jump-en="${r.enIndex}">Jump →</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
  } else if (category === 'headings') {
    const headAudit = computeHeadingsAudit();
    const outlineList = (heads, lang, emptyMsg) => heads.length === 0
      ? `<div class="text-xs text-text-secondary p-3 rounded bg-surface border border-border">${emptyMsg}</div>`
      : `<div class="space-y-1.5">${heads.map((h) => `
        <div class="issue-row issue-row-clickable" ${lang === 'en' ? `data-jump-en="${h.enIndex}"` : `data-jump-fr="${h.frIndex}"`}>
          <div class="issue-side info">H${h.level}</div>
          <div>
            <div class="issue-title" style="padding-left: ${(h.level - 1) * 14}px">${escapeHtml(issueSnippet(h.text, 90))}</div>
          </div>
          <div class="issue-status">${lang.toUpperCase()} #${(lang === 'en' ? h.enIndex : h.frIndex) + 1}</div>
          <div><button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button></div>
        </div>`).join('')}</div>`;
    const headRows = headAudit.issues.map((iss) => `
        <div class="issue-row issue-row-clickable" ${iss.enIndex !== null && iss.enIndex !== undefined ? `data-jump-en="${iss.enIndex}"` : ''} ${iss.frIndex !== null && iss.frIndex !== undefined ? `data-jump-fr="${iss.frIndex}"` : ''}>
          <div class="issue-side warn">Heading</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">${iss.action}</div>
          <div><button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button></div>
        </div>`).join('');
    drawerBody.innerHTML = `
      <div class="p-3 bg-surface-soft border-b border-border flex items-center justify-between">
        <span class="text-xs font-bold text-text">Heading Outline &amp; Hierarchy (${headAudit.openCount} open)</span>
        <span class="text-[11px] text-text-secondary">Exactly one H1, no skipped levels, EN/FR parity.</span>
      </div>
      <div class="p-4 space-y-4">
        ${headRows ? `<div>${headRows}</div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">English outline (${headAudit.en.length})</h4>
            ${outlineList(headAudit.en, 'en', 'No headings in English source.')}
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">French outline (${headAudit.fr.length})</h4>
            ${outlineList(headAudit.fr, 'fr', 'No headings in French output.')}
          </div>
        </div>
      </div>`;
  } else if (category === 'alt') {
    const altAudit = computeAltAudit();
    const altIssues = altAudit.images.filter((im) => im.status !== 'ok');
    if (!altIssues.length) {
      drawerBody.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="text-sm font-bold text-text">${altAudit.images.length ? 'Alt Text Complete' : 'No Images Found'}</div>
          <p class="text-xs text-text-secondary mt-1">${altAudit.images.length ? `All ${altAudit.images.length} image(s) have descriptive alt text — no action needed.` : 'No images found in the English source.'}</p>
        </div>`;
    } else {
      const altBadge = (s) => s === 'missing'
          ? '<span class="text-[11px] px-2 py-0.5 rounded font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Missing alt</span>'
          : '<span class="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Boilerplate alt</span>';
      drawerBody.innerHTML = `
        <div class="p-3 bg-surface-soft border-b border-border flex items-center justify-between">
          <span class="text-xs font-bold text-text">Image Alternative Text (${altAudit.openCount} open)</span>
          <span class="text-[11px] text-text-secondary">Alt text carries into the French output — fix it at the source.</span>
        </div>
        <div>${altIssues.map((im) => `
        <div class="issue-row issue-row-clickable" data-jump-en="${im.enIndex}">
          <div class="issue-side ${im.status === 'missing' ? 'danger' : 'warn'}">Image</div>
          <div>
            <div class="issue-title font-mono text-xs break-all">${escapeHtml(im.src || '(no src)')}</div>
            <div class="issue-detail">Alt: ${im.alt ? `"${escapeHtml(im.alt)}"` : '—'} · ${escapeHtml(im.note)}</div>
          </div>
          <div class="issue-status">${altBadge(im.status)}</div>
          <div><button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button></div>
        </div>`).join('')}</div>`;
    }
  } else if (category === 'typography') {
    const typoList = computeTypographyAudit();
    if (!typoList.length) {
      drawerBody.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="text-sm font-bold text-text">Spacing 100% Compliant</div>
          <p class="text-xs text-text-secondary mt-1">All punctuation marks (: ; ! ?), currency symbols ($, €), percent signs (%), and guillemets (&#171; &#187;) have proper non-breaking spaces.</p>
        </div>`;
    } else {
      const rows = typoList
        .map((item) => {
          const pair = state.alignPairs.find((p) => p.frIndex === item.frIndex && !p.skip);
          const enJumpAttr = pair && pair.enIndex !== null ? `data-jump-en="${pair.enIndex}"` : '';
          const frJumpAttr = `data-jump-fr="${item.frIndex}"`;

          return `
        <div class="issue-row issue-row-clickable" ${enJumpAttr} ${frJumpAttr}>
          <div class="issue-side warn">SPACING</div>
          <div>
            <div class="issue-title">FR Block #${item.frIndex + 1} — ${escapeHtml(item.issues.map((iss) => iss.label).join(', '))}</div>
            <div class="issue-detail text-text font-mono text-xs p-2 rounded bg-surface-soft border border-border mt-1 leading-relaxed">
              ${highlightTypoOriginal(getTypoSnippetWindow(item.originalText, 140))}
            </div>
          </div>
          <div class="issue-status">
            <button type="button" class="btn btn-primary text-xs px-3 py-1 fix-typo-btn w-full text-center" data-fr-idx="${item.frIndex}">
              Fix Spacing
            </button>
          </div>
          <div>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`;
        })
        .join('');

      drawerBody.innerHTML = `
        <div class="p-3.5 bg-surface-soft border-b border-border flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-text">French Spacing (${typoList.length})</span>
            <span class="text-[11px] text-text-secondary ml-2">${typoList.length} block${typoList.length === 1 ? '' : 's'} require non-breaking spaces (&nbsp; / insécables)</span>
          </div>
          <button type="button" id="fixAllTypoBtn" class="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Fix All Spaces (${typoList.length})</span>
          </button>
        </div>
        <div>${rows}</div>`;
    }
  } else if (category === 'lang-en') {
    const langList = computeLangEnAudit();
    if (!langList.length) {
      drawerBody.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="text-sm font-bold text-text">Smart lang="en" Detection Complete</div>
          <p class="text-xs text-text-secondary mt-1">No untranslated English acronyms or quotes without lang="en" tags found.</p>
        </div>`;
    } else {
      const rows = langList
        .map(
          (item) => `
        <div class="p-3.5 border-b border-border bg-surface hover:bg-surface-hover/50 transition-colors flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="tag tag-fr text-[10px]">FR #${item.frIndex + 1}</span>
              <span class="text-xs font-bold text-text">Detected English Terms (${item.terms.length})</span>
            </div>
            <div class="text-xs text-text-secondary mb-2 font-mono p-2 rounded bg-surface-soft border border-border">
              "${escapeHtml(issueSnippet(item.block.text, 100))}"
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.terms
                .map(
                  (t) => `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-medium">
                  <code>${escapeHtml(t.term)}</code>
                  <button type="button" class="hover:underline font-bold text-[11px] ml-1 tag-single-lang-btn" data-fr-idx="${item.frIndex}" data-term="${escapeHtml(t.term)}">+ Wrap &lt;span lang="en"&gt;</button>
                </span>`
                )
                .join('')}
            </div>
          </div>
          <div class="flex flex-col gap-1.5 pt-1">
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-0.5 issue-row-clickable" data-jump-fr="${item.frIndex}">
              Jump →
            </button>
          </div>
        </div>`
        )
        .join('');

      drawerBody.innerHTML = `
        <div class="p-3.5 bg-surface-soft border-b border-border flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-text">Smart Language Attribute (lang="en") Inserter</div>
            <div class="text-[11px] text-text-secondary">${langList.length} French block${langList.length === 1 ? '' : 's'} contain untagged English federal acronyms or quotes</div>
          </div>
          <button type="button" id="tagAllLangEnBtn" class="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>Wrap All with &lt;span lang="en"&gt;</span>
          </button>
        </div>
        <div>${rows}</div>`;
    }
  } else if (category === 'mismatch') {
    const issues = state.issueGroups.mismatch;
    // A report about the two source documents, not a defect list. The French
    // output always follows the English HTML, so every row below describes a
    // difference that was already decided — the panel exists so the decision is
    // visible, not so it can be made here. Structural differences and carried
    // anchor links share the panel because neither can be acted on.
    const explainer = `
      <div class="p-3 mb-3 rounded-lg bg-surface-soft border border-border text-xs text-text-secondary leading-relaxed">
        <div class="font-bold text-text mb-1">Conversion — how the two sources differ</div>
        Your French output always follows the <strong class="text-text">English HTML</strong>. This is a record of every block where
        the <strong class="text-text">Word document used a different element</strong>, plus every anchor link the conversion
        <strong class="text-text">carried into the French output</strong> — and what that means for the result.
        Nothing here is an error, and nothing here is changed — the English HTML is authoritative.
      </div>`;
    if (!issues.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">Every block uses the same element in the English HTML and the Word document, and no anchor links were carried into the French output.</div>`;
    } else {
      const lossy = issues.filter((iss) => iss.lossy);
      const links = issues.filter((iss) => iss.outcome === 'link');
      const structural = issues.filter((iss) => iss.outcome !== 'link');
      drawerBody.innerHTML = explainer + issues
        .map(
          (iss) => `
        <div class="issue-row issue-row-clickable${iss.lossy ? '' : ' qa-notice-row'}" data-jump-en="${iss.enIndex}">
          <div class="issue-side ${iss.tone === 'warn' ? 'warn' : 'info'}">${escapeHtml(iss.badge)}</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
            ${iss.note ? `<div class="text-[11px] text-text-muted mt-1 italic">${escapeHtml(iss.note)}</div>` : ''}
          </div>
          <div class="issue-status">${iss.lossy ? 'Heading lost' : iss.outcome === 'link' ? 'Carried over' : 'No difference'}</div>
          <div>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`
        )
        .join('') + `
        <div class="p-3 text-xs text-text-secondary border-t border-border">
          ${structural.length} structural difference${structural.length === 1 ? '' : 's'}${links.length ? ` and ${links.length} carried anchor link${links.length === 1 ? '' : 's'}` : ''} recorded.
          ${lossy.length
            ? `<strong class="text-text">${lossy.length}</strong> of them mean${lossy.length === 1 ? 's' : ''} a heading in the Word document is not carried into the French output — the English HTML decides.`
            : 'All of them resolve to the same element in the French output as in the English HTML.'}
        </div>`;
    }
  } else if (category === 'missing') {
    const issues = state.issueGroups.missing;
    const omittedRows = state.alignRows.filter((r) => r.skip && r.enIndex !== null);
    if (!issues.length && !omittedRows.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">All English blocks have corresponding French translations.</div>`;
    } else {
      drawerBody.innerHTML = issues
        .map(
          (iss) => `
        <div class="issue-row issue-row-clickable" data-jump-en="${iss.enIndex}">
          <div class="issue-side danger">Missing FR</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">Unmatched in docx</div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1 drawer-replace-btn" data-kind="missing" data-en-idx="${iss.enIndex}" title="Input replacement French text">Replace text →</button>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1 toggle-skip-en-btn" data-en-idx="${iss.enIndex}" title="Mark as English equivalent or omit from French export">Omit in FR</button>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`
        )
        .join('') + omittedRows
        .map(
          (row) => `
        <div class="issue-row issue-row-clickable qa-notice-row" data-jump-en="${row.enIndex}">
          <div class="issue-side info">Omitted</div>
          <div>
            <div class="issue-title">English block #${row.enIndex + 1} — omitted from French export</div>
            <div class="issue-detail">${row.enIndex !== null && state.enBlocks[row.enIndex] ? escapeHtml(issueSnippet(state.enBlocks[row.enIndex].text)) : ''}</div>
          </div>
          <div class="issue-status">Omitted from FR</div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1 toggle-skip-en-btn" data-en-idx="${row.enIndex}" title="Restore this block to the French export">Restore</button>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`
        )
        .join('');
    }
  } else if (category === 'extra') {
    const issues = state.issueGroups.extra;
    if (!issues.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">No extra unaligned French paragraphs in the document.</div>`;
    } else {
      drawerBody.innerHTML = issues
        .map(
          (iss) => `
        <div class="issue-row issue-row-clickable" data-jump-fr="${iss.frIndex}">
          <div class="issue-side info">Extra FR</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">Word Docx Extra</div>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1 drawer-replace-btn" data-kind="extra" data-fr-idx="${iss.frIndex}" title="Replace or edit extra French text">Replace text →</button>
            <button type="button" class="btn btn-secondary text-xs px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded drawer-resolve-btn" data-fr-idx="${iss.frIndex}" title="Resolve: Remove EXTRA FRENCH CONTENT marker">Resolve</button>
            <button type="button" class="btn btn-secondary text-xs px-2 py-1 text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 rounded drawer-delete-btn" data-fr-idx="${iss.frIndex}" title="Delete extra French content">Delete</button>
          </div>
        </div>`
        )
        .join('');
    }
  }

  // Attach omit / restore button listeners
  drawerBody.querySelectorAll('.toggle-skip-en-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const enIdx = parseInt(btn.getAttribute('data-en-idx'), 10);
      const row = state.alignRows.find((r) => r.enIndex === enIdx);
      if (row) {
        row.skip = !row.skip;
        state.alignPairs = state.alignRows
          .filter((r) => r.enIndex !== null && r.frIndex !== null && !r.skip)
          .map((r) => ({
            enIndex: r.enIndex,
            frIndex: r.frIndex,
            groupedFrIndices: r.groupedFrIndices || [r.frIndex],
            mergedFrText: r.mergedFrText,
            mergedFrSpans: r.mergedFrSpans,
            skip: false,
          }));
        state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
        renderStatsBar();
        buildDualIframePreviews();
        renderDrawerBody(category);
      }
    });
  });

  // Attach Missing & Extra French action buttons inside drawer
  drawerBody.querySelectorAll('.drawer-replace-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kind = btn.getAttribute('data-kind');
      const enIdx = btn.getAttribute('data-en-idx');
      const frIdx = btn.getAttribute('data-fr-idx');
      openReplaceTextModal({
        kind,
        enIndex: enIdx ? parseInt(enIdx, 10) : null,
        frIndex: frIdx ? parseInt(frIdx, 10) : null,
      });
    });
  });

  drawerBody.querySelectorAll('.drawer-resolve-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const frIdx = parseInt(btn.getAttribute('data-fr-idx'), 10);
      applyResolveExtraText(frIdx);
      renderDrawerBody(category);
    });
  });

  drawerBody.querySelectorAll('.drawer-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const frIdx = parseInt(btn.getAttribute('data-fr-idx'), 10);
      applyDeleteText(frIdx);
      renderDrawerBody(category);
    });
  });

  // Attach jump click listeners inside drawer
  drawerBody.querySelectorAll('.issue-row-clickable').forEach((row) => {
    row.addEventListener('click', () => {
      const en = row.getAttribute('data-jump-en');
      const fr = row.getAttribute('data-jump-fr');
      if (en !== null && en !== '') {
        jumpToBlock(parseInt(en, 10));
      } else if (fr !== null && fr !== '') {
        const frIdx = parseInt(fr, 10);
        const match = state.alignPairs.find((p) => p.frIndex === frIdx);
        if (match && match.enIndex !== null) {
          jumpToBlock(match.enIndex);
        } else {
          highlightIndexInFrame(frPreviewFrame, frIdx);
          if (state.showWordDocView && docxPreviewFrame) {
            highlightIndexInFrame(docxPreviewFrame, frIdx);
          }
        }
      }
    });
  });

  // Attach Typography buttons inside drawer
  drawerBody.querySelectorAll('.fix-typo-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const frIdx = parseInt(btn.getAttribute('data-fr-idx'), 10);
      fixFrenchTypographyBlock(frIdx);
    });
  });

  const fixAllTypoBtn = document.getElementById('fixAllTypoBtn');
  if (fixAllTypoBtn) {
    fixAllTypoBtn.addEventListener('click', () => {
      fixAllFrenchTypography();
    });
  }

  // Attach lang="en" buttons inside drawer
  drawerBody.querySelectorAll('.tag-single-lang-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const frIdx = parseInt(btn.getAttribute('data-fr-idx'), 10);
      const term = btn.getAttribute('data-term');
      tagEnglishTermInBlock(frIdx, term);
    });
  });

  const tagAllLangEnBtn = document.getElementById('tagAllLangEnBtn');
  if (tagAllLangEnBtn) {
    tagAllLangEnBtn.addEventListener('click', () => {
      tagAllEnglishTerms();
    });
  }

}

export {
  closeControlsModal,
  closeDrawer,
  openControlsModal,
  openDrawer,
  renderDrawerBody,
};
