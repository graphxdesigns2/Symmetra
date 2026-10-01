// Auto-generated imports
import {
  buildFootnoteInventory,
  collectLeafBlocks,
  convertFrenchBlockFootnotes,
  isFootnoteCitationHref,
  isVisibleFootnoteCitation,
  isFootnoteReturnHref,
  resolveFrenchTarget,
  verifyFootnotes,
} from './footnotes.js';
import {
  extractBlocks,
} from './block-utils.js';
import {
  convertFrenchImageSrc,
  convertFrenchOrdinalsInHtml,
  synthesizeFrenchSummary,
} from './french-utils.js';
import {
  state,
} from './state.ts';


function processFootnotes(enHtml, frHtml, alignPairs = null) {
  if (!frHtml || typeof frHtml !== 'string') return { html: frHtml || '', warnings: [], problems: [] };
  const trimmedFr = frHtml.trim();
  if (!trimmedFr) return { html: '', warnings: [], problems: [] };

  const isFullDoc = /^<!doctype/i.test(trimmedFr) || /<html[\s>]/i.test(trimmedFr);
  const parser = new DOMParser();
  const frDoc = parser.parseFromString(
    isFullDoc ? trimmedFr : `<html><head></head><body>${trimmedFr}</body></html>`,
    'text/html'
  );

  const warnings = [];
  // Structured twin of `warnings`: every entry says whether it is a
  // recognition finding (binary, evidence-based) or a placement guess
  // (inference on a French string). The QA panel shows the two apart, because
  // only the second can be wrong in a way a reader would notice.
  const footnoteReport = [];
  let problems = [];
  let inv = null;
  let enDoc = null;

  const enSource = enHtml || (typeof state !== 'undefined' ? (state.rawEnHtml || state.enHtml) : '') || '';
  if (enSource) {
    const isEnFull = /^<!doctype/i.test(enSource) || /<html[\s>]/i.test(enSource);
    enDoc = parser.parseFromString(
      isEnFull ? enSource : `<html><head></head><body>${enSource}</body></html>`,
      'text/html'
    );
    inv = buildFootnoteInventory(enDoc, extractBlocks);
    const frBlocks = collectLeafBlocks(frDoc.body, extractBlocks);
    const pairs = alignPairs || (typeof state !== 'undefined' ? state.alignPairs : null);
    const sameShape = inv.blockCount > 0 && inv.blockCount === frBlocks.length;

    inv.refsByBlock.forEach((enRefs, enBlockIdx) => {
      const pair = (pairs && pairs.length > 0)
        ? pairs.find((p) => p.enIndex === enBlockIdx && !p.skip)
        : null;
      const targetFrBlock = resolveFrenchTarget(frDoc, frBlocks, enBlockIdx, pair, sameShape);

      if (targetFrBlock) {
        const res = convertFrenchBlockFootnotes(targetFrBlock, enRefs, frDoc, { allowBareSup: inv.allowBareSup });
        warnings.push(...res.warnings);
        const frIndex = pair && pair.frIndex !== null ? pair.frIndex : null;
        (res.report || []).forEach((entry) => {
          footnoteReport.push({ ...entry, enIndex: enBlockIdx, frIndex });
        });
      } else {
        const detail = `English block #${enBlockIdx + 1} carries ${enRefs.length} footnote${enRefs.length === 1 ? '' : 's'} but has no aligned French counterpart, so none could be placed`;
        warnings.push(detail);
        footnoteReport.push({
          kind: 'recognition',
          num: enRefs.map((r) => r.num).join(', '),
          detail,
          enIndex: enBlockIdx,
          frIndex: null,
        });
      }
    });
  }

  // 1. Process Footnotes headings (e.g. <h2 id="fn">Footnotes</h2> or <h2>Footnotes</h2>)
  frDoc.body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const text = h.textContent.trim();
    if (/^Footnotes?$/i.test(text)) {
      h.textContent = 'Notes de bas de page';
      if (!h.id && h.closest('.wb-fnote, [role="note"]')) {
        h.id = 'fn';
      }
    }
  });

  // 2. Process Definition Terms in footnote lists (<dt>Footnote 1</dt> or <dt><span class="wb-inv">Footnote </span>1</dt>)
  frDoc.body.querySelectorAll('dt').forEach((dt) => {
    const text = dt.textContent.trim();
    const dtMatch = text.match(/^(?:Footnote|Note\s+de\s+bas\s+de\s+page)\s*([a-zA-Z0-9_-]+)/i);
    if (dtMatch) {
      const fnNum = dtMatch[1];
      dt.textContent = `Note de bas de page ${fnNum}`;
    }
  });

  // 3. Process Return to footnote links (<a class="fn-rtn" href="#fn1-rf">...)
  frDoc.body.querySelectorAll('a.fn-rtn, a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!a.classList.contains('fn-rtn') && !isFootnoteReturnHref(href)) return;
    const rfMatch = href.match(/#fn([a-zA-Z0-9_-]+)-rf/i);
    const fnNum = rfMatch
      ? rfMatch[1]
      : (a.textContent.match(/\b([a-zA-Z0-9_-]+)\b/) ? a.textContent.match(/\b([a-zA-Z0-9_-]+)\b/)[1] : '1');

    // Check if it already has the exact French return label
    const invSpan = a.querySelector('.wb-inv');
    if (invSpan && /Retour/i.test(invSpan.textContent)) return;

    a.textContent = '';
    a.classList.add('fn-rtn');
    if (rfMatch) {
      a.setAttribute('href', `#fn${fnNum}-rf`);
    }
    const span = frDoc.createElement('span');
    span.className = 'wb-inv';
    span.textContent = 'Retour à la référence de la note de bas de page ';
    a.appendChild(span);
    a.appendChild(frDoc.createTextNode(fnNum));
  });

  // 4. Ensure any remaining in-text footnote links meet WET standard
  frDoc.body.querySelectorAll('sup a.fn-lnk, a.fn-lnk, sup a, a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (a.classList.contains('fn-rtn') || a.closest('.fn-rtn') || isFootnoteReturnHref(href)) return;
    const isFnLink = a.classList.contains('fn-lnk') || isFootnoteCitationHref(href) || isVisibleFootnoteCitation(a.closest('sup'), false);
    if (!isFnLink) return;

    const fnMatch = href.match(/#(?:fn[-_]?|_ftn|ftn)([a-zA-Z0-9_-]+)/i) || a.textContent.match(/\b(\d+)\b/);
    const fnNum = fnMatch ? fnMatch[1] : (a.textContent.match(/\b([a-zA-Z0-9_-]+)\b/) ? a.textContent.match(/\b([a-zA-Z0-9_-]+)\b/)[1] : '1');

    // Ensure link has correct classes and href. The title is cleared rather than
    // set: a title carried over from the English source would leave a French
    // link advertising an English label, and the .wb-inv span is the accessible
    // name. Target shape:
    //   <sup><a class="fn-lnk" href="#fn1"><span class="wb-inv">Note de bas de page </span>1</a></sup>
    a.classList.add('fn-lnk');
    a.setAttribute('href', `#fn${fnNum}`);
    a.removeAttribute('title');

    // Ensure inside a <sup> wrapper
    let sup = a.closest('sup');
    if (!sup) {
      sup = frDoc.createElement('sup');
      a.parentNode.insertBefore(sup, a);
      sup.appendChild(a);
    }

    // Standardize inner content to: <span class="wb-inv">Note de bas de page </span>N
    const invSpan = a.querySelector('.wb-inv');
    if (!invSpan || !/Note\s+de\s+bas\s+de\s+page/i.test(invSpan.textContent)) {
      a.textContent = '';
      const span = frDoc.createElement('span');
      span.className = 'wb-inv';
      span.textContent = 'Note de bas de page ';
      a.appendChild(span);
      a.appendChild(frDoc.createTextNode(fnNum));
    }
  });

  // Verification runs on the FINISHED French document. It used to run before the
  // normalisation passes above, which meant it audited a half-converted document
  // — return links had not yet been reclassified, so the counts it produced were
  // not the counts the reader sees.
  //
  // Recognition is the reliable half: binary, evidence-based, no interpretation.
  // Placement is the guessing half, and it is logged separately so the QA panel
  // can show it as something a human still has to confirm.
  if (enSource && enDoc && inv) {
    problems = verifyFootnotes(enDoc, frDoc, inv);
  }
  // Fold in the guesses the generation pass had to make while it still only had
  // a flat French string to work with, then clear the draft so a regeneration
  // does not accumulate duplicates.
  const draft = (typeof state !== 'undefined' && state.footnotePlacementDraft) || [];
  if (draft.length) {
    const known = new Set(footnoteReport.map((e) => `${e.kind}|${e.num}|${e.detail}`));
    draft.forEach((entry) => {
      const key = `${entry.kind}|${entry.num}|${entry.detail}`;
      if (!known.has(key)) footnoteReport.push(entry);
    });
    if (typeof state !== 'undefined') state.footnotePlacementDraft = [];
  }
  // Published unconditionally, so the panel never shows the previous run's
  // guesses against the current document.
  if (typeof state !== 'undefined') {
    state.footnoteProblems = problems;
    state.footnoteWarnings = warnings;
    state.footnoteReport = footnoteReport;
  }

  if (isFullDoc) {
    return {
      html: frDoc.documentElement ? frDoc.documentElement.outerHTML : frDoc.body.innerHTML,
      warnings,
      problems,
      report: footnoteReport,
    };
  }
  return {
    html: frDoc.body.innerHTML,
    warnings,
    problems,
    report: footnoteReport,
  };
}

function convertFootnotesToFrenchInHtml(html, enHtml = null) {
  const res = processFootnotes(enHtml, html);
  return res.html;
}

function cleanFrenchHtmlPostProcess(html, enHtml = (typeof state !== 'undefined' ? (state.rawEnHtml || state.enHtml) : '')) {
  if (!html) return html;
  let res = convertFootnotesToFrenchInHtml(html, enHtml);
  // Ensure French ordinals like 1er, 1ers, 1re, 1res have superscripted suffixes
  res = convertFrenchOrdinalsInHtml(res);
  // Ensure no <strong> or <b> tags inside <th> tags in HTML string output
  res = res.replace(/<th(\s+[^>]*)?>([\s\S]*?)<\/th>/gi, (match, thAttrs, inner) => {
    const cleanedInner = inner.replace(/<\/?(strong|b)(\s+[^>]*)?>/gi, '');
    return `<th${thAttrs || ''}>${cleanedInner}</th>`;
  });
  // Normalize any summary text equivalent phrases in generated HTML
  res = res.replace(/<summary(\s+[^>]*)?>([\s\S]*?)<\/summary>/gi, (match, sumAttrs, inner) => {
    const cleanedInner = synthesizeFrenchSummary(inner);
    return `<summary${sumAttrs || ''}>${cleanedInner}</summary>`;
  });
  // Update img src attributes in French HTML output (e.g. -en.png -> -fr.png)
  res = res.replace(/<img(\s+[^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    const newSrc = convertFrenchImageSrc(src);
    return `<img${before}src="${newSrc}"${after}>`;
  });
  // Ensure images without English alt or auto-generated alt remain alt="" in French output
  res = res.replace(/<img([^>]*?)\balt=["'](?:\[TRANSLATION\s+MISSING\s*:\s*\[?Image[^\]]*\]?\]?|\[Image[^\]]*\])["']([^>]*>)/gi, '<img$1alt=""$2');
  // Strip any accidental [TRANSLATION MISSING] wrappers around PDF side panel tags
  res = res.replace(/\[TRANSLATION\s+MISSING\s*:\s*(<a\s+[^>]*href=["'][^"']*\.pdf["'][^>]*>[\s\S]*?<\/a>(?:\s*<br\s*\/?>\s*)*\s*\([^)]+\))\]/gi, '$1');
  res = res.replace(/\[TRANSLATION\s+MISSING\s*:\s*(<strong>\s*(?:Organisation|Organization)\s*[:：]?\s*<\/strong>[\s\S]*?)\]/gi, '$1');
  res = res.replace(/\[TRANSLATION\s+MISSING\s*:\s*(<strong>\s*(?:Date\s+de\s+publication|Published)\s*[:：]?\s*<\/strong>[\s\S]*?)\]/gi, '$1');
  // Convert non-breaking space characters (\u00A0) to explicit &nbsp; in generated HTML
  res = res.replace(/\u00A0/g, '&nbsp;');
  return res;
}

export {
  cleanFrenchHtmlPostProcess,
  convertFootnotesToFrenchInHtml,
  processFootnotes,
};
