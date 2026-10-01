// Auto-generated imports
import {
  computeAlignment,
} from './alignment-compute.js';
import {
  escapeHtml,
  escapeRegExp,
  generateFrenchHtmlSource,
  updateFrCodeView,
} from './code-view.js';
import {
  COMMON_EN_TERMS,
} from './constants.js';
import {
  frCodeEditor,
} from './dom-refs.js';
import {
  renderDrawerBody,
} from './drawer.js';
import {
  applyFrenchTypographyRules,
  cleanFrenchUrlAndEntities,
} from './french-utils.js';
import {
  state,
} from './state.ts';
import {
  pushUndoState,
} from './undo.js';


function findFrenchTypographyIssues(text) {
  if (!text) return [];
  const clean = cleanFrenchUrlAndEntities(text);
  const issues = [];
  
  // 1. Missing non-breaking space before : ; ! ?
  const punctRegex = /([^\s\u00A0:;?!])[ \t]*([:;?!])/g;
  let match;
  while ((match = punctRegex.exec(clean)) !== null) {
    issues.push({
      type: 'punctuation',
      label: `Missing insécable before '${match[2]}'`,
      found: match[0],
      fix: `${match[1]}\u00A0${match[2]}`
    });
  }

  // 2. Missing non-breaking space inside guillemets « ... »
  const openGuill = /«(?!\u00A0)/g;
  while ((match = openGuill.exec(clean)) !== null) {
    issues.push({
      type: 'guillemet-open',
      label: 'Missing insécable after «',
      found: '«',
      fix: '«\u00A0'
    });
  }

  const closeGuill = /(?<!\u00A0)»/g;
  while ((match = closeGuill.exec(clean)) !== null) {
    issues.push({
      type: 'guillemet-close',
      label: 'Missing insécable before »',
      found: '»',
      fix: '\u00A0»'
    });
  }

  // 3. Currency symbol without non-breaking space (e.g. "10 $" or "10$")
  const currRegex = /(\d)(?!\u00A0)[ \t]*([$€])/g;
  while ((match = currRegex.exec(clean)) !== null) {
    issues.push({
      type: 'currency',
      label: `Missing insécable before currency '${match[2]}'`,
      found: match[0],
      fix: `${match[1]}\u00A0${match[2]}`
    });
  }

  // 4. Percentage symbol without non-breaking space (e.g. "10 %" or "10%")
  const pctRegex = /(\d)(?!\u00A0)[ \t]*%/g;
  while ((match = pctRegex.exec(clean)) !== null) {
    issues.push({
      type: 'percent',
      label: `Missing insécable before '%'`,
      found: match[0],
      fix: `${match[1]}\u00A0%`
    });
  }

  // 5. Units & Time / Quantity without non-breaking space (e.g. "7 jours", "10 km", "5 ans")
  const unitRegex = /(\d)(?!\u00A0)[ \t]+(km|kg|mg|g|m|cm|mm|ha|t|l|ml|h|min|s|ans|an|jours|jour|mois|semaines|semaine|pages|page|p\.|art\.|no|n°|nº|§)\b/gi;
  while ((match = unitRegex.exec(clean)) !== null) {
    issues.push({
      type: 'unit',
      label: `Missing insécable before unit '${match[2]}'`,
      found: match[0],
      fix: `${match[1]}\u00A0${match[2]}`
    });
  }

  return issues;
}

function getTypoSnippetWindow(text, max = 150) {
  if (!text) return '';
  const clean = text.replace(/[ \t\r\n]+/g, ' ').trim();
  if (clean.length <= max) return clean;

  const match = clean.match(/[:;?!«»$%]|\d\s*(?:km|kg|mg|g|m|cm|mm|ha|t|l|ml|h|min|s|ans|an|jours|jour|mois|semaines|semaine|pages|page|p\.|art\.|no|n°|nº|§)\b/i);
  if (!match || match.index === undefined) {
    return clean.slice(0, max) + '…';
  }

  const matchIdx = match.index;
  const half = Math.floor(max / 2);
  let start = Math.max(0, matchIdx - half);
  let end = Math.min(clean.length, start + max);

  if (end - start < max) {
    start = Math.max(0, end - max);
  }

  let res = clean.slice(start, end);
  if (start > 0) res = '…' + res;
  if (end < clean.length) res = res + '…';
  return res;
}

function highlightTypoOriginal(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);

  // 1. Punctuation missing non-breaking space (e.g. " :", ":", " ;", ";", " !", " ?", etc.)
  escaped = escaped.replace(/(?<=[^\s\u00A0:;?!/&])([ \t]*)([:;?!])/g, (match, p1, p2) => {
    return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space (&nbsp;)">${p1 || ''}${p2}</span>`;
  });

  // 2. Guillemets without non-breaking space
  escaped = escaped.replace(/«([ \t]*)/g, (match, p1) => {
    if (!p1.includes('\u00A0')) {
      return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space after «">«${p1}</span>`;
    }
    return match;
  });
  escaped = escaped.replace(/([ \t]*)»/g, (match, p1) => {
    if (!p1.includes('\u00A0')) {
      return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space before »">${p1}»</span>`;
    }
    return match;
  });

  // 3. Currency symbol (e.g. "10 $" or "10$")
  escaped = escaped.replace(/(\d)([ \t]*)([$€])/g, (match, p1, p2, p3) => {
    return `${p1}<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space before currency">${p2 || ''}${p3}</span>`;
  });

  // 4. Percentage symbol (e.g. "10 %" or "10%")
  escaped = escaped.replace(/(\d)([ \t]*)(%)/g, (match, p1, p2, p3) => {
    return `${p1}<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space before %">${p2 || ''}${p3}</span>`;
  });

  // 5. Units (e.g. "10 km", "5 ans", "7 jours")
  escaped = escaped.replace(/(\d)([ \t]+)(km|kg|mg|g|m|cm|mm|ha|t|l|ml|h|min|s|ans|an|jours|jour|mois|semaines|semaine|pages|page|p\.|art\.|no|n°|nº|§)\b/gi, (match, p1, p2, p3) => {
    return `${p1}<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center" title="Missing non-breaking space before unit">${p2}${p3}</span>`;
  });

  return escaped;
}

function computeTypographyAudit() {
  const list = [];
  state.frBlocks.forEach((b, frIdx) => {
    const issues = findFrenchTypographyIssues(b.text);
    const fixedText = applyFrenchTypographyRules(b.text);
    if (issues.length > 0 || fixedText !== b.text) {
      list.push({
        frIndex: frIdx,
        originalText: b.text,
        fixedText,
        issues,
      });
    }
  });
  return list;
}

function fixFrenchTypographyBlock(frIdx) {
  if (!state.frBlocks[frIdx]) return;
  pushUndoState(`Fix spacing for block #${frIdx + 1}`);
  state.frBlocks[frIdx].text = applyFrenchTypographyRules(state.frBlocks[frIdx].text);
  computeAlignment();
  if (state.frViewMode !== 'visual' && frCodeEditor) {
    frCodeEditor.value = generateFrenchHtmlSource();
    updateFrCodeView();
  }
  renderDrawerBody('typography');
}

function fixAllFrenchTypography() {
  const currentActiveBlock = state.activePreviewBlock;
  pushUndoState('Fix French spacing across all blocks');
  let count = 0;
  state.frBlocks.forEach((b) => {
    const fixed = applyFrenchTypographyRules(b.text);
    if (fixed !== b.text) {
      b.text = fixed;
      count++;
    }
  });
  computeAlignment(currentActiveBlock);
  if (state.frViewMode !== 'visual' && frCodeEditor) {
    frCodeEditor.value = generateFrenchHtmlSource();
    updateFrCodeView();
  }
  renderDrawerBody('typography');
}

// French diacritics / stopwords: quoted text carrying these is likely French,
// not an English term needing lang="en" — unless the same quote exists in English.
const FR_QUOTE_MARKERS = /[éèêëàâäçùûüîïôöœæ«»…]/;
const FR_QUOTE_STOPWORDS = /\b(le|la|les|de|des|du|et|est|sont|une|un|dans|pour|que|qui|pas|plus|cette|ces|aux|au|sur|par|avec|sans|sous|entre|comme|tout|tous|toute|toutes|votre|vos|notre|nos|leur|leurs|nous|vous|ils|elles|mais|ou|donc|car|ni|ce|cet|il|elle|on|ne|se|pas)\b/i;

function detectEnglishTerms(frBlock, frIdx = null) {
  const text = frBlock.text || '';
  const detected = [];

  let pairedEnText = '';
  if (frIdx !== null && state.alignPairs) {
    const pair = state.alignPairs.find((p) => p.frIndex === frIdx && !p.skip);
    if (pair && pair.enIndex !== null && state.enBlocks[pair.enIndex]) {
      pairedEnText = state.enBlocks[pair.enIndex].text || '';
    }
  }

  COMMON_EN_TERMS.forEach((term) => {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
    if (regex.test(text)) {
      const alreadyTagged = (frBlock.spans || []).some(
        (s) => s.lang === 'en' && s.text.toLowerCase() === term.toLowerCase()
      );
      if (!alreadyTagged) {
        detected.push({
          term,
          type: 'acronym_or_term',
        });
      }
    }
  });

  // Also detect quoted English phrases: e.g. "..."
  const quoteRegex = /"([^"]{3,60})"/g;
  let qMatch;
  while ((qMatch = quoteRegex.exec(text)) !== null) {
    const inside = qMatch[1].trim();
    if (/^[A-Za-z0-9\s.,'-]+$/.test(inside) && !COMMON_EN_TERMS.includes(inside)) {
      // Quoted French is not an English term: suppress when the quote carries
      // French markers, unless the identical quote exists in the English source
      // (then it is a shared term that genuinely needs lang="en").
      if ((FR_QUOTE_MARKERS.test(inside) || FR_QUOTE_STOPWORDS.test(inside)) && !pairedEnText.includes(inside)) {
        continue;
      }
      const alreadyTagged = (frBlock.spans || []).some(
        (s) => s.lang === 'en' && s.text.toLowerCase() === inside.toLowerCase()
      );
      if (!alreadyTagged) {
        detected.push({
          term: inside,
          type: 'english_quote',
        });
      }
    }
  }

  return detected;
}

function computeLangEnAudit() {
  const results = [];
  state.frBlocks.forEach((b, frIdx) => {
    const terms = detectEnglishTerms(b, frIdx);
    if (terms.length > 0) {
      results.push({
        frIndex: frIdx,
        block: b,
        terms,
      });
    }
  });
  return results;
}

function tagEnglishTermInBlock(frIdx, term) {
  const currentActiveBlock = state.activePreviewBlock;
  const block = state.frBlocks[frIdx];
  if (!block) return;
  pushUndoState(`Tag <span lang="en"> for "${term}"`);
  if (!block.spans) block.spans = [];
  block.spans.push({
    type: 'span',
    lang: 'en',
    text: term,
  });
  computeAlignment(currentActiveBlock);
  renderDrawerBody('lang-en');
}

function tagAllEnglishTerms() {
  const currentActiveBlock = state.activePreviewBlock;
  const audit = computeLangEnAudit();
  pushUndoState('Tag all English terms');
  let count = 0;
  audit.forEach(({ frIndex, terms }) => {
    const block = state.frBlocks[frIndex];
    if (!block.spans) block.spans = [];
    terms.forEach(({ term }) => {
      block.spans.push({
        type: 'span',
        lang: 'en',
        text: term,
      });
      count++;
    });
  });
  computeAlignment(currentActiveBlock);
  renderDrawerBody('lang-en');
}

export {
  computeLangEnAudit,
  computeTypographyAudit,
  detectEnglishTerms,
  findFrenchTypographyIssues,
  fixAllFrenchTypography,
  fixFrenchTypographyBlock,
  getTypoSnippetWindow,
  highlightTypoOriginal,
  tagAllEnglishTerms,
  tagEnglishTermInBlock,
};

