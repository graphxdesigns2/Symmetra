// Auto-generated imports
import {
  extractBlocks,
  tagElementAsSwapTarget,
} from './block-utils.js';
import {
  CONTEXT_MENU_INJECTED_SCRIPT,
  DETAILS_TOGGLE_SCRIPT,
  EN_SCROLLBAR_CSS,
  HIGHLIGHT_CSS,
  IMAGE_PLACEHOLDER_SCRIPT,
} from './constants.js';
import {
  syncDetailsToggle,
} from './details-sync.js';
import {
  docxBlockCountBadge,
  docxPreviewFrame,
  docxPreviewPane,
  enBlockCountBadge,
  enPreviewFrame,
  frBlockCountBadge,
  frPreviewFrame,
  toggleWordDocBtn,
} from './dom-refs.js';
import {
  buildFrenchFrameSource,
} from './french-frame.js';
import {
  formatFrenchRootRelativeLink,
  isFragmentHref,
} from './french-url.js';
import {
  convertFrenchImageSrc,
} from './french-utils.js';
import {
  SAMPLE_FR_DOCX_HTML,
} from './sample-data.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  cancelSmoothFollowScroll,
  clearPreviewPairSpacers,
  equalizePreviewHeights,
  findTopIndexForFrame,
  lastHoveredFrame,
  programmaticScrollEls,
  setupIframeEventListeners,
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  applyPreviewZoom,
} from './zoom.js';


function buildDualIframePreviews() {
  // Update block badges if present
  if (enBlockCountBadge) enBlockCountBadge.textContent = `${state.enBlocks.length} blocks`;
  if (frBlockCountBadge) frBlockCountBadge.textContent = `${state.frBlocks.length} blocks`;
  if (docxBlockCountBadge) docxBlockCountBadge.textContent = `${state.frBlocks.length} blocks`;

  // English Frame Document
  const enDocHtml = buildFrameSource(state.enHtml, state.enBlocks, 'en');
  // French Frame Document (Cloned from English structure so alert boxes, panels, and layouts match 1:1)
  const frDocHtml = buildFrenchFrameSource(state.enHtml, state.enBlocks, state.frBlocks, state.alignPairs);
  // Unmodified Original Word Document Frame
  const docxDocHtml = buildRawDocxFrameSource(state.frRawDocxHtml);

  enPreviewFrame.srcdoc = enDocHtml;
  frPreviewFrame.srcdoc = frDocHtml;
  if (docxPreviewFrame) {
    docxPreviewFrame.srcdoc = docxDocHtml;
  }

  // Once layout settles (images/fonts), equalize every pair's heights so the
  // two panes stay row-aligned down the whole document, then re-assert
  // alignment.
  // Debounced: both panes fire load, but one pass covers both.
  const schedulePostBuildEqualize = () => {
    try {
      if (enPreviewFrame && enPreviewFrame._symmetraEqTimer) {
        clearTimeout(enPreviewFrame._symmetraEqTimer);
      }
      if (enPreviewFrame) {
        enPreviewFrame._symmetraEqTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            try {
              // Fresh documents: drop the height signature first, or a
              // rebuilt pair of frames whose scroll heights happen to match
              // the previous build would be skipped as "unchanged".
              clearPreviewPairSpacers();
              equalizePreviewHeights();
              const idx = typeof state.activePreviewBlock === 'number' ? state.activePreviewBlock : 0;
              alignPreviewBlocks(idx);
              applyActiveHighlight();
            } catch (_) {}
          });
        }, 90);
      }
    } catch (_) {}
  };
  if (enPreviewFrame) enPreviewFrame.onload = schedulePostBuildEqualize;
  if (frPreviewFrame) frPreviewFrame.onload = schedulePostBuildEqualize;

  setupIframeEventListeners();
  applyPreviewZoom();
}

function applyImagePlaceholdersToDoc(containerEl, lang = 'en') {
  if (!containerEl) return;
  const imgs = Array.from(containerEl.querySelectorAll('img'));
  imgs.forEach((img) => {
    let src = (img.getAttribute('src') || '').trim();
    if (lang === 'fr' && src) {
      src = convertFrenchImageSrc(src);
      img.setAttribute('src', src);
    }
    const alt = (img.getAttribute('alt') || '').trim();

    const isLocalOrMissing = !src || src === '#' || (!src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://'));
    if (isLocalOrMissing) {
      img.classList.add('gc-img-replaced');
      img.style.setProperty('display', 'none', 'important');

      if (img.nextElementSibling && img.nextElementSibling.classList.contains('gc-img-placeholder')) {
        return;
      }

      const placeholder = containerEl.ownerDocument.createElement('div');
      placeholder.className = 'gc-img-placeholder';
      const swapIdx = img.getAttribute('data-swap-index') || img.getAttribute('data-en-index') || img.getAttribute('data-fr-index') || img.getAttribute('data-docx-index');
      if (swapIdx) {
        placeholder.setAttribute('data-swap-index', swapIdx);
      }
      const enIdx = img.getAttribute('data-en-index');
      if (enIdx) placeholder.setAttribute('data-en-index', enIdx);
      const frIdx = img.getAttribute('data-fr-index');
      if (frIdx) placeholder.setAttribute('data-fr-index', frIdx);
      const docxIdx = img.getAttribute('data-docx-index');
      if (docxIdx) placeholder.setAttribute('data-docx-index', docxIdx);

      if (img.classList.contains('gc-swap-active')) {
        placeholder.classList.add('gc-swap-active');
      }
      img.removeAttribute('data-swap-index');

      const iconSvg = '<svg class="gc-img-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      const altLabel = lang === 'fr' ? 'Texte alt' : 'Alt text';
      const altTextDisplay = alt ? `${altLabel}: ${alt}` : `${altLabel}: None`;
      const subText = src ? src : '(Image source: src="")';

      placeholder.innerHTML = `${iconSvg}<div class="gc-img-placeholder-title">${altTextDisplay}</div><div class="gc-img-placeholder-sub">${subText}</div>`;

      if (img.parentNode) {
        img.parentNode.insertBefore(placeholder, img.nextSibling);
      }
    }
  });
}

function setupToggleDetailsForDoc(doc, lang) {
  if (!doc || doc._symmetraDetailsBound) return;
  doc._symmetraDetailsBound = true;

  function sendDetailsSync(details, isOpen) {
    const allDetails = Array.from(doc.querySelectorAll('details'));
    const detailsIndex = allDetails.indexOf(details);
    const summary = details.querySelector('summary');
    const swapIndex = summary ? (summary.getAttribute('data-swap-index') || summary.getAttribute('data-en-index')) : null;
    const enIndex = summary ? summary.getAttribute('data-en-index') : null;
    const frIndex = summary ? summary.getAttribute('data-fr-index') : null;

    syncDetailsToggle(lang, {
      open: isOpen,
      detailsIndex,
      swapIndex: swapIndex ? parseInt(swapIndex, 10) : null,
      enIndex: enIndex ? parseInt(enIndex, 10) : null,
      frIndex: frIndex ? parseInt(frIndex, 10) : null,
    });
  }

  doc.addEventListener('toggle', (e) => {
    const details = e.target.closest('details');
    if (!details || details._programmatic) return;
    sendDetailsSync(details, details.open);
  }, true);

  doc.addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    if (!summary) return;
    const details = summary.closest('details');
    if (!details) return;

    if (details.open) {
      details._userClosed = true;
    } else {
      details._userClosed = false;
    }
  }, true);
}

function buildRawDocxFrameSource(rawDocxHtml) {
  const html = rawDocxHtml || state.frRawDocxHtml || SAMPLE_FR_DOCX_HTML;
  const isLight = state.theme === 'light';
  const bodyClass = [
    isLight ? 'gc-light-mode' : '',
    state.focusMode ? 'mode-focus' : '',
    state.blurMode ? 'mode-blur' : '',
    state.showHighlightBox === false ? 'hide-highlight' : '',
  ].filter(Boolean).join(' ');

  const parser = new DOMParser();
  const doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
  doc.body.innerHTML = html;

  // Format any links inside to root-relative
  doc.body.querySelectorAll('a[href]').forEach((a) => {
    const rawHref = a.getAttribute('href');
    if (rawHref && !isFragmentHref(rawHref)) {
      a.setAttribute('href', formatFrenchRootRelativeLink(rawHref));
    }
  });

  // Tag every block in the raw docx with data-swap-index so it syncs and can be clicked to jump
  const domBlocks = extractBlocks(doc.body);
  domBlocks.forEach((b, idx) => {
    tagElementAsSwapTarget(b.el, {
      'data-swap-index': idx,
      'data-docx-index': idx,
    });
  });

  applyImagePlaceholdersToDoc(doc.body, 'fr');
  doc.body.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${HIGHLIGHT_CSS}
  </style>
</head>
<body class="${bodyClass}">
  ${doc.body.innerHTML}
  <script>
    ${IMAGE_PLACEHOLDER_SCRIPT}
    ${DETAILS_TOGGLE_SCRIPT('docx')}
    // No custom context menu in the Word doc pane: keep native right-click.
    // Only notify parent to close any open custom menu.
    document.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      window.parent.postMessage({ type: 'symmetra-close-context-menu' }, '*');
    }, true);
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) {
        window.parent.postMessage({ type: 'symmetra-close-context-menu' }, '*');
      }
    });
    // Preview-only: links highlight the block but never navigate away / break srcdoc.
    document.addEventListener('click', (e) => {
      const link = e.target.closest ? e.target.closest('a[href]') : null;
      if (link) {
        e.preventDefault();
      }
    }, true);
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-swap-index]');
      if (target) {
        const rawIdx = target.getAttribute('data-swap-index');
        const idx = parseInt(rawIdx, 10);
        if (!isNaN(idx)) {
          window.parent.postMessage({ type: 'symmetra-jump', side: 'docx', index: idx }, '*');
        }
      }
    });
  </script>
</body>
</html>`;
}

let isTogglingWordDoc = false;

function toggleWordDocView(forceState) {
  // Determine where the user currently is before changing layout
  const isValidBlock = (idx) => typeof idx === 'number' && Number.isFinite(idx) && idx > 0;

  let enVisible = null;
  let frVisible = null;
  let docxVisible = null;

  try {
    if (enPreviewFrame) {
      const topIdx = findTopIndexForFrame(enPreviewFrame);
      if (topIdx !== null) enVisible = topIdx;
    }
  } catch (_) {}

  try {
    if (frPreviewFrame) {
      const frTop = findTopIndexForFrame(frPreviewFrame);
      if (frTop !== null) {
        const pair = state.alignPairs ? state.alignPairs.find(
          (p) => !p.skip && (p.frIndex === frTop || (p.groupedFrIndices && p.groupedFrIndices.includes(frTop)))
        ) : null;
        if (pair && typeof pair.enIndex === 'number') {
          frVisible = pair.enIndex;
        } else {
          frVisible = Math.max(0, Math.min(frTop - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
        }
      }
    }
  } catch (_) {}

  try {
    if (state.showWordDocView && docxPreviewFrame) {
      const docxTop = findTopIndexForFrame(docxPreviewFrame);
      if (docxTop !== null) {
        const pair = state.alignPairs ? state.alignPairs.find(
          (p) => !p.skip && (p.frIndex === docxTop || (p.groupedFrIndices && p.groupedFrIndices.includes(docxTop)))
        ) : null;
        if (pair && typeof pair.enIndex === 'number') {
          docxVisible = pair.enIndex;
        } else {
          docxVisible = Math.max(0, Math.min(docxTop - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
        }
      }
    }
  } catch (_) {}

  let resumeBlock = 0;

  // Prioritize the frame the user was actually interacting with if it has a scrolled block
  if (lastHoveredFrame === docxPreviewFrame && isValidBlock(docxVisible)) {
    resumeBlock = docxVisible;
  } else if (lastHoveredFrame === frPreviewFrame && isValidBlock(frVisible)) {
    resumeBlock = frVisible;
  } else if (lastHoveredFrame === enPreviewFrame && isValidBlock(enVisible)) {
    resumeBlock = enVisible;
  } else if (isValidBlock(enVisible)) {
    resumeBlock = enVisible;
  } else if (isValidBlock(frVisible)) {
    resumeBlock = frVisible;
  } else if (isValidBlock(docxVisible)) {
    resumeBlock = docxVisible;
  } else if (isValidBlock(state.activePreviewBlock)) {
    resumeBlock = state.activePreviewBlock;
  } else if (isValidBlock(state.lastKnownEnIndex)) {
    resumeBlock = state.lastKnownEnIndex;
  } else if (typeof state.activePreviewBlock === 'number' && state.activePreviewBlock >= 0) {
    resumeBlock = state.activePreviewBlock;
  }

  if (state.enBlocks && state.enBlocks.length > 0) {
    resumeBlock = Math.max(0, Math.min(resumeBlock, state.enBlocks.length - 1));
  }

  state.activePreviewBlock = resumeBlock;
  state.lastKnownEnIndex = resumeBlock;

  // Prevent spurious scroll syncs during layout re-flow / grid transition
  isTogglingWordDoc = true;

  [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
    try {
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (doc) {
        const scrollEl = doc.scrollingElement || doc.documentElement;
        if (scrollEl) {
          cancelSmoothFollowScroll(scrollEl);
          programmaticScrollEls.add(scrollEl);
        }
      }
    } catch (_) {}
  });

  state.showWordDocView = forceState !== undefined ? forceState : !state.showWordDocView;
  const isShown = state.showWordDocView;
  const workspaceEl = document.getElementById('workspace');
  if (workspaceEl) {
    workspaceEl.classList.toggle('has-word-doc', isShown);
  }
  if (docxPreviewPane) {
    docxPreviewPane.style.display = isShown ? 'flex' : 'none';
  }
  if (toggleWordDocBtn) {
    toggleWordDocBtn.classList.toggle('is-active', isShown);
  }

  const releaseProgrammaticScroll = () => {
    isTogglingWordDoc = false;
    [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
      try {
        const doc = frame?.contentDocument || frame?.contentWindow?.document;
        if (doc) {
          const scrollEl = doc.scrollingElement || doc.documentElement;
          if (scrollEl) programmaticScrollEls.delete(scrollEl);
        }
      } catch (_) {}
    });
  };

  if (isShown) {
    if (docxPreviewFrame) {
      docxPreviewFrame.srcdoc = buildRawDocxFrameSource(state.frRawDocxHtml);
      docxPreviewFrame.onload = () => {
        if (state.showWordDocView && typeof state.activePreviewBlock === 'number') {
          alignPreviewBlocks(state.activePreviewBlock);
          applyActiveHighlight();
        }
      };
    }
    if (docxBlockCountBadge) {
      docxBlockCountBadge.textContent = `${state.frBlocks ? state.frBlocks.length : 0} blocks`;
    }
    setupIframeEventListeners();

    applyActiveHighlight();
    alignPreviewBlocks(resumeBlock);
    updateActiveBlockHud(resumeBlock);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
    }, 80);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
    }, 200);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
      updateActiveBlockHud(resumeBlock);
      releaseProgrammaticScroll();
    }, 320);
  } else {
    // When closing Word doc view, ensure EN & FR continue seamlessly right where the user left off
    applyActiveHighlight();
    alignPreviewBlocks(resumeBlock);
    updateActiveBlockHud(resumeBlock);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
    }, 80);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
    }, 200);

    setTimeout(() => {
      applyActiveHighlight();
      alignPreviewBlocks(resumeBlock);
      updateActiveBlockHud(resumeBlock);
      releaseProgrammaticScroll();
    }, 320);
  }
}

function buildFrameSource(rawHtml, blocks, lang) {
  const parser = new DOMParser();
  let doc;
  const hasHtmlTag = /<html[\s>]/i.test(rawHtml);

  if (hasHtmlTag) {
    doc = parser.parseFromString(rawHtml, 'text/html');
  } else {
    doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
    doc.body.innerHTML = rawHtml;
  }

  // Tag DOM nodes with data-swap-index and editable attributes
  const domBlocks = extractBlocks(doc.body);
  domBlocks.forEach((b, idx) => {
    tagElementAsSwapTarget(
      b.el,
      {
        'data-swap-index': idx,
        ...(lang === 'fr' ? { contenteditable: 'true' } : {}),
      },
      lang === 'fr' ? ['gc-swap-editable'] : []
    );
  });

  applyImagePlaceholdersToDoc(doc.body, lang);
  doc.body.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));

  const isLight = state.theme === 'light';
  const bodyClass = [
    isLight ? 'gc-light-mode' : '',
    state.focusMode ? 'mode-focus' : '',
    state.blurMode ? 'mode-blur' : '',
    state.showHighlightBox === false ? 'hide-highlight' : '',
  ].filter(Boolean).join(' ');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${HIGHLIGHT_CSS}
${EN_SCROLLBAR_CSS}</style>
</head>
<body class="${bodyClass}">
  ${doc.body.innerHTML}
  <script>
    ${IMAGE_PLACEHOLDER_SCRIPT}
    ${DETAILS_TOGGLE_SCRIPT(lang)}
    // Preview-only: links highlight the block but never navigate away / break srcdoc.
    document.addEventListener('click', (e) => {
      const link = e.target.closest ? e.target.closest('a[href]') : null;
      if (link) {
        e.preventDefault();
      }
    }, true);
    ${CONTEXT_MENU_INJECTED_SCRIPT(lang)}
    document.addEventListener('click', (e) => {
      // Footnote citations & return links, all conventions (WET #fn1 plus
      // Word #_ftn1 / #ftn1 / #footnote-1, returns #fn1-rf / #_ftnref1).
      // getElementById + name lookup avoid querySelector choking on ids, and
      // return clicks scroll back to the citation (not to their own block).
      const postJump = (el) => {
        try {
          const scope = el && el.closest ? (el.closest('[data-swap-index]') || el) : el;
          const raw = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const idx = raw !== null && raw !== undefined ? parseInt(raw, 10) : NaN;
          if (!isNaN(idx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: '${lang}', index: idx }, '*');
            return true;
          }
        } catch (_) {}
        return false;
      };
      // Footnote jumps teleport: parent places everything synchronously and
      // centers the exact element — no easing loops, no settle timeouts, no
      // native smooth scrolls fighting the placement. Posts whenever there is
      // anything to place (index and/or element id).
      const postJumpFn = (el, targetId) => {
        try {
          // Ancestor first (citations inside tagged blocks), then the first
          // tagged descendant (footnote DDs are untagged containers whose
          // inner paragraphs carry the indices).
          const scope = el && el.closest ? (el.closest('[data-swap-index]') || el.querySelector('[data-swap-index]') || el) : el;
          const raw = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const idx = raw !== null && raw !== undefined ? parseInt(raw, 10) : NaN;
          if (!isNaN(idx) || targetId) {
            window.parent.postMessage({ type: 'symmetra-fn-jump', side: '${lang}', index: !isNaN(idx) ? idx : null, targetId: targetId || null }, '*');
            return true;
          }
        } catch (_) {}
        return false;
      };
      const targetForHref = (href) => {
        if (!href) return null;
        const hashIdx = href.indexOf('#');
        if (hashIdx === -1) return null;
        const id = href.slice(hashIdx + 1);
        if (!id) return null;
        const visible = (el) => {
          try {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          } catch (_) { return false; }
        };
        let t = null;
        try { t = document.getElementById(id); } catch (_) {}
        if (t && !visible(t)) {
          // Duplicate ids: prefer the rendered occurrence.
          try {
            const all = document.querySelectorAll('[id="' + id.replace(/"/g, '') + '"]');
            for (let k = 0; k < all.length; k++) {
              if (visible(all[k])) { t = all[k]; break; }
            }
          } catch (_) {}
        }
        if (!t) {
          try { t = document.querySelector('a[name="' + id.replace(/"/g, '') + '"]'); } catch (_) {}
        }
        return t;
      };
      // Closed <details> hide the target: open first so the scroll lands on
      // final layout instead of the collapsed position.
      const openDetailsFor = (el) => {
        try {
          const d = el && el.closest ? el.closest('details:not([open])') : null;
          if (d && !d._userClosed) {
            d._programmatic = true;
            d.open = true;
            setTimeout(() => { d._programmatic = false; }, 60);
          }
        } catch (_) {}
      };
      let linkEl = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!linkEl) {
        // Clicked the citation's padding (e.g. the <sup> wrapped around the
        // anchor) rather than the anchor itself: resolve the footnote link
        // inside, otherwise the click falls through and nothing happens.
        try {
          const citeScope = e.target && e.target.closest ? e.target.closest('sup[id], .fn-lnk') : null;
          const inner = citeScope && citeScope.querySelector ? citeScope.querySelector('a[href]') : null;
          if (inner) linkEl = inner;
        } catch (_) {}
      }
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        const frag = href.indexOf('#') === -1 ? '' : href.slice(href.indexOf('#'));
        const isCite = /^#(?:fn[-_]?\d+[a-z0-9_-]*|_ftn\d+|ftn\d+|footnote-\d+)/i.test(frag) ||
          (linkEl.classList && linkEl.classList.contains('fn-lnk'));
        const isRtn = /^#(?:fn[-_]?\d+[a-z0-9_-]*-rf|_ftnref\d+|ftnref\d+)/i.test(frag) ||
          (linkEl.classList && linkEl.classList.contains('fn-rtn')) ||
          (linkEl.closest && linkEl.closest('.fn-rtn'));
        if (isCite || isRtn) {
          e.preventDefault();
          e.stopPropagation();
          const t = targetForHref(href);
          if (t) {
            openDetailsFor(t);
            if (!postJumpFn(t, t.id || null)) {
              try { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
            }
          } else {
            postJump(linkEl);
          }
          return;
        }
      }

      const dt = e.target.closest('dt');
      if (dt) {
        const nextDd = dt.nextElementSibling;
        const swapEl = nextDd ? (nextDd.matches('[data-swap-index]') ? nextDd : nextDd.querySelector('[data-swap-index]')) : null;
        if (swapEl) {
          const idx = parseInt(swapEl.getAttribute('data-swap-index'), 10);
          if (!isNaN(idx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: '${lang}', index: idx }, '*');
            return;
          }
        }
      }

      // Return affordance clicked outside its link (e.g. wrapper text): at
      // least sync the block. Linked returns are handled above (scroll back).
      const rtnOnly = e.target.closest('.fn-rtn');
      if (rtnOnly) {
        if (postJump(rtnOnly)) return;
      }

      const target = e.target.closest('[data-swap-index]');
      if (target) {
        const idx = parseInt(target.getAttribute('data-swap-index'), 10);
        if (!isNaN(idx)) {
          window.parent.postMessage({ type: 'symmetra-jump', side: '${lang}', index: idx }, '*');
        }
      }
    });

    document.addEventListener('input', (e) => {
      const target = e.target.closest('[data-swap-index]');
      if (target && '${lang}' === 'fr') {
        const idx = parseInt(target.getAttribute('data-swap-index'), 10);
        if (!isNaN(idx)) {
          window.parent.postMessage({ type: 'frEdit', index: idx, text: target.innerText }, '*');
        }
      }
    });
  </script>
</body>
</html>`;
}

export {
  applyImagePlaceholdersToDoc,
  buildDualIframePreviews,
  buildFrameSource,
  buildRawDocxFrameSource,
  isTogglingWordDoc,
  setupToggleDetailsForDoc,
  toggleWordDocView,
};
