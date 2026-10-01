// Auto-generated imports
import {
  isOmittedEnglishEquivalentBlock,
  isPdfSidePanelElement,
  isTextEquivalentSummaryText,
} from './alignment.js';
import {
  insertExtraFrenchElement,
  replaceBlockTextPreservingLinks,
} from './block-text-replace.js';
import {
  cleanCaptionTags,
  cleanThTags,
  extractBlocks,
  tagElementAsSwapTarget,
} from './block-utils.js';
import {
  CONTEXT_MENU_INJECTED_SCRIPT,
  DETAILS_TOGGLE_SCRIPT,
  FR_SCROLLBAR_CSS,
  HIGHLIGHT_CSS,
  IMAGE_PLACEHOLDER_SCRIPT,
} from './constants.js';
import {
  cleanFrenchHtmlPostProcess,
} from './footnote-transform.js';
import {
  formatFrenchRootRelativeLink,
  isFragmentHref,
} from './french-url.js';
import {
  convertFrenchImageSrc,
  synthesizeFrenchSummary,
} from './french-utils.js';
import {
  applyImagePlaceholdersToDoc,
  buildFrameSource,
} from './iframe-preview.js';
import {
  autoLocalizeAllPdfSidePanels,
  cleanFrenchDocImages,
  getSampleOrBoilerplateTranslation,
  normalizePanelText,
} from './pdf-side-panel.js';
import {
  state,
} from './state.ts';


function buildFrenchFrameSource(rawEnHtml, enBlocks, frBlocks, alignPairs) {
  if (!rawEnHtml) {
    const frInnerHtml = frBlocks
      .map((b) => `<${b.tag}>${b.text}</${b.tag}>`)
      .join('\n');
    return buildFrameSource(frInnerHtml, frBlocks, 'fr');
  }

  const parser = new DOMParser();
  let doc;
  const hasHtmlTag = /<html[\s>]/i.test(rawEnHtml);

  if (hasHtmlTag) {
    doc = parser.parseFromString(rawEnHtml, 'text/html');
  } else {
    doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
    doc.body.innerHTML = rawEnHtml;
  }

  if (doc.documentElement) {
    doc.documentElement.setAttribute('lang', 'fr');
  }

  const domBlocks = extractBlocks(doc.body);
  const rows = state.alignRows || [];
  let lastInsertedEl = null;

  if (rows.length > 0) {
    rows.forEach((row) => {
      if (row.enIndex !== null) {
        const enIdx = row.enIndex;
        const enBlock = domBlocks[enIdx];
        if (enBlock) {
          if (row.frIndex !== null && !row.skip) {
            const frText = row.mergedFrText !== undefined
              ? row.mergedFrText
              : (frBlocks[row.frIndex] ? frBlocks[row.frIndex].text : '');
            const frSpans = row.mergedFrSpans !== undefined
              ? row.mergedFrSpans
              : (frBlocks[row.frIndex] ? frBlocks[row.frIndex].spans : []);
            
            const isMissing = !isPdfSidePanelElement(enBlock.el) && /\[?(?:TRADUCTION\s+MANQUANTE|TRANSLATION\s+MISSING)/i.test(frText);

            if (!isPdfSidePanelElement(enBlock.el)) {
              replaceBlockTextPreservingLinks(enBlock.el, frText, enBlock.attrTarget, frSpans);
            } else if (
              frText &&
              normalizePanelText(frText) !== normalizePanelText(enBlock.text || '')
            ) {
              // Side panels are templated by autoLocalizeAllPdfSidePanels below,
              // but harvested user edits must still be carried forward — otherwise
              // the localizer only ever sees English and regenerates over them.
              // Replace only when the harvested text genuinely differs from the
              // English source; untouched panels keep the legacy template path.
              replaceBlockTextPreservingLinks(enBlock.el, frText, enBlock.attrTarget, frSpans);
            }
            
            const classes = ['gc-swap-editable'];
            const attrs = {
              'data-swap-index': enIdx,
              'data-fr-index': row.frIndex,
              'data-en-index': enIdx,
              'contenteditable': 'true',
            };
            if (isMissing) {
              classes.push('gc-swap-missing');
              attrs['title'] = 'Translation missing in Word document - Click to enter French translation';
            }
            tagElementAsSwapTarget(enBlock.el, attrs, classes);
          } else {
            // English block missing French translation in Word doc:
            if (row.skip || isOmittedEnglishEquivalentBlock(enBlock)) {
              if (enBlock.el.classList.contains('gc-br-line') || enBlock.el.closest('[data-gc-br-wrapped]')) {
                const next = enBlock.el.nextSibling;
                const prev = enBlock.el.previousSibling;
                if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
                  next.remove();
                } else if (prev && prev.nodeType === 1 && prev.tagName.toLowerCase() === 'br') {
                  prev.remove();
                }
                enBlock.el.remove();
              } else {
                enBlock.el.remove();
              }
              return;
            }
            if (enBlock.tag === 'summary' && isTextEquivalentSummaryText(enBlock.text)) {
              let figTitle = '';
              const figEl = enBlock.el.closest('figure');
              if (figEl) {
                const fc = figEl.querySelector('figcaption');
                if (fc) figTitle = fc.textContent || '';
              }
              const synthText = synthesizeFrenchSummary(enBlock.text, figTitle);
              replaceBlockTextPreservingLinks(enBlock.el, synthText, enBlock.attrTarget, []);
              tagElementAsSwapTarget(
                enBlock.el,
                {
                  'data-swap-index': enIdx,
                  'data-en-index': enIdx,
                  'contenteditable': 'true',
                },
                ['gc-swap-editable']
              );
            } else if (isPdfSidePanelElement(enBlock.el)) {
              tagElementAsSwapTarget(
                enBlock.el,
                {
                  'data-swap-index': enIdx,
                  'data-en-index': enIdx,
                  'contenteditable': 'true',
                  'title': 'Auto-localized Canada.ca PDF side panel metadata',
                },
                ['gc-swap-editable']
              );
            } else {
              const knownFr = getSampleOrBoilerplateTranslation(enBlock.text);
              if (knownFr) {
                replaceBlockTextPreservingLinks(enBlock.el, knownFr, enBlock.attrTarget, []);
                tagElementAsSwapTarget(
                  enBlock.el,
                  {
                    'data-swap-index': enIdx,
                    'data-en-index': enIdx,
                    'contenteditable': 'true',
                  },
                  ['gc-swap-editable']
                );
              } else {
                const fillerText = `[TRANSLATION MISSING : ${enBlock.text}]`;
                replaceBlockTextPreservingLinks(enBlock.el, fillerText, enBlock.attrTarget, enBlock.spans);
                tagElementAsSwapTarget(
                  enBlock.el,
                  {
                    'data-swap-index': enIdx,
                    'data-en-index': enIdx,
                    'contenteditable': 'true',
                    'title': 'Translation missing in Word document - Click to enter French translation',
                  },
                  ['gc-swap-editable', 'gc-swap-missing']
                );
              }
            }
          }
          lastInsertedEl = enBlock.el;
        }
      } else if (row.frIndex !== null && !row.skip) {
        // Extra French content: create element and insert into DOM so no French content is removed
        const frBlock = frBlocks[row.frIndex];
        if (frBlock) {
          const tag = frBlock.tag && ['h1','h2','h3','h4','h5','h6','p','li','blockquote','figcaption','div'].includes(frBlock.tag)
            ? frBlock.tag
            : 'p';
          const newEl = doc.createElement(tag);
          const extraText = /\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)/i.test(frBlock.text)
            ? frBlock.text
            : `[EXTRA FRENCH CONTENT : ${frBlock.text}]`;
          replaceBlockTextPreservingLinks(newEl, extraText, 'text', frBlock.spans || []);
          tagElementAsSwapTarget(
            newEl,
            {
              'data-fr-index': row.frIndex,
              'data-extra-fr': 'true',
              'contenteditable': 'true',
              'title': 'Extra French content from Word document (no matching English block in source HTML)',
            },
            ['gc-swap-editable', 'gc-swap-extra']
          );
          insertExtraFrenchElement(doc, newEl, lastInsertedEl);
          lastInsertedEl = newEl;
        }
      }
    });
  } else {
    domBlocks.forEach((enBlock, enIdx) => {
      const pair = alignPairs ? alignPairs.find((p) => p.enIndex === enIdx && !p.skip) : null;
      if (pair && pair.frIndex !== null && frBlocks[pair.frIndex]) {
        const frText = pair.mergedFrText !== undefined ? pair.mergedFrText : frBlocks[pair.frIndex].text;
        const frSpans = pair.mergedFrSpans !== undefined ? pair.mergedFrSpans : frBlocks[pair.frIndex].spans;
        const isMissing = !isPdfSidePanelElement(enBlock.el) && /\[?(?:TRADUCTION\s+MANQUANTE|TRANSLATION\s+MISSING)/i.test(frText);
        if (!isPdfSidePanelElement(enBlock.el)) {
          replaceBlockTextPreservingLinks(enBlock.el, frText, enBlock.attrTarget, frSpans);
        }
        const classes = ['gc-swap-editable'];
        const attrs = {
          'data-swap-index': enIdx,
          'data-fr-index': pair.frIndex,
          'data-en-index': enIdx,
          'contenteditable': 'true',
        };
        if (isMissing) {
          classes.push('gc-swap-missing');
          attrs['title'] = 'Translation missing in Word document - Click to enter French translation';
        }
        tagElementAsSwapTarget(enBlock.el, attrs, classes);
      } else {
        const pair = state.alignPairs.find((p) => p.enIndex === enIdx);
        if (pair?.skip || isOmittedEnglishEquivalentBlock(enBlock)) {
          if (enBlock.el.classList.contains('gc-br-line') || enBlock.el.closest('[data-gc-br-wrapped]')) {
            const next = enBlock.el.nextSibling;
            const prev = enBlock.el.previousSibling;
            if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
              next.remove();
            } else if (prev && prev.nodeType === 1 && prev.tagName.toLowerCase() === 'br') {
              prev.remove();
            }
            enBlock.el.remove();
          } else {
            enBlock.el.remove();
          }
          return;
        }
        if (enBlock.tag === 'summary' && isTextEquivalentSummaryText(enBlock.text)) {
          let figTitle = '';
          const figEl = enBlock.el.closest('figure');
          if (figEl) {
            const fc = figEl.querySelector('figcaption');
            if (fc) figTitle = fc.textContent || '';
          }
          const synthText = synthesizeFrenchSummary(enBlock.text, figTitle);
          replaceBlockTextPreservingLinks(enBlock.el, synthText, enBlock.attrTarget, []);
          tagElementAsSwapTarget(
            enBlock.el,
            {
              'data-swap-index': enIdx,
              'data-en-index': enIdx,
              'contenteditable': 'true',
            },
            ['gc-swap-editable']
          );
        } else if (isPdfSidePanelElement(enBlock.el)) {
          tagElementAsSwapTarget(
            enBlock.el,
            {
              'data-swap-index': enIdx,
              'data-en-index': enIdx,
              'contenteditable': 'true',
              'title': 'Auto-localized Canada.ca PDF side panel metadata',
            },
            ['gc-swap-editable']
          );
        } else {
          const knownFr = getSampleOrBoilerplateTranslation(enBlock.text);
          if (knownFr) {
            replaceBlockTextPreservingLinks(enBlock.el, knownFr, enBlock.attrTarget, []);
            tagElementAsSwapTarget(
              enBlock.el,
              {
                'data-swap-index': enIdx,
                'data-en-index': enIdx,
                'contenteditable': 'true',
              },
              ['gc-swap-editable']
            );
          } else {
            const fillerText = `[TRANSLATION MISSING : ${enBlock.text}]`;
            replaceBlockTextPreservingLinks(enBlock.el, fillerText, enBlock.attrTarget, enBlock.spans);
            tagElementAsSwapTarget(
              enBlock.el,
              {
                'data-swap-index': enIdx,
                'data-en-index': enIdx,
                'contenteditable': 'true',
                'title': 'Translation missing in Word document - Click to enter French translation',
              },
              ['gc-swap-editable', 'gc-swap-missing']
            );
          }
        }
      }
    });
  }

  // Ensure all links on the French side are formatted as root-relative
  doc.body.querySelectorAll('a[href]').forEach((a) => {
    const rawHref = a.getAttribute('href');
    if (rawHref && !isFragmentHref(rawHref)) {
      a.setAttribute('href', formatFrenchRootRelativeLink(rawHref));
    }
  });

  // Ensure all image src attributes on the French side use French localization (e.g. -en.png -> -fr.png, -en.jpg -> -fr.jpg)
  doc.body.querySelectorAll('img[src]').forEach((img) => {
    const rawSrc = img.getAttribute('src');
    if (rawSrc) {
      img.setAttribute('src', convertFrenchImageSrc(rawSrc));
    }
  });

  // For all English images that don't have alt text, leave the French as none as well
  cleanFrenchDocImages(doc, rawEnHtml);

  // Auto-localize Canada.ca PDF side panels (H1 download link, Health Canada / PHAC links, published date)
  autoLocalizeAllPdfSidePanels(doc.body, rawEnHtml);

    // Clean any redundant <strong> tags inside <th> header cells and <caption>s
    cleanThTags(doc.body);
    cleanCaptionTags(doc.body);

  applyImagePlaceholdersToDoc(doc.body, 'fr');
  doc.body.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));

  const isLight = state.theme === 'light';
  const bodyClass = [
    isLight ? 'gc-light-mode' : '',
    state.focusMode ? 'mode-focus' : '',
    state.blurMode ? 'mode-blur' : '',
    state.showHighlightBox === false ? 'hide-highlight' : '',
  ].filter(Boolean).join(' ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${HIGHLIGHT_CSS}
${FR_SCROLLBAR_CSS}</style>
</head>
<body class="${bodyClass}">
  ${cleanFrenchHtmlPostProcess(doc.body.innerHTML)}
  <script>
    ${IMAGE_PLACEHOLDER_SCRIPT}
    ${DETAILS_TOGGLE_SCRIPT('fr')}
    // Preview-only: links highlight the block but never navigate away / break srcdoc.
    document.addEventListener('click', (e) => {
      const link = e.target.closest ? e.target.closest('a[href]') : null;
      if (link) {
        e.preventDefault();
      }
    }, true);
    document.addEventListener('click', (e) => {
      // Footnote citations & return links, all conventions (WET #fn1 plus
      // Word #_ftn1 / #ftn1 / #footnote-1, returns #fn1-rf / #_ftnref1).
      // Return clicks scroll back to the citation (not to their own block).
      const postJump = (el) => {
        try {
          const scope = el && el.closest ? (el.closest('[data-swap-index], [data-fr-index]') || el) : el;
          const rawIdx = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const frAttr = scope && scope.getAttribute ? scope.getAttribute('data-fr-index') : null;
          const idx = rawIdx !== null && rawIdx !== undefined ? parseInt(rawIdx, 10) : NaN;
          const frIdx = frAttr !== null && frAttr !== undefined ? parseInt(frAttr, 10) : NaN;
          if (!isNaN(idx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', index: idx, frIndex: !isNaN(frIdx) ? frIdx : undefined }, '*');
            return true;
          } else if (!isNaN(frIdx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', frIndex: frIdx }, '*');
            return true;
          }
        } catch (_) {}
        return false;
      };
      // Footnote jumps teleport: parent places everything synchronously and
      // centers the exact element — no easing loops, no settle timeouts, no
      // native smooth scrolls fighting the placement. Posts whenever there is
      // anything to place (indices and/or element id).
      const postJumpFn = (el, targetId) => {
        try {
          // Ancestor first (citations inside tagged blocks), then the first
          // tagged descendant (footnote DDs are untagged containers whose
          // inner paragraphs carry the indices).
          const scope = el && el.closest ? (el.closest('[data-swap-index], [data-fr-index]') || el.querySelector('[data-swap-index], [data-fr-index]') || el) : el;
          const rawIdx = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const frAttr = scope && scope.getAttribute ? scope.getAttribute('data-fr-index') : null;
          const idx = rawIdx !== null && rawIdx !== undefined ? parseInt(rawIdx, 10) : NaN;
          const frIdx = frAttr !== null && frAttr !== undefined ? parseInt(frAttr, 10) : NaN;
          if (!isNaN(idx) || !isNaN(frIdx) || targetId) {
            window.parent.postMessage({ type: 'symmetra-fn-jump', side: 'fr', index: !isNaN(idx) ? idx : null, frIndex: !isNaN(frIdx) ? frIdx : null, targetId: targetId || null }, '*');
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
        const swapEl = nextDd ? (nextDd.matches('[data-swap-index], [data-fr-index]') ? nextDd : nextDd.querySelector('[data-swap-index], [data-fr-index]')) : null;
        if (swapEl) {
          const rawIdx = swapEl.getAttribute('data-swap-index');
          const frIdx = swapEl.getAttribute('data-fr-index');
          const idx = parseInt(rawIdx, 10);
          if (!isNaN(idx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', index: idx, frIndex: frIdx ? parseInt(frIdx, 10) : undefined }, '*');
            return;
          } else if (frIdx) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', frIndex: parseInt(frIdx, 10) }, '*');
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

      const target = e.target.closest('[data-swap-index], [data-fr-index]');
      if (target) {
        const rawIdx = target.getAttribute('data-swap-index');
        const frIdx = target.getAttribute('data-fr-index');
        const idx = parseInt(rawIdx, 10);
        if (!isNaN(idx)) {
          window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', index: idx, frIndex: frIdx ? parseInt(frIdx, 10) : undefined }, '*');
        } else if (frIdx) {
          window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', frIndex: parseInt(frIdx, 10) }, '*');
        }
      }
    });

    document.addEventListener('input', (e) => {
      const target = e.target.closest('[data-swap-index], [data-fr-index]');
      if (target) {
        const enIdx = target.hasAttribute('data-en-index') || target.hasAttribute('data-swap-index') ? parseInt(target.getAttribute('data-en-index') || target.getAttribute('data-swap-index'), 10) : null;
        const frIdx = target.hasAttribute('data-fr-index') ? parseInt(target.getAttribute('data-fr-index'), 10) : null;
        const currentText = target.innerText ? target.innerText.trim() : (target.textContent || '').trim();
        if (target.classList.contains('gc-swap-missing') && currentText && !currentText.includes('TRANSLATION MISSING') && !currentText.includes('TRADUCTION MANQUANTE')) {
          target.classList.remove('gc-swap-missing');
          target.removeAttribute('title');
        }
        window.parent.postMessage({ type: 'frEdit', enIndex: !isNaN(enIdx) ? enIdx : null, frIndex: frIdx, text: currentText }, '*');
      }
    });

    ${CONTEXT_MENU_INJECTED_SCRIPT('fr')}
  </script>
</body>
</html>`;
}

function buildFrenchFrameSourceFromHtml(rawHtml, frBlocks) {
  if (!rawHtml || !rawHtml.trim()) {
    rawHtml = '<p></p>';
  }

  const parser = new DOMParser();
  let doc;
  const hasHtmlTag = /<html[\s>]/i.test(rawHtml);

  if (hasHtmlTag) {
    doc = parser.parseFromString(rawHtml, 'text/html');
  } else {
    doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
    doc.body.innerHTML = rawHtml;
  }

  if (doc.documentElement) {
    doc.documentElement.setAttribute('lang', 'fr');
  }

  const domBlocks = extractBlocks(doc.body);

  domBlocks.forEach((frBlock, frIdx) => {
    const pair = state.alignPairs ? state.alignPairs.find((p) => p.frIndex === frIdx && !p.skip) : null;
    const enIdx = pair && pair.enIndex !== null ? pair.enIndex : null;
    const isMissing = /\[?(?:TRADUCTION\s+MANQUANTE|TRANSLATION\s+MISSING)/i.test(frBlock.text || '') ||
      /\[?(?:TRADUCTION\s+MANQUANTE|TRANSLATION\s+MISSING)/i.test(frBlock.el.textContent || '');
    const isExtra = frBlock.el.hasAttribute('data-extra-fr') ||
      /\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)/i.test(frBlock.text || '') ||
      /\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)/i.test(frBlock.el.textContent || '') ||
      (pair && pair.enIndex === null) ||
      (!pair && enIdx === null && state.alignRows && state.alignRows.some((r) => r.frIndex === frIdx && r.enIndex === null));

    const classes = ['gc-swap-editable'];
    const attrs = {
      'contenteditable': 'true',
      'data-fr-index': frIdx,
    };

    if (enIdx !== null) {
      attrs['data-swap-index'] = enIdx;
      attrs['data-en-index'] = enIdx;
    } else {
      attrs['data-swap-index'] = frIdx;
    }

    if (isMissing) {
      classes.push('gc-swap-missing');
      attrs['title'] = 'Translation missing in Word document - Click to enter French translation';
    } else if (isExtra) {
      classes.push('gc-swap-extra');
      attrs['data-extra-fr'] = 'true';
      attrs['title'] = 'Extra French content from Word document (no matching English block in source HTML)';
    }

    tagElementAsSwapTarget(frBlock.el, attrs, classes);
  });

  // Ensure all links on the French side are formatted as root-relative
  doc.body.querySelectorAll('a[href]').forEach((a) => {
    const rawHref = a.getAttribute('href');
    if (rawHref && !isFragmentHref(rawHref)) {
      a.setAttribute('href', formatFrenchRootRelativeLink(rawHref));
    }
  });

    // Clean any redundant <strong> tags inside <th> header cells and <caption>s
    cleanThTags(doc.body);
    cleanCaptionTags(doc.body);
  doc.body.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));

  const isLight = state.theme === 'light';
  const bodyClass = [
    isLight ? 'gc-light-mode' : '',
    state.focusMode ? 'mode-focus' : '',
    state.blurMode ? 'mode-blur' : '',
    state.showHighlightBox === false ? 'hide-highlight' : '',
  ].filter(Boolean).join(' ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${HIGHLIGHT_CSS}
${FR_SCROLLBAR_CSS}</style>
</head>
<body class="${bodyClass}">
  ${cleanFrenchHtmlPostProcess(doc.body.innerHTML)}
  <script>
    ${IMAGE_PLACEHOLDER_SCRIPT}
    ${DETAILS_TOGGLE_SCRIPT('fr')}
    // Preview-only: links highlight the block but never navigate away / break srcdoc.
    document.addEventListener('click', (e) => {
      const link = e.target.closest ? e.target.closest('a[href]') : null;
      if (link) {
        e.preventDefault();
      }
    }, true);
    document.addEventListener('click', (e) => {
      // Footnote citations & return links (WET #fn1 plus Word #_ftn1 /
      // #ftn1 / #footnote-1, returns #fn1-rf / #_ftnref1). Return clicks
      // scroll back to the citation (not to their own block).
      const postJump = (el) => {
        try {
          const scope = el && el.closest ? (el.closest('[data-swap-index], [data-fr-index]') || el) : el;
          const rawIdx = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const frAttr = scope && scope.getAttribute ? scope.getAttribute('data-fr-index') : null;
          const idx = rawIdx !== null && rawIdx !== undefined ? parseInt(rawIdx, 10) : NaN;
          const frIdx = frAttr !== null && frAttr !== undefined ? parseInt(frAttr, 10) : NaN;
          if (!isNaN(idx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', index: idx, frIndex: !isNaN(frIdx) ? frIdx : undefined }, '*');
            return true;
          } else if (!isNaN(frIdx)) {
            window.parent.postMessage({ type: 'symmetra-jump', side: 'fr', frIndex: frIdx }, '*');
            return true;
          }
        } catch (_) {}
        return false;
      };
      // Footnote jumps teleport: parent places everything synchronously and
      // centers the exact element — no easing loops, no settle timeouts, no
      // native smooth scrolls fighting the placement. Posts whenever there is
      // anything to place (indices and/or element id).
      const postJumpFn = (el, targetId) => {
        try {
          // Ancestor first (citations inside tagged blocks), then the first
          // tagged descendant (footnote DDs are untagged containers whose
          // inner paragraphs carry the indices).
          const scope = el && el.closest ? (el.closest('[data-swap-index], [data-fr-index]') || el.querySelector('[data-swap-index], [data-fr-index]') || el) : el;
          const rawIdx = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const frAttr = scope && scope.getAttribute ? scope.getAttribute('data-fr-index') : null;
          const idx = rawIdx !== null && rawIdx !== undefined ? parseInt(rawIdx, 10) : NaN;
          const frIdx = frAttr !== null && frAttr !== undefined ? parseInt(frAttr, 10) : NaN;
          if (!isNaN(idx) || !isNaN(frIdx) || targetId) {
            window.parent.postMessage({ type: 'symmetra-fn-jump', side: 'fr', index: !isNaN(idx) ? idx : null, frIndex: !isNaN(frIdx) ? frIdx : null, targetId: targetId || null }, '*');
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
      const target = e.target.closest('[data-swap-index], [data-fr-index]');
      if (target) {
        postJump(target);
      }
    });

    document.addEventListener('input', (e) => {
      const target = e.target.closest('[data-swap-index], [data-fr-index]');
      if (target) {
        const enIdx = target.hasAttribute('data-en-index') || target.hasAttribute('data-swap-index') ? parseInt(target.getAttribute('data-en-index') || target.getAttribute('data-swap-index'), 10) : null;
        const frIdx = target.hasAttribute('data-fr-index') ? parseInt(target.getAttribute('data-fr-index'), 10) : null;
        const currentText = target.innerText ? target.innerText.trim() : (target.textContent || '').trim();
        if (target.classList.contains('gc-swap-missing') && currentText && !currentText.includes('TRANSLATION MISSING') && !currentText.includes('TRADUCTION MANQUANTE')) {
          target.classList.remove('gc-swap-missing');
          target.removeAttribute('title');
        }
        window.parent.postMessage({
          type: 'frEdit',
          enIndex: !isNaN(enIdx) ? enIdx : null,
          frIndex: !isNaN(frIdx) ? frIdx : null,
          text: currentText,
        }, '*');
      }
    });

    ${CONTEXT_MENU_INJECTED_SCRIPT('fr')}
  </script>
</body>
</html>`;
}

export {
  buildFrenchFrameSource,
  buildFrenchFrameSourceFromHtml,
};
