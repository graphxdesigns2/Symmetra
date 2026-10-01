// src/modules/alignment.js
// Heuristic Alignment & Bilingual Matching Engine

import {
  isFootnoteHeadingBlock,
  isFootnoteContentBlock,
  extractFootnoteNumber,
} from './footnotes.js';

export function isHeadingTag(tag) {
  return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes((tag || '').toLowerCase());
}

export function isHeadingLikeBlock(block) {
  if (!block) return false;
  if (isHeadingTag(block.tag) || block.tag === 'summary') return true;
  if (block.el && typeof block.el.querySelector === 'function') {
    const strongEl = block.el.querySelector('strong, b, h1, h2, h3, h4, h5, h6');
    if (strongEl) {
      const strongText = (strongEl.textContent || '').trim();
      const allText = (block.text || '').trim();
      if (strongText && Math.abs(strongText.length - allText.length) <= 8) {
        return true;
      }
    }
  }
  const txt = (block.text || '').trim();
  if (
    /^(?:Note\s+de\s+bas\s+de\s+page|Footnotes?|References?|R[ée]f[ée]rences?|Tableau|Table|Figure|Graphique|Annexe|Appendix|Section|Partie|Part|Step|Étape)\b/i.test(txt) &&
    txt.length < 80
  ) {
    return true;
  }
  return false;
}

export function isTextEquivalentSummaryText(text) {
  if (!text) return false;
  const t = text.trim();
  return /(?:Text(?:\s+|-)?equivalent|Long\s+description|Text\s+description|Table\s+equivalent|Alternative\s+text|Text\s+version|Équivalent\s+textuel|Équivalence\s+textuelle|Description\s+textuelle|Version\s+textuelle|Tableau\s+équivalent|Texte\s+équivalent|Description\s+longue)/i.test(t);
}

export function isTextEquivalentSummaryBlock(block) {
  if (!block) return false;
  return isTextEquivalentSummaryText(block.text);
}

export function isFigcaptionBlock(block) {
  if (!block) return false;
  if (block.tag === 'figcaption') return true;
  if (block.el && block.el.tagName && block.el.tagName.toLowerCase() === 'figcaption') return true;
  const t = (block.text || '').trim();
  if (isTextEquivalentSummaryText(t)) return false;
  return (
    /^(?:Figure|Graphique|Chart|Schéma|Diagram|Illustration)\s+[a-zA-Z0-9_-]+\s*[\-–—:：.]/i.test(t) ||
    /^(?:Figure|Graphique|Chart|Schéma|Diagram|Illustration)\s+[a-zA-Z0-9_-]+(?:\s+|$)/i.test(t)
  );
}

export function isTableCaptionBlock(block) {
  if (!block) return false;
  const tag = (block.tag || '').toLowerCase();
  if (tag === 'caption') return true;
  if (block.el && typeof block.el === 'object') {
    const elTag = block.el.tagName ? block.el.tagName.toLowerCase() : '';
    if (elTag === 'caption') return true;
    if (typeof block.el.closest === 'function' && block.el.closest('caption')) return true;
    if (block.el.classList && (block.el.classList.contains('caption') || block.el.classList.contains('table-caption'))) return true;
    let next = block.el.nextElementSibling;
    while (next && next.textContent.trim() === '' && !['table', 'img'].includes(next.tagName ? next.tagName.toLowerCase() : '')) {
      next = next.nextElementSibling;
    }
    if (next && next.tagName && next.tagName.toLowerCase() === 'table') {
      return true;
    }
  }
  const t = (block.text || '').trim();
  if (isTextEquivalentSummaryText(t)) return false;
  return (
    /^(?:Tableau|Table)\s+(?:[a-zA-Z0-9_-]+|[IVXLCDM]+)\s*[\-–—:：.]/i.test(t) ||
    /^(?:Tableau|Table)\s+(?:[a-zA-Z0-9_-]+|[IVXLCDM]+)(?:\s+|$)/i.test(t)
  );
}

export function extractSectionIdentifier(text, tag = '') {
  if (!text) return null;
  const t = text.trim();
  const isSummary = tag === 'summary' || isTextEquivalentSummaryText(t);
  const m = t.match(/^(?:Annexe|Appendix|Tableau|Table|Figure|Section|Partie|Part|Chapitre|Chapter|Étape|Step)\s+([a-zA-Z0-9_-]+)/i);
  if (m) {
    const rawType = m[0].split(/\s+/)[0].toLowerCase();
    let normType = 'section';
    if (/annex|appendix/i.test(rawType)) normType = 'appendix';
    else if (/table/i.test(rawType)) normType = 'table';
    else if (/figure/i.test(rawType)) normType = isSummary ? 'figure_summary' : 'figure';
    else if (/part/i.test(rawType)) normType = 'part';
    else if (/chap/i.test(rawType)) normType = 'chapter';
    else if (/step|tape/i.test(rawType)) normType = 'step';
    return `${normType}:${m[1].toLowerCase()}`;
  }
  if (isSummary) {
    return 'figure_summary:generic';
  }
  const numPrefixMatch = t.match(/^(\d+(?:\.\d+)*|[a-zA-Z]\))\s+/);
  if (numPrefixMatch) {
    return `num:${numPrefixMatch[1].toLowerCase()}`;
  }
  return null;
}

export function isPdfDownloadText(text) {
  if (!text) return false;
  const t = text.trim();
  return (
    /(?:Download\s+in\s+PDF\s+format|Télécharger\s+en\s+format\s+PDF|Download\s+PDF|Télécharger\s+le\s+PDF|Format\s+PDF|PDF\s+format)/i.test(t) ||
    (/(?:MB|KB|GB|Mo|Ko|Go|pages)/i.test(t) && /\d+/.test(t) && /(?:PDF|format|télécharger|download)/i.test(t))
  );
}

export function isPdfPublicationMetadataText(text) {
  if (!text) return false;
  const t = text.trim();
  return /^(?:Organization|Organisation|Published|Date\s+de\s+publication|Publié|Cat\.|N°\s*de\s*cat\.|Catalogue|ISBN|ISSN|Author|Auteur|Updated|Date\s+de\s+modification|Mis\s+à\s+jour|Prepared\s+by|Préparé\s+par)\s*[:：]/i.test(t);
}

export function getPdfMetaFieldType(text) {
  if (!text) return null;
  const t = text.trim();
  if (/^(?:Organization|Organisation)\s*[:：]/i.test(t)) return 'organization';
  if (/^(?:Published|Date\s+de\s+publication|Publié)\s*[:：]/i.test(t)) return 'published';
  if (/^(?:Cat\.|N°\s*de\s*cat\.|Catalogue)\s*[:：]/i.test(t)) return 'cat';
  if (/^ISBN\s*[:：]/i.test(t)) return 'isbn';
  if (/^ISSN\s*[:：]/i.test(t)) return 'issn';
  if (/^(?:Updated|Date\s+de\s+modification|Mis\s+à\s+jour)\s*[:：]/i.test(t)) return 'updated';
  if (/^(?:Author|Auteur|Prepared\s+by|Préparé\s+par)\s*[:：]/i.test(t)) return 'author';
  if (isPdfDownloadText(t)) return 'download';
  return null;
}

export function isPdfSidePanelElement(el) {
  if (!el || !el.tagName || typeof el.closest !== 'function') return false;
  const tag = el.tagName.toLowerCase();
  if (['body', 'html', 'main', 'article', 'section'].includes(tag)) return false;

  // gc-stp-stp step cards / TOC list-group cards reuse .col-md-4 grid classes —
  // they are main content, never a PDF publication side panel.
  if (typeof el.closest === 'function' && el.closest('.gc-stp-stp, ul.toc, .list-group-item')) {
    if (!el.closest('aside, .well, .pull-right')) return false;
  }

  const dedicatedContainer = el.closest('.col-md-4, .col-sm-4, .col-lg-4, .pull-right, aside, .well');
  if (dedicatedContainer) {
    const isPull = dedicatedContainer.classList && dedicatedContainer.classList.contains('pull-right');
    const hasWell = dedicatedContainer.classList && dedicatedContainer.classList.contains('well');
    const isAside = (dedicatedContainer.tagName || '').toLowerCase() === 'aside';
    if (isPull || isAside) return true;
    // A .well is only a PDF publication panel when it actually holds download
    // content (figure/.pdf link, metadata). A well with plain prose is a normal
    // translatable callout — its Word translation must not be skipped.
    if (hasWell) {
      try {
        const hasPdfLink = Boolean(dedicatedContainer.querySelector && dedicatedContainer.querySelector('a[href*=".pdf"], figure'));
        const txt = (dedicatedContainer.textContent || '');
        const hasPdfMeta = /download\s+in\s+pdf|télécharger\s+en\s+format\s+pdf|organization\s*:|organisation\s*:|published\s*:|date\s+de\s+publication|cat(?:alogue)?\s*:|isbn\s*:|issn\s*:/i.test(txt);
        if (hasPdfLink || hasPdfMeta) return true;
      } catch (_) {}
      return false;
    }
    // Bare grid columns are page layout, not PDF panels — only treat as a panel
    // when the container actually holds publication download content.
    try {
      const hasPdfLink = Boolean(dedicatedContainer.querySelector && dedicatedContainer.querySelector('a[href*=".pdf"], figure'));
      const txt = (dedicatedContainer.textContent || '').toLowerCase();
      const hasPdfMeta = /download\s+in\s+pdf|télécharger\s+en\s+format\s+pdf|organization\s*:|organisation\s*:|published\s*:|date\s+de\s+publication|cat(?:alogue)?\s*:|isbn\s*:/i.test(txt);
      if (hasPdfLink && hasPdfMeta) return true;
      if (hasPdfLink && /(\b\d+(?:[.,]\d+)?\s*(?:mb|mo|kb|ko|pages)\b|\.pdf\b)/i.test(txt)) return true;
    } catch (_) {}
  }
  return false;
}

export function normalizeToken(token) {
  return (token || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function extractNumbersAndData(text) {
  if (!text) return new Set();
  const raw = text.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  const set = new Set();
  raw.forEach((r) => {
    const clean = r.replace(',', '.').replace('%', '');
    if (clean) set.add(clean);
  });
  return set;
}

export function extractAcronyms(text) {
  if (!text) return new Set();
  const matches = text.match(/\b[A-Z0-9]{2,6}\b/g) || [];
  return new Set(matches);
}

export const GC_ACRONYM_PAIRS = [
  ['PSD', 'DPS'], ['ASD', 'DAS'], ['HRV', 'VRC'], ['ERV', 'VRE'],
  ['RCMP', 'GRC'], ['CRA', 'ARC'], ['CBSA', 'ASFC'], ['DND', 'MDN'],
  ['PSPC', 'SPAC'], ['PWGSC', 'TPSGC'], ['TBS', 'SCT'], ['ESDC', 'EDSC'],
  ['DFO', 'MPO'], ['NRCAN', 'RNCAN'], ['VAC', 'ACC'], ['WHO', 'OMS'],
  ['UN', 'ONU'], ['NATO', 'OTAN'], ['WTO', 'OMC'], ['IMF', 'FMI'],
  ['EU', 'UE'], ['GDP', 'PIB'], ['NGO', 'ONG'], ['CEO', 'PDG'],
  ['AI', 'IA'], ['IT', 'TI'], ['HR', 'RH'], ['HIV', 'VIH'],
  ['AIDS', 'SIDA'], ['DNA', 'ADN'], ['RNA', 'ARN'], ['PPE', 'EPI'],
  ['GST', 'TPS'], ['HST', 'TVH'], ['PST', 'TVP'], ['QST', 'TVQ'],
  ['SIN', 'NAS'], ['CPP', 'RPC'], ['OAS', 'SV'], ['EI', 'AE'],
  ['CERB', 'PCU'], ['TFSA', 'CELI'], ['RRSP', 'REER'], ['RESP', 'REEE'],
  ['RDSP', 'REEI'], ['RRIF', 'FERR'], ['PRPP', 'RPAC'], ['WHMIS', 'SIMDUT'],
  ['TDG', 'TMD']
];

export function areBilingualAcronyms(ac1, ac2) {
  if (ac1 === ac2) return true;
  if (ac1.length >= 2 && ac1.length <= 4 && ac1.length === ac2.length) {
    const s1 = ac1.split('').sort().join('');
    const s2 = ac2.split('').sort().join('');
    if (s1 === s2) return true;
  }
  return GC_ACRONYM_PAIRS.some(([e, f]) => (ac1 === e && ac2 === f) || (ac1 === f && ac2 === e));
}

export function extractBlockTextFeatures(text) {
  if (!text) {
    return { nums: new Set(), acrs: new Set(), stems4: new Set(), stems5: new Set(), wordCount: 0 };
  }
  const nums = extractNumbersAndData(text);
  const acrs = extractAcronyms(text);
  const words = text.split(/[^a-zA-Z0-9À-ÖØ-öø-ÿ]+/).map(normalizeToken).filter((w) => w.length >= 4);
  const stems4 = new Set(words.map((w) => w.slice(0, 4)));
  const stems5 = new Set(words.map((w) => w.slice(0, 5)));
  return { nums, acrs, stems4, stems5, wordCount: words.length };
}

export function computeBilingualTextSimilarity(enFeat, frFeat, enRel = 0, frRel = 0) {
  if (!enFeat || !frFeat) return 0;
  let bonus = 0;

  // 1. Numbers & Percentages
  if (enFeat.nums.size > 0 && frFeat.nums.size > 0) {
    let sharedNums = 0;
    enFeat.nums.forEach((n) => { if (frFeat.nums.has(n)) sharedNums++; });
    if (sharedNums > 0) {
      bonus += Math.min(6.0, sharedNums * 3.0);
    } else if (enFeat.nums.size >= 2 && frFeat.nums.size >= 2) {
      bonus -= 1.5;
    }
  } else if (enFeat.nums.size >= 2 && frFeat.nums.size === 0) {
    bonus -= 1.0;
  }

  // 2. Acronyms & Initialisms
  if (enFeat.acrs.size > 0 && frFeat.acrs.size > 0) {
    let acrScore = 0;
    enFeat.acrs.forEach((ea) => {
      frFeat.acrs.forEach((fa) => {
        if (areBilingualAcronyms(ea, fa)) acrScore += (ea === fa ? 3.5 : 3.0);
      });
    });
    if (acrScore > 0) {
      bonus += Math.min(6.0, acrScore);
    }
  }

  // 3. Stems and Cognates
  let sharedStems5 = 0;
  enFeat.stems5.forEach((s) => { if (frFeat.stems5.has(s)) sharedStems5++; });
  let sharedStems4 = 0;
  enFeat.stems4.forEach((s) => { if (frFeat.stems4.has(s)) sharedStems4++; });
  if (sharedStems5 > 0 || sharedStems4 > 0) {
    bonus += Math.min(4.0, sharedStems5 * 0.8 + Math.max(0, sharedStems4 - sharedStems5) * 0.4);
  }

  // 4. Length ratio compatibility
  if (enFeat.wordCount >= 4 && frFeat.wordCount >= 4) {
    const ratio = Math.min(enFeat.wordCount, frFeat.wordCount) / Math.max(enFeat.wordCount, frFeat.wordCount);
    bonus += ratio * 1.0;
  } else if (enFeat.wordCount > 20 && frFeat.wordCount < 4) {
    bonus -= 2.0;
  }

  // 5. Positional bias
  bonus += Math.max(0, 0.25 * (1.0 - Math.abs(enRel - frRel)));

  return bonus;
}

export const CANADIAN_GOV_BILINGUAL_TERMS = [
  { en: ['contact information', 'contact info', 'contact us', 'for inquiries', 'general inquiries'], fr: ['coordonnees', 'contactez-nous', 'pour nous joindre', 'renseignements de contact', 'renseignements sur les personnes-ressources', 'demandes de renseignements generaux', 'demandes de renseignements'] },
  { en: ['health canada'], fr: ['sante canada'] },
  { en: ['controlled substances and cannabis branch'], fr: ['direction generale des substances controlees et du cannabis'] },
  { en: ['canadian drug and substances strategy', 'canadian drugs and substances strategy'], fr: ['strategie canadienne sur les drogues et autres substances'] },
  { en: ['horizontal initiative framework'], fr: ["cadre de l'initiative horizontale", 'cadre de l initiative horizontale'] },
  { en: ['horizontal initiative', 'horizontal initiatives'], fr: ['initiative horizontale', 'initiatives horizontales'] },
  { en: ['shared outcome', 'shared outcomes'], fr: ['resultats communs', 'resultat commun'] },
  { en: ['core funding'], fr: ['financement de base'] },
  { en: ['table of contents'], fr: ['table des matieres'] },
  { en: ['executive summary'], fr: ['sommaire', 'resume executif', 'sommaire executif'] },
];

export function matchesCanadianGovBilingualTerm(enRaw, frRaw) {
  if (!enRaw || !frRaw) return false;
  const en = enRaw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fr = frRaw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const entry of CANADIAN_GOV_BILINGUAL_TERMS) {
    const enHit = entry.en.some((e) => en === e || (en.length > 5 && (en.startsWith(e) || e.startsWith(en))));
    const frHit = entry.fr.some((f) => fr === f || (fr.length > 5 && (fr.startsWith(f) || f.startsWith(fr))));
    if (enHit && frHit) return true;
  }
  return false;
}

export function isOmittedEnglishEquivalentBlock(enBlock) {
  if (!enBlock) return false;
  const rawText = (enBlock.text || '').trim();
  if (!rawText) return false;
  if (rawText.length > 60 || rawText.split(/\s+/).length > 7) return false;
  if (enBlock.el && enBlock.el.classList && typeof enBlock.el.classList.contains === 'function' && (enBlock.el.classList.contains('well') || enBlock.el.classList.contains('alert'))) return false;

  const normText = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const englishEquivalents = [
    'health canada',
    'public health agency of canada',
    'government of canada',
    'canada.ca',
    'canada',
  ];
  if (englishEquivalents.some((eq) => normText === eq || (normText.length <= 40 && (normText.startsWith(eq) || eq.startsWith(normText))))) {
    return true;
  }
  if (enBlock.el && (
    (enBlock.el.classList && typeof enBlock.el.classList.contains === 'function' && enBlock.el.classList.contains('gc-br-line')) ||
    (typeof enBlock.el.closest === 'function' && enBlock.el.closest('[data-gc-br-wrapped]'))
  )) {
    if (englishEquivalents.some((eq) => normText === eq || (normText.length <= 40 && normText.includes(eq)))) {
      return true;
    }
  }
  return false;
}

export function isSingleCellCalloutTable(el) {
  if (!el || typeof el.closest !== 'function') return false;
  const table = el.closest('table');
  if (!table || typeof table.querySelectorAll !== 'function') return false;
  const allCells = table.querySelectorAll('td, th');
  return allCells.length === 1;
}

export function isCalloutBlock(b) {
  if (!b || !b.el) return false;
  const el = b.el;
  const inWellOrAlert = Boolean(el.closest && typeof el.closest === 'function' && el.closest('.well, .alert, .panel, blockquote, aside'));
  return inWellOrAlert || Boolean(el.classList && typeof el.classList.contains === 'function' && (el.classList.contains('well') || el.classList.contains('alert') || el.classList.contains('panel')));
}

export function getBlockMatchScore(
  enTag,
  frTag,
  enBlock,
  frBlock,
  enBlocks = [],
  frBlocks = [],
  enIndex = -1,
  frIndex = -1,
  enFeat = null,
  frFeat = null
) {
  const enInTable = Boolean(enBlock && (enBlock.inTable !== undefined ? enBlock.inTable : ((enBlock.el && typeof enBlock.el.closest === 'function' && enBlock.el.closest('table, tbody, thead, tfoot, tr, td, th') && !enBlock.el.closest('caption')) || ['td', 'th'].includes(enTag))));
  const frInTable = Boolean(frBlock && (frBlock.inTable !== undefined ? frBlock.inTable : ((frBlock.el && typeof frBlock.el.closest === 'function' && frBlock.el.closest('table, tbody, thead, tfoot, tr, td, th') && !frBlock.el.closest('caption')) || ['td', 'th'].includes(frTag))));

  // Callout box single-cell table detection (Word documents often wrap notes/wells in 1x1 tables)
  const enIsSingleCell = Boolean(enBlock && isSingleCellCalloutTable(enBlock.el));
  const frIsSingleCell = Boolean(frBlock && isSingleCellCalloutTable(frBlock.el));
  const isCalloutTableMatch = Boolean(
    (enIsSingleCell && (isCalloutBlock(frBlock) || frTag === 'p' || frTag === 'div')) ||
    (frIsSingleCell && (isCalloutBlock(enBlock) || enTag === 'p' || enTag === 'div'))
  );

  // Shared-figure bonus. Declared out here because it is added to the score
  // below, after the structural block closes.
  let numericBonus = 0;

  if (enBlock && frBlock) {
    // An <img> can only ever be the translation of an <img>: its text is the
    // alt attribute, and alt text routinely echoes the caption ("Figure 1. ..."
    // against "Figure 1. Text version below."), so without a veto the aligner
    // pairs the English image with the French caption. The caption text is
    // then injected into the image's alt while the caption itself is marked
    // translation-missing — figcaption and img collapse into one broken unit
    // on the French side instead of two independent hovers. Veto well below
    // GAP so the aligner emits an honest gap (missing alt) instead.
    if ((enTag === 'img') !== (frTag === 'img')) {
      return -7.0;
    }

    // Canada.ca and Canadian federal government standard bilingual terms anchor matching
    if (matchesCanadianGovBilingualTerm(enBlock.text, frBlock.text)) {
      return 18.0;
    }

    const isEnCaption = isTableCaptionBlock(enBlock);
    const isFrCaption = isTableCaptionBlock(frBlock);
    const isAnyCaption = isEnCaption || isFrCaption || enTag === 'caption' || frTag === 'caption';

    // Both are table captions -> lock together
    if (isEnCaption && isFrCaption) {
      const enSecId = extractSectionIdentifier(enBlock.text, enTag);
      const frSecId = extractSectionIdentifier(frBlock.text, frTag);
      if (enSecId && frSecId && enSecId === frSecId) {
        return 20.0;
      }
      let capScore = 15.0;
      const ef = enFeat || extractBlockTextFeatures(enBlock.text);
      const ff = frFeat || extractBlockTextFeatures(frBlock.text);
      capScore += computeBilingualTextSimilarity(ef, ff, enIndex, frIndex);
      return capScore;
    }

    // Table boundary isolation: prevent blocks inside a table from matching blocks outside, and vice-versa
    if (!isAnyCaption && !isCalloutTableMatch && enInTable !== frInTable) return -7.0;

    // One is a table caption, the other is NOT
    if (isEnCaption !== isFrCaption) {
      const otherBlock = isEnCaption ? frBlock : enBlock;
      if (['td', 'th'].includes(otherBlock.tag) || (otherBlock.el && otherBlock.el.closest && otherBlock.el.closest('td, th'))) {
        return -8.0;
      }
      const ef = enFeat || extractBlockTextFeatures(enBlock.text);
      const ff = frFeat || extractBlockTextFeatures(frBlock.text);
      const sim = computeBilingualTextSimilarity(ef, ff, enIndex, frIndex);
      if (sim > 0.8) {
        return 3.5 + sim;
      }
    }

    const enIsFnHeader = isFootnoteHeadingBlock(enBlock);
    const frIsFnHeader = isFootnoteHeadingBlock(frBlock);

    // Both are footnote headers
    if (enIsFnHeader && frIsFnHeader) return 15;
    // A footnote list's heading arrives in a Word translation as an ordinary
    // heading — "Notes de bas de page" becomes "Références" in a plain <p> —
    // so the same markup mismatch happens here, and -12 was worse than the -1
    // of leaving it unpaired. A heading is the one place this is safe to let
    // through: it has no body text, so the French slot can only receive the
    // French heading, never be overwritten by a definition. Gated on the two
    // headings actually reading as translations, so a footnote heading still
    // cannot walk off and capture an unrelated body heading.
    if (enIsFnHeader !== frIsFnHeader) {
      const efH = enFeat || (enBlock ? extractBlockTextFeatures(enBlock.text) : null);
      const ffH = frFeat || (frBlock ? extractBlockTextFeatures(frBlock.text) : null);
      const enRelH = (enBlocks.length > 1 && enIndex >= 0) ? enIndex / (enBlocks.length - 1) : 0;
      const frRelH = (frBlocks.length > 1 && frIndex >= 0) ? frIndex / (frBlocks.length - 1) : 0;
      // 0.6 sits between the measured values: "References" against "Références"
      // scores 1.01 on the shared "réf" stem, "Notes de bas de page" against
      // itself 1.81, and any unrelated heading 0.21 — the no-overlap baseline.
      if (computeBilingualTextSimilarity(efH, ffH, enRelH, frRelH) < 0.6) return -12;
    }

    const enIsFnContent = isFootnoteContentBlock(enBlock, enBlocks);
    const frIsFnContent = isFootnoteContentBlock(frBlock, frBlocks);

    // Both are footnote content items -> lock together
    if (enIsFnContent && frIsFnContent) {
      const enFnNum = extractFootnoteNumber(enBlock, enBlocks);
      const frFnNum = extractFootnoteNumber(frBlock, frBlocks);
      if (enFnNum && frFnNum) {
        if (enFnNum === frFnNum) return 18;
        return -10;
      }
      return 10;
    }
    // One side is footnote content and the other is not.
    //
    // A Word translation carries no footnote markup at all, so the translation
    // of a footnote definition arrives as an ordinary paragraph: the English
    // reference sits in <dd id="fn1"> inside .wb-fnote, the French one is a
    // plain <p>. The mismatch was an unconditional -8, worse than the -1 it
    // costs to leave a block unpaired, so the aligner was rewarded for refusing
    // every reference in the document and each one became "extra French
    // content" stacked on a missing translation.
    //
    // Shared identifying data is the gate. A reference carries its year, its
    // volume, its page range, its CAS number, and a translated reference carries
    // the same ones: measured against this document, the four entries tried
    // share 2, 5, 6 and 5 figures with their translations. One is the floor
    // rather than two, because the thinnest real entries share exactly one —
    // "ACGIH (2024) TLVs and BEIs. ACGIH, Cincinnati, Ohio." carries nothing but
    // its year — and a floor of two would have left those unpaired, which is the
    // bug being fixed. The residual risk is that a footnote definition pairs
    // with a nearby body paragraph that happens to quote the same year; that
    // cost is one swapped paragraph, visible in the QA panel, against the
    // alternative of refusing every reference in the document.
    if (enIsFnContent !== frIsFnContent) {
      const enNumsFn = extractNumbersAndData(enBlock.text);
      const frNumsFn = extractNumbersAndData(frBlock.text);
      let sharedData = 0;
      enNumsFn.forEach((v) => { if (frNumsFn.has(v)) sharedData += 1; });
      if (sharedData < 1) return -8;
    }

    // Figure & Text Equivalent Summary alignment
    const enIsSummary = isTextEquivalentSummaryBlock(enBlock);
    const frIsSummary = isTextEquivalentSummaryBlock(frBlock);
    if (enIsSummary && frIsSummary) return 15.0;
    if (enIsSummary !== frIsSummary) {
      const otherBlock = enIsSummary ? frBlock : enBlock;
      const otherWordCount = (otherBlock.text || '').split(/\s+/).filter(Boolean).length;
      if (otherWordCount > 6 || isHeadingTag(otherBlock.tag) || otherBlock.tag === 'td' || otherBlock.tag === 'th') {
        return -7.0;
      }
    }

    const enIsFigcaption = isFigcaptionBlock(enBlock);
    const frIsFigcaption = isFigcaptionBlock(frBlock);
    if (enIsFigcaption && frIsFigcaption) {
      const enSecId = extractSectionIdentifier(enBlock.text, enTag);
      const frSecId = extractSectionIdentifier(frBlock.text, frTag);
      if (enSecId && frSecId && enSecId === frSecId) {
        return 20.0;
      }
      return 14.0;
    }
    if (enIsFigcaption !== frIsFigcaption) {
      const otherBlock = enIsFigcaption ? frBlock : enBlock;
      const otherWordCount = (otherBlock.text || '').split(/\s+/).filter(Boolean).length;
      if (otherWordCount > 10 || isHeadingTag(otherBlock.tag) || otherBlock.tag === 'td' || otherBlock.tag === 'th') {
        return -7.0;
      }
    }

    // PDF Side Panel Preview & Publication Metadata alignment
    const enIsPdfDownload = isPdfDownloadText(enBlock.text);
    const frIsPdfDownload = isPdfDownloadText(frBlock.text);
    if (enIsPdfDownload && frIsPdfDownload) return 18.0;

    const enIsPdfMeta = isPdfPublicationMetadataText(enBlock.text);
    const frIsPdfMeta = isPdfPublicationMetadataText(frBlock.text);
    if (enIsPdfMeta && frIsPdfMeta) {
      const enMetaType = getPdfMetaFieldType(enBlock.text);
      const frMetaType = getPdfMetaFieldType(frBlock.text);
      if (enMetaType && frMetaType && enMetaType === frMetaType) {
        return 19.0;
      }
      return 11.0;
    }
    if (enIsPdfMeta !== frIsPdfMeta) {
      const otherBlock = enIsPdfMeta ? frBlock : enBlock;
      const otherWordCount = (otherBlock.text || '').split(/\s+/).filter(Boolean).length;
      if (otherWordCount > 15 || isHeadingTag(otherBlock.tag)) {
        return -6.0;
      }
    }

    // PDF Side Panel element boundary protection & matching
    const enIsPdfSide = enBlock && isPdfSidePanelElement(enBlock.el);
    const frIsPdfSide = frBlock && isPdfSidePanelElement(frBlock.el);
    if (enIsPdfSide || frIsPdfSide) {
      if (enIsPdfSide && !frIsPdfSide) {
        return -6.0;
      }
      if (!enIsPdfSide && frIsPdfSide) {
        return -6.0;
      }
      if (enTag === 'img' && frTag === 'img') return 18.0;
      if (enTag === frTag) return 14.0;
      return 6.0;
    }

    // Structural section identifier match
    const enSecId = extractSectionIdentifier(enBlock.text, enTag);
    const frSecId = extractSectionIdentifier(frBlock.text, frTag);
    if (enSecId && frSecId) {
      if (enSecId === frSecId) {
        return 16.0;
      } else {
        return -8.0;
      }
    }

    // Heading vs Heading / Heading-like matching
    const enIsHeading = isHeadingLikeBlock(enBlock);
    const frIsHeading = isHeadingLikeBlock(frBlock);
    if (enIsHeading && frIsHeading) {
      let headingScore = 6.0;
      if (enTag === frTag) headingScore += 2.0;
      const ef = enFeat || (enBlock ? extractBlockTextFeatures(enBlock.text) : null);
      const ff = frFeat || (frBlock ? extractBlockTextFeatures(frBlock.text) : null);
      if (ef && ff) {
        headingScore += computeBilingualTextSimilarity(ef, ff, 0, 0);
      }
      return headingScore;
    }

    const frWordCount = (frBlock.text || '').split(/\s+/).filter(Boolean).length;
    const enWordCount = (enBlock.text || '').split(/\s+/).filter(Boolean).length;

    // Heading-vs-paragraph, either way round.
    //
    // The old rule vetoed the pairing whenever a block of more than 15 words
    // faced a heading. Its purpose was to stop a SHORT heading from swallowing
    // a body paragraph. But it applied the length test to the paragraph side
    // only, so it also blocked the case where the heading itself is long — and
    // a long "heading" is precisely the tell for a mis-styled paragraph: a
    // 26-word <h2> is not a heading, it is body copy that picked up a stray
    // Word style. Forbidding that pairing emitted the same text twice, as
    // "extra French content" plus "translation missing" directly beneath it.
    //
    // So the heading side's own word count decides:
    //   long heading  -> the tag difference carries no information; score it
    //                    like any other content pair, at the same weak 0.3
    //                    base the short-paragraph path below already uses, so
    //                    a genuine same-tag pair nearby still wins outright;
    //   short heading -> keep the original veto.
    // Either way the English structure wins on export and the difference is
    // reported under Mismatch, where a heading/paragraph pair is deliberately
    // NOT auto-resolved (it would damage the document outline).
    const frHeadingVsLongPara = isHeadingTag(frTag) && !enIsHeading && enWordCount > 15;
    const enHeadingVsLongPara = isHeadingTag(enTag) && !frIsHeading && frWordCount > 15;
    if (frHeadingVsLongPara || enHeadingVsLongPara) {
      const headingSideIsLong = frHeadingVsLongPara ? frWordCount > 15 : enWordCount > 15;
      if (headingSideIsLong) {
        const ef = enFeat || (enBlock ? extractBlockTextFeatures(enBlock.text) : null);
        const ff = frFeat || (frBlock ? extractBlockTextFeatures(frBlock.text) : null);
        const enRel = (enBlocks.length > 1 && enIndex >= 0) ? enIndex / (enBlocks.length - 1) : 0;
        const frRel = (frBlocks.length > 1 && frIndex >= 0) ? frIndex / (frBlocks.length - 1) : 0;
        return 0.3 + computeBilingualTextSimilarity(ef, ff, enRel, frRel);
      }
      return -5.0;
    }

    const enText = enBlock.text || '';
    const frText = frBlock.text || '';
    const enEmails = enText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
    const frEmails = frText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
    if (enEmails.length > 0 && frEmails.length > 0 && enEmails.some((e) => frEmails.includes(e))) {
      return 12.0;
    }

    if (enBlock.hasBr || (enBlock.brCount && enBlock.brCount > 0) || enText.includes('\n')) {
      const enLines = enText.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean);
      const frClean = frText.trim().toLowerCase();
      const directLineMatch = enLines.some(
        (line) => line === frClean || (line.length > 6 && (frClean.includes(line) || line.includes(frClean)))
      );
      if (directLineMatch) {
        return 7.0;
      }
    }

    // Regulatory paragraphs repeat each other's wording almost verbatim, so the
    // general similarity score alone leaves near-duplicates tied and the global
    // aligner slides the diagonal — surfacing as "extra French content" plus
    // "translation missing". What separates two such studies is their data:
    // "8 000 mg/kg, 20 rats" against "6 350, 7 900, 10 000 mg/kg, 10 rats". The
    // number bonus inside computeBilingualTextSimilarity saturates at 6.0 and
    // cannot express that, so the raw overlap is added on top.
    //
    // It has to be a bonus and not an early return. Returning here capped a
    // near-verbatim translation match — shared stems, acronyms, length ratio
    // and six shared figures, 18.2 on the general path — at 8.0, the same value
    // it gave to mediocre pairs, which is precisely what let a neighbouring
    // paragraph win the French text. Adding keeps the full signal and still
    // separates the near-duplicates.
    //
    // Every structural lock above (footnote content 18, captions 20, section id
    // 16, bilingual terms 18) returns before this point, so the bonus can never
    // outrank them: only pairs that already cleared those checks reach it.
    const enNums = extractNumbersAndData(enBlock.text);
    const frNums = extractNumbersAndData(frBlock.text);
    if (enNums.size > 0 && frNums.size > 0) {
      let sharedNums = 0;
      enNums.forEach((n) => { if (frNums.has(n)) sharedNums++; });
      // Two or more: a single shared figure ("0.8 %") is coincidence, not a
      // translation match, and earns nothing.
      if (sharedNums >= 2) numericBonus = Math.min(sharedNums, 12) * 0.5;
    }

    const enIsBullet = enTag === 'li';
    const frIsBullet = frTag === 'li' || /^\s*[•\-*–—]\s+/.test(frBlock.text || '');
    if (enIsBullet && frIsBullet) {
      let bulletScore = 3.0;
      const ef = enFeat || (enBlock ? extractBlockTextFeatures(enBlock.text) : null);
      const ff = frFeat || (frBlock ? extractBlockTextFeatures(frBlock.text) : null);
      if (ef && ff) {
        bulletScore += computeBilingualTextSimilarity(ef, ff, 0, 0);
      }
      return bulletScore;
    }
  }

  // Base tag compatibility score
  let baseScore = -1;
  if (enTag === frTag) {
    baseScore = 2.5;
  } else if (isHeadingTag(enTag) && isHeadingTag(frTag)) {
    baseScore = 2.0;
  } else if (enTag === 'summary' && frTag === 'summary') {
    baseScore = 3.0;
  } else if (
    (enTag === 'summary' && (isHeadingTag(frTag) || isHeadingLikeBlock(frBlock) || frTag === 'p' || frTag === 'div')) ||
    (frTag === 'summary' && (isHeadingTag(enTag) || isHeadingLikeBlock(enBlock) || enTag === 'p' || enTag === 'div'))
  ) {
    baseScore = (isHeadingTag(enTag) || isHeadingTag(frTag) || isHeadingLikeBlock(enBlock) || isHeadingLikeBlock(frBlock)) ? 2.4 : 2.0;
  } else if (enInTable && frInTable) {
    if (
      (['td', 'th'].includes(enTag) && frTag === 'p') ||
      (enTag === 'p' && ['td', 'th'].includes(frTag)) ||
      (enTag === 'th' && frTag === 'td') ||
      (enTag === 'td' && frTag === 'th')
    ) {
      baseScore = 2.2;
    } else {
      baseScore = 1.5;
    }
  } else if ((enTag === 'caption' && frTag === 'p') || (enTag === 'p' && frTag === 'caption')) {
    baseScore = 2.2;
  } else {
    const isEnContentTag = ['li', 'p', 'td', 'th', 'dd', 'dt', 'caption', 'figcaption', 'blockquote', 'summary', 'div', 'section', 'aside'].includes(enTag);
    const isFrContentTag = ['li', 'p', 'td', 'th', 'dd', 'dt', 'caption', 'figcaption', 'blockquote', 'summary', 'div', 'section', 'aside'].includes(frTag);

    const enIsWellOrAlert = isCalloutBlock(enBlock);
    const frIsWellOrAlert = isCalloutBlock(frBlock);

    if (isCalloutTableMatch) {
      baseScore = 3.0;
    } else if (enIsWellOrAlert && frIsWellOrAlert) {
      baseScore = 3.5;
    } else if (isEnContentTag && isFrContentTag) {
      if ((enTag === 'li' && frTag === 'p') || (enTag === 'p' && frTag === 'li')) {
        baseScore = 1.2;
      } else if (
        (enTag === 'div' && frTag === 'p') ||
        (enTag === 'p' && frTag === 'div') ||
        (enTag === 'section' && frTag === 'p') ||
        (enTag === 'p' && frTag === 'section') ||
        (enTag === 'aside' && frTag === 'p') ||
        (enTag === 'p' && frTag === 'aside')
      ) {
        baseScore = (enIsWellOrAlert || frIsWellOrAlert) ? 2.5 : 1.5;
      } else if (isHeadingTag(enTag) || isHeadingTag(frTag)) {
        baseScore = 0.5;
      } else {
        baseScore = (enIsWellOrAlert || frIsWellOrAlert) ? 2.5 : 1.0;
      }
    } else if ((isHeadingTag(enTag) && isFrContentTag) || (isEnContentTag && isHeadingTag(frTag))) {
      baseScore = 0.3;
    }
  }

  // Enrich compatible block score with bilingual text similarity
  if (baseScore > 0 && enBlock && frBlock && enBlock.text && frBlock.text) {
    const ef = enFeat || extractBlockTextFeatures(enBlock.text);
    const ff = frFeat || extractBlockTextFeatures(frBlock.text);
    const enIdx = enIndex >= 0 ? enIndex : (enBlocks.length > 0 ? enBlocks.indexOf(enBlock) : -1);
    const frIdx = frIndex >= 0 ? frIndex : (frBlocks.length > 0 ? frBlocks.indexOf(frBlock) : -1);
    const enRel = (enBlocks.length > 1 && enIdx >= 0) ? enIdx / (enBlocks.length - 1) : 0;
    const frRel = (frBlocks.length > 1 && frIdx >= 0) ? frIdx / (frBlocks.length - 1) : 0;
    baseScore += computeBilingualTextSimilarity(ef, ff, enRel, frRel);
    // Shared figures, on top of the similarity score rather than instead of it —
    // see the note where numericBonus is computed.
    baseScore += numericBonus;
  }

  return baseScore;
}
