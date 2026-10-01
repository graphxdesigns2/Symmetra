// src/modules/footnotes.js
// Specialized Footnote Logic & WET Footnote Infrastructure

// Per-document memo of "does this document mark footnotes explicitly?".
// WeakMap so parsed documents can still be garbage collected.
const footnoteEvidenceCache = new WeakMap();

// Same idea for the set of note numbers the document actually defines, so a
// caller that never loaded state can still tell a citation from an exponent.
const definedNumsCache = new WeakMap();

function definedNumsForDoc(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') return null;
  if (definedNumsCache.has(doc)) return definedNumsCache.get(doc);
  let nums = null;
  try {
    nums = collectDefinedFootnoteNums(doc.body || doc);
  } catch (_) {
    nums = null;
  }
  definedNumsCache.set(doc, nums);
  return nums;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SUPERSCRIPT_MAP = {
  0: '\u2070', 1: '\u00B9', 2: '\u00B2', 3: '\u00B3', 4: '\u2074',
  5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079',
};

export function toUnicodeSuperscript(str) {
  return String(str).replace(/\d/g, (d) => SUPERSCRIPT_MAP[d] || d);
}

// Absorbs the bare number a previous render left behind in the block text.
//
// Only the "Note de bas de page " label of a citation is screen-reader-only; the
// number itself is ordinary text, so re-harvesting a block that already carries
// a marker reads it back as part of the prose. When the anchor for a citation
// cannot be found in the translated text the marker goes to the end, and that
// leftover digit then prints beside it — "…7 jours)1" followed by the marker.
//
// Restricted to this citation's own number, sitting immediately before its own
// marker, so a genuine figure ("pendant 3 ans") is never mistaken for residue.
// The number must also stand alone: a digit inside a longer run is not residue,
// and eating one silently shortened a run the evidence rules had deliberately
// left in place ("7891011" for a run of "789101112").
export function absorbCitationResidue(text, fnNum, markerToken) {
  if (!text || !markerToken) return text;
  const bare = String(fnNum || '').replace(/^fn[-_]?/i, '');
  if (!/^\d{1,3}$/.test(bare)) return text;
  const n = escapeRe(bare);
  const sup = escapeRe(toUnicodeSuperscript(bare));
  const re = new RegExp(
    `(?<=\\S)(?<![0-9])[ \\t\\u00A0]*(?:${n}|${sup})(?![0-9])(?=[ \\t\\u00A0]*${escapeRe(markerToken)})`,
    'g'
  );
  return text.replace(re, '');
}

// A citation run the translator typed with no separator at all.
//
// The source writes "[7-12]"; reproduced by hand it often becomes the notes
// straight into the sentence, "789101112". Nothing in the pipeline could match
// that. STANDALONE_CITATION_AFTER ends in (?![0-9_]), so no interior split of a
// contiguous run is ever a standalone number — every candidate has a digit
// against it — and absorbCitationResidue only looks immediately before a
// marker that has already been placed. The cluster therefore fell through to
// proportional placement: the markers landed before "malignes", and the typed
// digits stayed in the sentence as prose.
//
// Exact concatenation is the entire safety argument. A run is eaten only when it
// is character-for-character this cluster's own numbers joined, so for the match
// to be wrong the sentence's figure would have to BE the concatenation of the
// notes the block cites, and the concatenation is the same for one cluster only —
// there is no reading of it to get wrong. The digits' order is not a choice:
// "101112" is 10, 11, 12 and nothing else.
//
// Short concatenations are refused anyway: notes 1 and 2 join to "12", notes 10
// and 11 to "1011", and each of those is also a number someone may have meant.
// The floor is 5 digits, which admits the shapes this actually turns up —
// "789101112", "141516", "101112" — while leaving "789" and "1011" in the
// sentence.
export function findJoinedCitationRun(text, nums, opts = {}) {
  const { minLen = 5, anchorPos = null } = opts;
  if (!text || !Array.isArray(nums) || nums.length < 2) return null;
  const parts = nums.map((n) => String(n == null ? '' : n).replace(/^fn[-_]?/i, ''));
  // "04" is not a note number, and a leading zero would make "0405" ambiguous
  // against the two clusters (4, 5) and (4, 405).
  if (parts.some((n) => !/^[1-9]\d{0,2}$/.test(n))) return null;
  const joined = parts.join('');
  if (joined.length < minLen) return null;
  // Bounded on both sides: not the tail of a longer number ("7891011120"), not
  // the integer part of a decimal ("789101112,5" — the same (?![.,][0-9]) guard
  // STANDALONE_CITATION_AFTER uses), not glued to a word ("F1", "de7"), and not a
  // fraction or a thousands group ("1 000" is split by the space, so only "000"
  // would reach here, and the lookbehind rejects it).
  const re = new RegExp(
    `(?<![\\d.,/_A-Za-z\\u00C0-\\u00FF])(${joined})(?![\\dA-Za-z_/%\\u00B0\\u00D7])(?![.,]\\d)`,
    'g'
  );
  const hits = [];
  let hit;
  while ((hit = re.exec(text)) !== null) hits.push({ start: hit.index, end: hit.index + hit[0].length });
  if (!hits.length) return null;
  // One occurrence is the citation, wherever it sits. Several identical runs are
  // the only genuinely ambiguous case, and that is the only one worth resolving
  // by position: a single run must NOT be rejected for being far from the
  // English citation, because French is routinely longer than the English it was
  // translated from, the mapping between their offsets is correspondingly loose,
  // and a gate that tight turns this fix back into the bug it removes — the
  // markers scattered again and the digits stayed.
  const chosen = hits.length > 1 && anchorPos !== null && typeof anchorPos === 'number'
    ? hits.reduce((best, h) => (
        Math.abs((h.start + h.end) / 2 - anchorPos * text.length) <
        Math.abs((best.start + best.end) / 2 - anchorPos * text.length) ? h : best
      ))
    : hits[0];
  return { start: chosen.start, end: chosen.end, digits: joined };
}

// Debris from a previous render's placeholder handling: full tokens
// (___GC_FN_7___) or fragments of them (_FN_7___, _GC_FN_4_) that were sliced
// into literal text and then harvested back into block state as prose. They
// are never legitimate translator input — real citations are brackets, bare
// numbers, or <sup> markup — so any occurrence in an incoming French string
// is pollution from an earlier cycle, and leaving it in place lets its digits
// act as fresh "typed numbers" for the next cycle's matchers (the snowball
// behind Dans4040 / 36373940-style residue).
//
// Fragments chain with shared separators (___FN_7___FN_9___), so neither side
// may greedily consume the underscores: the first alternative requires the
// leading run, the second the trailing run, and one pass clears a whole
// chain. A bare FN_7 with no underscores on either side is left alone, as is
// a match starting inside a word (the lookbehind).
const ORPHAN_TOKEN_RE = /(?<![A-Za-zÀ-ÖØ-öø-ÿ])_+(?:GC_)?FN_\d+_*|(?<![A-Za-zÀ-ÖØ-öø-ÿ])_*(?:GC_)?FN_\d+_+/g;

export function stripOrphanFootnoteTokens(text) {
  if (!text || typeof text !== 'string') return text;
  ORPHAN_TOKEN_RE.lastIndex = 0;
  return text.replace(ORPHAN_TOKEN_RE, '');
}

// Leading definition labels ("1. ", "[1] ", "Note 1 : ") that the generation
// pass strips from footnote content elements. The code locator must strip the
// same prefix from its needle: generated code holds the stripped text while
// block state keeps the label, so verbatim matching can never hit and the
// block falls back to an estimate — usually on a boilerplate line above the
// real one. Returns the original text when stripping changes nothing (or
// would leave nothing), so callers can simply try both forms.
const FN_DEF_LABEL_PREFIX_RE = /^(?:(?:\(|\[)?\s*\d+\s*(?:\)|\])?\s*[:.\-–—]?\s*|\bNote(?:\s+de\s+bas\s+de\s+page)?\s*\d+\s*[:.\-–—]?\s*)/i;

export function stripFootnoteDefinitionLabel(text) {
  if (!text || typeof text !== 'string') return text;
  const stripped = text.replace(FN_DEF_LABEL_PREFIX_RE, '').trim();
  return stripped || text;
}

export function isFootnoteBoilerplateElement(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();

  // 1. <dt> inside a footnote list: e.g. <dt>Footnote 1</dt> or <dt>Note de bas de page 1</dt>
  if (tag === 'dt') {
    if ((typeof el.closest === 'function' && el.closest('.wb-fnote, [role="note"]')) || (typeof el.closest === 'function' && el.closest('dl')?.querySelector('dd[id^="fn"]'))) {
      return true;
    }
    if (/^(?:Footnote|Note\s+de\s+bas\s+de\s+page)\s*[a-zA-Z0-9_-]+/i.test((el.textContent || '').trim())) {
      return true;
    }
  }

  // 2. Return link element with class fn-rtn
  if ((el.classList && typeof el.classList.contains === 'function' && el.classList.contains('fn-rtn')) || (typeof el.closest === 'function' && el.closest('.fn-rtn'))) {
    return true;
  }

  // 3. <a> link pointing to footnote reference (-rf)
  if (tag === 'a' && (((el.getAttribute ? el.getAttribute('href') : '') || '').includes('-rf') || (el.classList && typeof el.classList.contains === 'function' && el.classList.contains('fn-rtn')))) {
    return true;
  }

  // 4. Standalone element whose text ONLY consists of return link boilerplate
  const txt = (el.textContent || '').trim();
  if (/^(?:Return to footnote|Retour à la référence de la note de bas de page)\s*[a-zA-Z0-9_-]*(?:\s*referrer)?$/i.test(txt)) {
    return true;
  }

  return false;
}

export function isFootnoteCitationHref(href) {
  if (!href) return false;
  // "#_ftnref1" is Word's *return* target, not a citation — keep it out.
  return /^#(?:fn[-_]?\d+[a-z0-9_-]*|footnote[-_]?\d+[a-z0-9_-]*|noteref[-_]?\d+|_?ftn[-_]?\d+)/i.test(href);
}

export function isFootnoteReturnHref(href) {
  if (!href) return false;
  return /^#(?:fn[-_]?\d+[a-z0-9_-]*-rf|_ftnref\d+)/i.test(href);
}

// Footnote reference ids/names: number first ("fn1-rf", "footnote3-ref",
// "ftn4-anchor") or reference word first ("_ftnref1", "fnref2", "noteref3").
// A bare "fn1" is deliberately excluded: WET uses it for the <dd> definition
// target, so it says nothing about the citation in the running text.
const FN_CITATION_ID_RE = /^(?:fn|footnote|ftn)[-_]?\d+[-_]?(?:r|ref|rf|referrer|anchor)$|^(?:_?ftn|fn|noteref)[-_]?ref(?:er)?[-_]?\d+$/i;
const FN_CITATION_CLASS_RE = /\b(?:fn-?lnk|footnote[-_]?ref|fn[-_]?ref|noteref)\b/i;

// Screen-reader-only text, which the source and preview panes clip away
// (see the `.wb-inv` rule in constants.js). Kept in sync with that rule.
const HIDDEN_TEXT_CLASS_RE = /(?:^|\s)(?:wb-inv|wb-invisible|wb-sr-only|sr-only|sr-only-text|visually-hidden|hidden-text)(?:\s|$)/i;

// True when at least one character of `el` is actually rendered. A citation
// whose whole marker sits inside hidden text is not a marker in the running
// text — nothing was printed for the reader, so the translator never saw one
// either and none may be pushed into the French document. Note this keeps the
// app's own canonical shape, where only the "Note de bas de page " label is
// hidden and the number itself is a visible text node.
export function hasVisibleCitationText(el) {
  if (!el) return false;

  const isHidden = (node) => {
    if (!node || node.nodeType !== 1) return false;
    if (typeof node.hasAttribute === 'function') {
      if (node.hasAttribute('hidden')) return true;
      if ((node.getAttribute('aria-hidden') || '') === 'true') return true;
    }
    const cls = (node.getAttribute && node.getAttribute('class')) || '';
    return Boolean(cls) && HIDDEN_TEXT_CLASS_RE.test(cls);
  };

  // Hidden on the marker itself, or hidden by anything wrapping it.
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    if (isHidden(n)) return false;
  }

  const walk = (node) => {
    const kids = node.childNodes || [];
    for (const child of kids) {
      if (child.nodeType === 3) {
        if ((child.textContent || '').trim()) return true;
      } else if (child.nodeType === 1) {
        if (isHidden(child)) continue;
        if (walk(child)) return true;
      }
    }
    return false;
  };
  return walk(el);
}

// Positive evidence that an element is footnote chrome rather than ordinary
// superscript content: a `.fn-lnk` anchor, a footnote href, or a
// footnote-reference id/class. Anything short of this is NOT evidence — a bare
// <sup>3</sup> is indistinguishable from a scientific exponent (m³, cm², ³²P,
// 10⁶) and in a technical document that is what it almost always is.
export function hasFootnoteChrome(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();

  if (el.classList && typeof el.classList.contains === 'function' && el.classList.contains('fn-lnk')) return true;
  const cls = (el.getAttribute ? el.getAttribute('class') : '') || '';
  if (cls && FN_CITATION_CLASS_RE.test(cls)) return true;

  const href = (el.getAttribute ? el.getAttribute('href') : '') || '';
  if (href && isFootnoteCitationHref(href) && !isFootnoteReturnHref(href)) return true;

  const id = (el.getAttribute ? (el.getAttribute('id') || el.getAttribute('name')) : '') || '';
  if (id && FN_CITATION_ID_RE.test(id)) return true;

  // <sup><a class="fn-lnk" href="#fn1">1</a></sup>
  if (tag !== 'a' && typeof el.querySelector === 'function') {
    const a = el.querySelector('a');
    if (a && hasFootnoteChrome(a)) return true;
  }
  return false;
}

// Chrome AND a marker the reader can actually see. Every recognition path goes
// through this so an invisible marker is never treated as a citation.
export function isVisibleFootnoteCitation(el, allowBareSup = false) {
  if (!hasFootnoteChrome(el) && !isFootnoteCitationSup(el, allowBareSup)) return false;
  return hasVisibleCitationText(el);
}

// Document-level convention check, cached per Document. `explicit` is true when
// the document marks at least one footnote with real chrome; that is what makes
// every other bare digit <sup> an exponent rather than a citation.
export function getFootnoteEvidence(doc) {
  const empty = { explicit: false };
  if (!doc || typeof doc.querySelectorAll !== 'function') return empty;
  if (footnoteEvidenceCache.has(doc)) return footnoteEvidenceCache.get(doc);
  let explicit = false;
  try {
    doc.querySelectorAll(
      'a.fn-lnk, [class*="fn-lnk"], [class*="footnote-ref"], [class*="footnote_ref"], [class*="fn-ref"], a[href^="#fn"], a[href^="#_ftn"], a[href^="#ftn"], a[href^="#footnote-"], a[href^="#noteref"], [id*="-rf"], [id*="fnref"], [id*="fn-ref"], [name*="fnref"]'
    ).forEach((el) => {
      if (explicit) return;
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      if (isFootnoteReturnHref(href)) return;
      explicit = hasFootnoteChrome(el);
    });
  } catch (_) {}
  const evidence = { explicit };
  footnoteEvidenceCache.set(doc, evidence);
  return evidence;
}

export function allowsBareSupFootnotes(elOrDoc) {
  const doc = elOrDoc && elOrDoc.tagName ? elOrDoc.ownerDocument : elOrDoc;
  return !getFootnoteEvidence(doc).explicit;
}

// Decides whether a <sup> is a footnote citation. `allowBareSup` comes from the
// document convention: a digit-only <sup> is only accepted when the document
// carries no explicit footnote markup anywhere (Word-pasted sources), otherwise
// every unit exponent would be promoted to a footnote number.
export function isFootnoteCitationSup(sup, allowBareSup = false) {
  if (!sup || !sup.tagName || sup.tagName.toLowerCase() !== 'sup') return false;
  if (hasFootnoteChrome(sup)) return true;
  return Boolean(allowBareSup) && !sup.querySelector('a') && /^\s*\d{1,3}\s*$/.test(sup.textContent || '');
}

export function isFootnoteElement(el) {
  if (!el || typeof el.querySelector !== 'function' || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'sup') return hasFootnoteChrome(el);
  if (tag === 'a') {
    if (el.classList && typeof el.classList.contains === 'function' && (el.classList.contains('fn-lnk') || el.classList.contains('fn-rtn'))) return true;
    const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
    if (isFootnoteCitationHref(href) || isFootnoteReturnHref(href)) return true;
  }
  return false;
}

export function numFromHref(href) {
  if (!href) return null;
  const m = href.match(/#(?:fn[-_]?|_ftn|ftn|footnote-)?(\d{1,3})(?:[a-z0-9_-]*)?/i);
  return m ? m[1] : null;
}

// Containers that hold footnote definitions. `.wb-fnote` and `[role="note"]`
// are the WET shape, but a hand-authored page often uses a bare definition
// list or an ordered list, and a footer whose shape goes unrecognised silently
// empties the valid set — after which every exponent in the document reads as
// a citation, which is the one outcome Stage 1 exists to prevent.
const FN_FOOTER_SELECTOR = '.wb-fnote, [role="note"], .footnotes, .footnote-list, .fn-list, #fn, #footnotes';

// A bare, punctuation-free note number as an element id. Deliberately
// stricter than FN_CITATION_ID_RE: "fn3" is the definition target, while a
// citation carries a reference suffix ("fn3-rf").
const FN_DEF_ID_RE = /^fn[-_]?(\d{1,3})$/i;
const FN_WORD_DEF_ID_RE = /^(?:_?ftn|footnote-)(\d{1,3})$/i;
const FN_DEF_LABEL_RE = /^(?:Footnote|Note\s+de\s+bas\s+de\s+page)\s+(\d{1,3})\b/i;

export function collectDefinedFootnoteNums(root) {
  const nums = new Set();
  if (!root || typeof root.querySelectorAll !== 'function') return nums;
  // 1. Any element whose own id is a bare note number is a definition target,
  //    whichever container it sits in: <dd id="fn3">, <li id="fn3">, <p id="fn3">.
  //    Scoped to definition-shaped tags so a citation wrapper cannot masquerade
  //    as the definition of the note it cites.
  root.querySelectorAll('dd[id], li[id], p[id], div[id], section[id], aside[id], article[id]').forEach((el) => {
    const m = (el.getAttribute('id') || '').match(FN_DEF_ID_RE);
    if (m) nums.add(m[1]);
  });
  // Word style: <a name="_ftn1"> or id="_ftn1" or id="ftn1" or id="footnote-1"
  root.querySelectorAll('[id], a[name]').forEach((el) => {
    const m = (el.getAttribute('id') || el.getAttribute('name') || '').match(FN_WORD_DEF_ID_RE);
    if (m) nums.add(m[1]);
  });
  // Labels: <dt>Footnote 1</dt>, <dt>Note de bas de page 1</dt>, <li>Footnote 1</li>
  root.querySelectorAll('dt, li, dd, p').forEach((el) => {
    const m = (el.textContent || '').trim().match(FN_DEF_LABEL_RE);
    if (m) nums.add(m[1]);
  });
  return nums;
}

// True when the document carries a footnote definitions region at all, whether
// or not its numbers could be read. Stage 1's contract is "anything outside the
// set is a stray", and that contract can only be enforced when we can tell the
// difference between "this document has no footnotes" and "this document's
// footer shape is one we do not recognise".
export function hasFootnoteDefsRegion(docOrRoot) {
  if (!docOrRoot || typeof docOrRoot.querySelector !== 'function') return false;
  return Boolean(
    docOrRoot.querySelector(
      `${FN_FOOTER_SELECTOR}, dd[id^="fn"], li[id^="fn"], p[id^="fn"], a[name^="_ftn"], a[name^="ftn"], a[id^="_ftn"]`
    )
  );
}

export function walkTextNodes(root, fn) {
  if (!root) return;
  const doc = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  nodes.forEach(fn);
}

export function collectLeafBlocks(root, extractBlocksFn = null) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try {
    const fn = extractBlocksFn || (typeof window !== 'undefined' && window.extractBlocks) || (typeof extractBlocks === 'function' ? extractBlocks : null);
    if (typeof fn === 'function') {
      const blocks = fn(root);
      if (blocks && blocks.length > 0) {
        return blocks.map((b) => b.el || b);
      }
    }
  } catch (_) {}
  return Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote, figcaption, caption')).filter(
    (el) => !isFootnoteBoilerplateElement(el)
  );
}

// Expands a bracketed citation list into the individual note numbers it stands
// for: "[7]" -> [7], "[7, 8, 9]" -> [7,8,9], "[7-12]" -> [7..12].
//
// A hyphen range is the inaccessible shorthand for notes 7 through 12: a screen
// reader announces one run "7 dash 12" instead of six distinct notes, which is
// why it has to be expanded. Unparseable parts are skipped rather than guessed,
// and a range is capped at 99 notes so a figure like "[10-16]" is bounded.
export function expandCitationRefList(raw) {
  const nums = [];
  for (const part of String(raw).split(/\s*[,;]\s*|\s+(?:et|and)\s+/i)) {
    const t = part.trim();
    if (!t) continue;
    const range = /^(\d{1,3})\s*[-–—]\s*(\d{1,3})$/.exec(t);
    if (range) {
      const from = parseInt(range[1], 10);
      const to = parseInt(range[2], 10);
      if (from < 1 || to < from || to - from > 99) continue;
      for (let n = from; n <= to; n++) nums.push(String(n));
      continue;
    }
    if (/^\d{1,3}$/.test(t)) nums.push(t);
  }
  return nums;
}

// Builds the alternation used to locate a citation in the translated text.
//
// The citation's own number is always a candidate. The citation's 1-based
// position within the block (fIdx + 1) is a fallback for sources that renumber
// notes per block, and it is only offered when the real number appears nowhere
// in the text. Offering both at once is what let footnote 23 — position 0, so
// also "1" — match the subscript of "F1" and land inside it, because the
// leftmost match wins and "F1" comes before the document's own "[23]".
//
// `allowPos` exists because this is really a per-block decision, not a per-citation
// one. A source that renumbers per block renumbers every note in it, so the
// position number is the identity for the whole block or for none of it. Deciding
// it per citation meant one block could offer "13" for note 13 and "1" for note 13
// at the same time, leaving unrelated "1"s in the sentence as live candidates.
export function buildFootnoteAnchorAlternation(fnNum, fIdx, text, allowPos = true) {
  const raw = String(fnNum || '');
  const realNum = raw.replace(/^fn[-_]?/i, '');
  const posNum = String(fIdx + 1);
  const patterns = [escapeRe(raw)];
  if (realNum && realNum !== raw && !patterns.includes(escapeRe(realNum))) {
    patterns.push(escapeRe(realNum));
  }
  if (allowPos && realNum) {
    // Standalone-number test, so "3" does not count as present inside "23".
    const present = new RegExp(`(?:^|[^0-9])0*${escapeRe(realNum)}(?:[^0-9]|$)`).test(text || '');
    if (!present && !patterns.includes(escapeRe(posNum))) patterns.push(escapeRe(posNum));
  }
  return patterns.join('|');
}

// Character offset of `node` within `root`, measured across text nodes. This is
// what tells the French placement pass WHERE the English citation sits. Without
// it the pipeline has to guess from the number alone, and "mg/m³" (a superscript
// 3) competes with a genuine footnote 3 on equal terms.
function textOffsetOf(root, node) {
  if (!root || !node) return null;
  const doc = root.ownerDocument;
  if (!doc || typeof doc.createTreeWalker !== 'function') return null;
  const isInside = (n) => {
    let p = n;
    while (p) {
      if (p === node) return true;
      p = p.parentNode;
    }
    return false;
  };
  try {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let cur;
    while ((cur = walker.nextNode())) {
      if (isInside(cur)) return offset;
      offset += (cur.textContent || '').length;
    }
  } catch (_) {}
  return null;
}

// Offset of the first character of `node` that a reader can actually see.
//
// Measuring to the node's first text node instead points at the citation's
// screen-reader label: the canonical shape is
// <sup><a><span class="wb-inv">Footnote </span>1</a></sup>, so the offset lands
// 8 characters early in English and 21 early in French ("Note de bas de
// page "). In a 60-character sentence that is a 15-35% error in the very number
// the French placement is anchored to, and it showed up as markers landing
// inside the preceding word.
function visibleTextOffsetOf(root, node) {
  if (!root || !node) return null;
  const doc = root.ownerDocument;
  if (!doc || typeof doc.createTreeWalker !== 'function') return null;
  const isInside = (n) => {
    let p = n;
    while (p) {
      if (p === node) return true;
      p = p.parentNode;
    }
    return false;
  };
  // Hidden by the citation itself or by anything between the text node and it.
  const hiddenWithin = (textNode) => {
    for (let p = textNode; p && p !== node; p = p.parentNode) {
      if (p.nodeType === 1) {
        if (p.hasAttribute && p.hasAttribute('hidden')) return true;
        if (p.getAttribute && (p.getAttribute('aria-hidden') || '') === 'true') return true;
        const cls = (p.getAttribute && p.getAttribute('class')) || '';
        if (cls && HIDDEN_TEXT_CLASS_RE.test(cls)) return true;
      }
    }
    return false;
  };
  try {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let cur;
    while ((cur = walker.nextNode())) {
      const len = (cur.textContent || '').length;
      if (isInside(cur) && !hiddenWithin(cur)) return offset;
      offset += len;
    }
  } catch (_) {}
  return null;
}

// Relative position (0-1) of a citation within its block, anchored to the
// citation's first visible character.
function citationPosOf(block, node) {
  const totalLen = (block.textContent || '').length || 0;
  if (!totalLen || !node) return null;
  const off = visibleTextOffsetOf(block, node);
  return off === null ? null : off / totalLen;
}

export function extractBlockFootnotes(el, definedNums = null, stateRef = null) {
  // `state` is not imported here on purpose (this module is loaded by the
  // footnote pipeline, which would otherwise create an import cycle), so read
  // it off the window instead of referencing the binding.
  const globalState = stateRef || (typeof window !== 'undefined' && window.state ? window.state : (typeof state !== 'undefined' ? state : null));
  // Falling back to the document itself matters: state.footnoteInventory is
  // cleared on several paths, and without a definition list every digit that
  // looks like a citation number is harvested as one.
  const defs = definedNums
    || (globalState && globalState.footnoteInventory ? globalState.footnoteInventory.validNums : null)
    || definedNumsForDoc((el && el.ownerDocument) || null);
  const hasDefs = defs && defs.size > 0;
  // Stage 1: the set is the authority. A number outside it is a stray, not a
  // citation — but only if the document actually claims to have notes, since a
  // document with no footer has no set to be authoritative about. Treating "no
  // set" as "everything is a note" is what promoted the 3 of "mg/m3" to a
  // citation on any page whose footer shape was not one of the recognised ones.
  const hasRegion = hasDefs || hasFootnoteDefsRegion((el && el.ownerDocument) || el);
  const isReal = (n) => (hasDefs ? defs.has(n) : !hasRegion);

  const footnotes = [];
  if (!el || typeof el.querySelectorAll !== 'function') return footnotes;

  // Relative position (0-1) of each citation within the block, so the French
  // marker can be placed in the corresponding position rather than at whichever
  // digit happens to match first.
  const posOf = (node) => citationPosOf(el, node);

  // Digit-only <sup> runs are only citations when the document never marks a
  // footnote explicitly; otherwise m³, cm², ³²P, 10⁶ … would all be read as
  // footnote numbers.
  const allowBareSup = allowsBareSupFootnotes(el);

  const fnLinks = Array.from(
    el.querySelectorAll('sup a.fn-lnk, a.fn-lnk, sup a, a')
  ).filter((a) => {
    if ((a.classList && a.classList.contains('fn-rtn')) || (a.closest && a.closest('.fn-rtn'))) return false;
    const href = a.getAttribute ? (a.getAttribute('href') || '') : '';
    if (isFootnoteReturnHref(href)) return false;
    if (a.classList && a.classList.contains('fn-lnk')) return isVisibleFootnoteCitation(a, allowBareSup);
    if (isFootnoteCitationHref(href)) return isVisibleFootnoteCitation(a, allowBareSup);
    if (a.closest && isFootnoteCitationSup(a.closest('sup'), allowBareSup)) return hasVisibleCitationText(a);
    return false;
  });

  fnLinks.forEach((a) => {
    const href = a.getAttribute('href') || '';
    const num = numFromHref(href) || (/^\d{1,3}$/.test(a.textContent.trim()) ? a.textContent.trim() : null);
    if (num && isReal(num)) {
      const sup = a.closest('sup');
      const supId = sup?.getAttribute('id') || a.getAttribute('id') || '';
      const cleanHref = href.startsWith('#_ftn') || href.startsWith('#ftn') ? `#fn${num}` : (href || `#fn${num}`);

      footnotes.push({
        fnNum: num,
        num,
        href: cleanHref,
        id: supId,
        pos: posOf(sup || a),
      });
    }
  });

  // Also check for <sup> elements that carry footnote chrome but no <a> tag
  // (e.g. <sup id="fn1-rf">1</sup>), plus digit-only <sup> in documents that
  // mark no footnote explicitly anywhere. Two guards, mirroring
  // buildFootnoteInventory: sups that contain an anchor were already counted
  // in the loop above (their textContent includes the screen-reader label, so
  // without the skip they come back as phantom "Footnote 7" entries that break
  // range consecutiveness downstream), and only digit-only text counts.
  const bareSups = Array.from(el.querySelectorAll('sup')).filter((sup) => {
    if (sup.querySelector && sup.querySelector('a')) return false;
    return isVisibleFootnoteCitation(sup, allowBareSup);
  });
  bareSups.forEach((sup) => {
    const num = sup.textContent.trim();
    if (!/^\d{1,3}$/.test(num)) return;
    if (isReal(num)) {
      footnotes.push({
        fnNum: num,
        num,
        href: `#fn${num}`,
        id: sup.getAttribute('id') || '',
        pos: posOf(sup),
      });
    }
  });

  return footnotes;
}

// Per-document record of the element ids already handed out to citation <sup>
// wrappers. The English citation's own id ("fn7-rf") identifies one place in the
// running text, so a note cited from two paragraphs would otherwise be rendered
// twice with the same id: invalid HTML, and every "return to footnote" link in
// the footer would jump back to the first occurrence.
const usedCitationIdsByDoc = new WeakMap();

// Claims an id for a citation, returning the document's own id the first time and
// a numbered variant afterwards. Ids already present in the document count as
// claimed, so a citation never collides with something the source brought along.
function claimCitationId(doc, id) {
  if (!id) return '';
  let used = usedCitationIdsByDoc.get(doc);
  if (!used) {
    used = new Set();
    usedCitationIdsByDoc.set(doc, used);
    try {
      if (doc && typeof doc.querySelectorAll === 'function') {
        doc.querySelectorAll('[id]').forEach((el) => {
          const existing = el.getAttribute && el.getAttribute('id');
          if (existing) used.add(existing);
        });
      }
    } catch (_) {}
  }
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let n = 1;
  while (used.has(`${id}_${n}`)) n++;
  const unique = `${id}_${n}`;
  used.add(unique);
  return unique;
}

export function createFrenchFootnoteNode(fn, doc = null) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return null;
  const num = String(fn.num || fn.fnNum || '1');
  const supEl = d.createElement('sup');
  if (fn.id) supEl.setAttribute('id', claimCitationId(d, fn.id));
  const aEl = d.createElement('a');
  aEl.className = 'fn-lnk';
  aEl.setAttribute('href', fn.href || `#fn${num}`);
  // No title attribute: the visible badge already shows the number and the
  // .wb-inv label below is what a screen reader announces, so a tooltip only
  // duplicates it. Target shape:
  //   <sup><a class="fn-lnk" href="#fn1"><span class="wb-inv">Note de bas de page </span>1</a></sup>
  const spanEl = d.createElement('span');
  spanEl.className = 'wb-inv';
  spanEl.textContent = 'Note de bas de page ';
  aEl.appendChild(spanEl);
  aEl.appendChild(d.createTextNode(num));
  supEl.appendChild(aEl);
  return supEl;
}

export function makeCanonicalRef(fn, doc = null) {
  return createFrenchFootnoteNode(fn, doc);
}

export function isAlreadyCanonical(el, fn) {
  if (!el || el.tagName !== 'SUP') return false;
  const a = el.querySelector('a.fn-lnk');
  if (!a) return false;
  const href = a.getAttribute('href') || '';
  const num = String(fn.num || fn.fnNum || '1');
  const inv = a.querySelector('.wb-inv');
  return href === `#fn${num}` && Boolean(inv) && a.textContent.includes(num);
}

export function buildFootnoteInventory(enDoc, extractBlocksFn = null) {
  const root = enDoc.body || enDoc;
  const defined = collectDefinedFootnoteNums(root);
  const hasDefs = defined.size > 0;
  const hasRegion = hasDefs || hasFootnoteDefsRegion(root);
  const isReal = (n) => (hasDefs ? defined.has(n) : !hasRegion);
  const allowBareSup = allowsBareSupFootnotes(root.ownerDocument || enDoc);

  const refsByBlock = new Map();
  const leafBlocks = collectLeafBlocks(root, extractBlocksFn);

  leafBlocks.forEach((block, i) => {
    const refs = [];
    // Where each citation sits in the block, so a marker the French translation
    // dropped can be reinserted at the corresponding place instead of being
    // stacked at the end of the paragraph.
    const posOf = (node) => citationPosOf(block, node);
    block.querySelectorAll(
      'sup a[href], a.fn-lnk[href], a[href^="#_ftn"], a[href^="#ftn"], a[href^="#fn"], a[href^="#footnote-"], a[href^="#noteref"]'
    ).forEach((a) => {
      if ((a.closest && a.closest('.fn-rtn')) || (a.classList && a.classList.contains('fn-rtn'))) return;
      const href = a.getAttribute('href') || '';
      if (isFootnoteReturnHref(href)) return;
      if (!isVisibleFootnoteCitation(a, allowBareSup)) return;
      const num = numFromHref(href) || (/^\d{1,3}$/.test(a.textContent.trim()) ? a.textContent.trim() : null);
      if (num && isReal(num)) {
        refs.push({ num, href: `#fn${num}`, id: a.closest('sup')?.getAttribute('id') || a.getAttribute('id') || '', pos: posOf(a.closest('sup') || a) });
      }
    });

    block.querySelectorAll('sup').forEach((sup) => {
      if (sup.querySelector('a')) return;
      if (!isVisibleFootnoteCitation(sup, allowBareSup)) return;
      const num = sup.textContent.trim();
      if (/^\d{1,3}$/.test(num) && isReal(num)) {
        refs.push({ num, href: `#fn${num}`, id: sup.getAttribute('id') || '', pos: posOf(sup) });
      }
    });

    walkTextNodes(block, (node) => {
      if (!node.textContent) return;
      for (const m of node.textContent.matchAll(/\[([\d\s,;–—-]+?)\]/g)) {
        for (const num of expandCitationRefList(m[1])) {
          if (isReal(num)) {
            refs.push({ num, href: `#fn${num}`, id: '', pos: posOf(node) });
          }
        }
      }
    });

    if (refs.length > 0) {
      refsByBlock.set(i, refs);
    }
  });

  return { validNums: defined, hasDefs, hasRegion, refsByBlock, allowBareSup, blockCount: leafBlocks.length };
}

// Picks the French block that should receive an English block's citations.
//
// Identity first, position only as a guarded fallback. The generated French
// document is not state.frBlocks: the element of every skipped English row is
// removed from it and one element is inserted per extra French block, so its
// block order drifts away from state.frBlocks as soon as anything is dropped.
// Indexing into frBlocks then lands on an unrelated paragraph — that is where
// the phantom citations came from. Every other consumer (inline-edit,
// scroll-sync, details-sync) already resolves French blocks via data-fr-index.
export function resolveFrenchTarget(frDoc, frBlocks, enBlockIdx, pair, sameShape) {
  if (pair && pair.frIndex !== null) {
    const tagged = frDoc && typeof frDoc.querySelector === 'function'
      ? frDoc.querySelector(`[data-fr-index="${pair.frIndex}"]`)
      : null;
    if (tagged) return tagged;
    return sameShape ? (frBlocks[pair.frIndex] || null) : null;
  }
  // No usable pair: only trust the position when both sides have the same block
  // shape, otherwise report rather than guess.
  return sameShape ? (frBlocks[enBlockIdx] || null) : null;
}

// Footnote chrome: the citation links themselves, their screen-reader labels,
// the footer's return links, and the footer region. None of it is part of the
// sentence, so none of it may be measured or written into.
const FN_CHROME_SELECTOR = '.fn-lnk, .wb-inv, .fn-rtn, .wb-fnote, [role="note"]';

function isChromeTextNode(node) {
  const p = node && node.parentNode;
  return Boolean(
    p && p.nodeType === 1 && typeof p.closest === 'function' && p.closest(FN_CHROME_SELECTOR)
  );
}

// The text nodes that make up the sentence, in document order, with every
// piece of footnote chrome removed. Offsets measured against `textContent`
// instead count the 21 characters of a "Note de bas de page " label as prose,
// so an offset computed there points 21 characters past the sentence position
// it was derived from — which is how a restored marker ended up nested inside
// the hidden label of the citation before it.
function proseTextNodes(root) {
  const out = [];
  if (!root) return out;
  walkTextNodes(root, (node) => {
    if (node.textContent && !isChromeTextNode(node)) out.push(node);
  });
  return out;
}

function proseTextOf(root) {
  return proseTextNodes(root).map((n) => n.textContent || '').join('');
}

// Nearest word boundary to `at`, or null when there is none.
//
// A candidate only counts if it actually crosses whitespace. A forward match of
// zero length is not a boundary at all — it sits inside the current word — yet
// it always beat the real backward candidate, so the marker landed mid-word and
// split "isole" into "is<marker>ole". On a genuine tie the backward candidate
// wins, so the marker does not drift into the following word.
export function nearestWordBoundary(text, at) {
  const s = String(text || '');
  if (!s.length) return null;
  const pos = Math.max(0, Math.min(at, s.length));
  const fwd = s.slice(pos).match(/^[\s\u00A0]+(?:[;:,][\s\u00A0]*)?/);
  const fwdEnd = fwd && fwd[0].length > 0 && pos + fwd[0].length < s.length ? pos + fwd[0].length : null;
  const back = s.slice(0, pos).match(/(?:[;:,][\s\u00A0]*)?[\s\u00A0]+[^\s\u00A0]*$/);
  const backEnd = back && pos - back[0].length > 0 ? pos - back[0].length : null;
  if (fwdEnd === null) return backEnd;
  if (backEnd === null) return fwdEnd;
  return fwdEnd - pos <= pos - backEnd ? backEnd : fwdEnd;
}

// Inserts `node` at a prose offset, closing the gap that preceded it so the
// marker reads as "texte¹suite" rather than "texte ¹ suite". The whitespace
// that FOLLOWS the seam is left alone: it is the word separator, and trimming
// it too produced "ete1isole" instead of "ete1 isole".
//
// `consumeLength` > 0 replaces that many characters instead of inserting
// between them, and leaves the surrounding whitespace exactly as the
// translator wrote it: the typed number is being turned into the marker, not
// moved, so "chez 3 patients" becomes "chez <marker> patients" and the
// sentence is not reflowed around a guess.
function insertCanonicalAtProseOffset(root, offset, node, d, consumeLength = 0) {
  const nodes = proseTextNodes(root);
  if (!nodes.length) return false;
  let rest = Math.max(0, offset);
  let idx = nodes.length - 1;
  for (let i = 0; i < nodes.length; i++) {
    const len = (nodes[i].textContent || '').length;
    if (rest <= len) { idx = i; break; }
    rest -= len;
  }
  const host = nodes[idx];
  const parent = host && host.parentNode;
  if (!parent) return false;
  const text = host.textContent || '';
  const tail = text.slice(rest + Math.max(0, consumeLength));
  // A pure insertion closes the gap that preceded it. A consumption does not:
  // the whitespace before a typed number is the word separator, so closing it
  // too turned "chez 3 patients" into "chez3 patients".
  const lead = consumeLength > 0
    ? text.slice(0, rest)
    : text.slice(0, rest).replace(/[\s\u00A0]+$/, '');
  if (lead === '' && idx > 0) {
    // The offset fell on the run of whitespace that opens this node. Anchor at
    // the end of the previous prose node instead of leaving a gap behind it.
    const prev = nodes[idx - 1];
    if (!prev || !prev.parentNode) return false;
    prev.parentNode.insertBefore(node, prev.nextSibling);
    return true;
  }
  const frag = d.createDocumentFragment();
  if (lead) frag.append(d.createTextNode(lead));
  frag.append(node);
  if (tail) frag.append(d.createTextNode(tail));
  parent.replaceChild(frag, host);
  return true;
}

// Last resort: before the paragraph's closing punctuation, or at its end.
function insertBeforeClosingPunctuation(root, node, d) {
  const nodes = proseTextNodes(root);
  const last = nodes[nodes.length - 1];
  if (!last || !last.parentNode) {
    root.appendChild(node);
    return true;
  }
  const text = last.textContent || '';
  const tail = text.match(/[\s\u00A0]*[.;:!?»]+[\s\u00A0]*$/) || [''];
  const cut = tail[0].length ? text.length - tail[0].length : text.length;
  const parent = last.parentNode;
  const frag = d.createDocumentFragment();
  const head = text.slice(0, cut).replace(/[\s\u00A0]+$/, '');
  const rest = text.slice(cut);
  if (head) frag.append(d.createTextNode(head));
  frag.append(node);
  if (rest) frag.append(d.createTextNode(rest));
  parent.replaceChild(frag, last);
  return true;
}

// A note number standing on its own, separated by spaces or sentence punctuation
// on both sides — the shape a translator types for a run of notes
// ("... tumeurs bénignes et malignes 7 8 9 10 11 12").
//
// This branch is what makes that run findable. Without it, a space-separated
// number matched none of the marker shapes: the Unicode-superscript branch
// needs "⁷", the bracket branches need "[7]", the glued branch needs a letter
// immediately before, and the end-of-text branch only catches a lone number at
// the very end. Every note in the run then missed, fell through to the
// proportional insert, and the document came out with a second set of markers
// at the English offsets while the typed digits stayed in the sentence.
//
// Everything excluded here is a figure that is indistinguishable from a
// citation in flat text, and each exclusion has bitten in real input:
//
//   letters, accents  F1, P1, H2O, de 7 ans
//   .  ,              1,3 mg and 3.5 mg
//   /                 mg/m3
//   _                 the digits inside a ___GC_FN_12___ placeholder
//   , ;  + a digit    an element of a list: "(1, 24, 48 and 72 hours)". The
//                     decimal guard only caught "1,3" — a comma with no space —
//                     so the 1 of a spaced list was taken as a callout while the
//                     real "[1]" sat untouched at the end of the paragraph.
//   space + 3 digits  a thousands separator: "1 000 cas"
//
// A space-separated run of two or three digits is NOT excluded, because it is
// the very thing this branch exists to match. "7 8 9 10 11 12" and "1 000" are
// the same shape; only the 3-digit group separates them.
export const STANDALONE_CITATION_BEFORE = '(?<![0-9A-Za-zÀ-ÖØ-öø-ÿ.,/_%°×])(?<!\\d\\s*[,;])';
export const STANDALONE_CITATION_AFTER = '(?![0-9_])(?![.,][0-9])(?![,;]\\s*\\d)(?!\\s\\d{3}(?!\\d))';

export function standaloneCitationRe(patterns) {
  return `${STANDALONE_CITATION_BEFORE}(?:${patterns})${STANDALONE_CITATION_AFTER}`;
}

// The shapes a French translator types into prose where a citation belongs,
// anchored so that "F1", "mg3", "H2O" and "1,3" can never match: a number
// glued to a letter, or forming part of a decimal, is content. This is the same
// evidence rule Stage 2 applies to a <sup>, applied to bare text.
function typedCitationRe(num) {
  const n = escapeRe(num);
  return new RegExp(
    `\\[(?:fn[-_]?|#fn[-_]?|Note(?:\\s+de\\s+bas\\s+de\\s+page)?\\s*)?${n}\\s*\\]` +
    `|\\((?:fn[-_]?|#fn[-_]?|Note(?:\\s+de\\s+bas\\s+de\\s+page)?\\s*)?${n}\\s*\\)` +
    `|\\b(?:Note(?:\\s+de\\s+bas\\s+de\\s+page)?|Footnote)\\s*${n}\\b(?:\\s*[.:])?` +
    `|${standaloneCitationRe(n)}`,
    'gi'
  );
}

// Character spans of bracketed reference groups in a string.
//
// The bracket pass either converts a group or deliberately leaves it alone —
// when it holds a number this block does not cite, converting part of it would
// silently delete the rest from the sentence. Either way the group is not a
// sentence: placing a marker inside one splits it, so a left-alone "[7, 12]"
// became "[7<marker>, 12]". Both the number search and the proportional point
// respect these spans.
function bracketSpans(text) {
  const spans = [];
  const re = /[\[(][\d\s,;–—-]+[\])]/g;
  let m;
  while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

function insideAny(spans, at) {
  return spans.some(([a, b]) => at >= a && at < b);
}

// The nearest position to `at` that is not inside a bracket group. Moving
// backwards to the group's start is preferred: the marker belongs with the words
// that came before it, not with the group it was trying to avoid.
function outsideBrackets(spans, at, limit) {
  if (!insideAny(spans, at)) return at;
  for (let i = spans.length - 1; i >= 0; i--) {
    const [a, b] = spans[i];
    if (at >= a && at < b) {
      if (a > 0) return a;
      if (b < limit) return b;
      return null;
    }
  }
  return at;
}

// Consumes the citation's own number from the French text, searching only from
// the point where the English citation stood. Returns the prose offset the
// marker was consumed at, or null.
//
// Scoped to the carried-across position on purpose. A search over the whole
// block cannot tell note 23 from the 23 in "3,5 mg" or from the "1" of "F1";
// searching from the English position onwards is the only thing that
// distinguishes them, and it is why the citation's own *position in the block*
// is never used as its number (see buildFootnoteAnchorAlternation).
export function findTypedCitationInProse(root, num, relPos, leadFraction = 0.15) {
  const nodes = proseTextNodes(root);
  if (!nodes.length) return null;
  const text = nodes.map((n) => n.textContent || '').join('');
  if (!text.length) return null;
  const offLimits = bracketSpans(text);
  const from = typeof relPos === 'number' && relPos > 0 && relPos < 1
    ? Math.max(0, Math.floor(text.length * (relPos - leadFraction)))
    : 0;
  const re = typedCitationRe(num);
  re.lastIndex = from;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!insideAny(offLimits, m.index)) return { index: m.index, length: m[0].length };
    re.lastIndex = m.index + m[0].length;
  }
  return null;
}

export function convertFrenchBlockFootnotes(frBlock, enRefs, doc = null, opts = null) {
  const warnings = [];
  const report = [];
  // "placement" is a guess a human should look at; "recognition" is a binary,
  // evidence-based finding. The QA panel keeps the two apart, because only one
  // of them can be wrong in a way a reader would notice.
  const note = (kind, num, detail) => {
    warnings.push(`Footnote ${num}: ${detail}`);
    report.push({ kind, num, detail });
  };
  if (!frBlock || !enRefs || enRefs.length === 0) return { warnings, report };

  const d = doc || frBlock.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!d) return { warnings, report };

  // Whether a digit-only <sup> in the French block counts as a footnote marker.
  // Driven by the English source convention, not the Word document: mammoth
  // drops Word footnote references, so the French side never carries explicit
  // footnote chrome and would otherwise accept every unit exponent.
  const allowBareSup = opts && typeof opts.allowBareSup === 'boolean'
    ? opts.allowBareSup
    : allowsBareSupFootnotes(frBlock);

  const remaining = new Map();
  const fnByNum = new Map();
  enRefs.forEach((fn) => {
    remaining.set(fn.num, (remaining.get(fn.num) || 0) + 1);
    if (!fnByNum.has(fn.num)) fnByNum.set(fn.num, fn);
  });

  const consume = (num) => {
    const count = remaining.get(num) || 0;
    if (count <= 1) {
      remaining.delete(num);
    } else {
      remaining.set(num, count - 1);
    }
  };

  // PASS 1 — DOM-level markers in any shape -> canonical sup
  //
  // Every marker resolves to the node that *hosts* it before anything is
  // rebuilt. A citation is normally already canonical by the time this runs:
  // the generation pass rebuilt it from the English markup, so this pass used
  // to take the <a> rather than its <sup> (the sup's own textContent is the
  // screen-reader label, not a number, so it was skipped for having no number
  // and the anchor handled the citation instead). isAlreadyCanonical only ever
  // ran on a <sup>, so it never fired, every correct citation was replaced by a
  // fresh one, and claimCitationId re-numbered its id to "fn1-rf_1" —
  // orphaning the footer's return link, which still pointed at #fn1-rf.
  frBlock.querySelectorAll('sup, a.fn-lnk, a[href^="#fn"], a[href^="#_ftn"], a[href^="#ftn"], a[href^="#footnote-"], a[href^="#noteref"]').forEach((el) => {
    if ((el.closest && el.closest('.fn-rtn')) || (el.classList && el.classList.contains('fn-rtn'))) return;
    const href = el.getAttribute('href') || '';
    if (isFootnoteReturnHref(href)) return;
    // A <sup> only counts as a footnote marker when it carries footnote chrome
    // and renders a visible number; "mg/m³", "³²P" and screen-reader-only
    // markers must survive as ordinary content.
    if (el.tagName === 'SUP' && !isVisibleFootnoteCitation(el, allowBareSup)) return;

    const sup = el.tagName === 'SUP' ? el : el.closest('sup');
    const inner = el.tagName === 'A' ? el : (el.querySelector ? el.querySelector('a[href]') : null);
    const innerHref = (inner && inner.getAttribute('href')) || '';
    if (innerHref && isFootnoteReturnHref(innerHref)) return;
    const own = (el.textContent || '').trim();
    const num = numFromHref(href) || numFromHref(innerHref) || (/^\d{1,3}$/.test(own) ? own : null);
    if (!num || !remaining.has(num)) return;
    const fn = fnByNum.get(num);
    const host = sup || el;
    if (isAlreadyCanonical(host, fn)) {
      consume(num);
      return;
    }
    // A <sup> holding nothing but the anchor is the marker; the anchor alone is
    // only the host when there is no wrapper to promote it into.
    const target = (el.tagName === 'A' && !sup) ? el : host;
    const canonical = makeCanonicalRef(fn, d);
    if (target.parentNode) {
      target.parentNode.replaceChild(canonical, target);
    } else {
      target.replaceWith(canonical);
    }
    consume(num);
  });

  // PASS 2 — bracketed list in the French text: [7], [7, 8], [7-12] -> canonical sups
  //
  // The same grammar as the generated-HTML path (expandCitationRefList), so the
  // two routes can no longer disagree about what "[7-12]" means, and markers are
  // emitted adjacently instead of separated by a printed ", ". A bracket is only
  // converted when EVERY number in it is a citation of this block: converting part
  // of it would silently delete the rest from the sentence.
  const brackets = /\[\s*([\d\s,;–—-]+?)\s*\]/g;
  walkTextNodes(frBlock, (node) => {
    if (!node.textContent || remaining.size === 0) return;
    const text = node.textContent;
    let match;
    const replacements = [];
    brackets.lastIndex = 0;
    while ((match = brackets.exec(text)) !== null) {
      const all = expandCitationRefList(match[1]);
      if (all.length === 0) continue;
      const nums = all.filter((n) => remaining.has(n));
      if (nums.length === 0) continue;
      if (nums.length !== all.length) {
        const unknown = all.filter((n) => !remaining.has(n));
        const detail = `[${all.join(', ')}] left as text: ${unknown.join(', ')} not cited by this block`;
        warnings.push(detail);
        report.push({ kind: 'recognition', num: unknown.join(', '), detail });
        continue;
      }
      replacements.push({ index: match.index, length: match[0].length, nums });
    }
    if (replacements.length > 0) {
      const frag = d.createDocumentFragment();
      let last = 0;
      replacements.forEach((rep) => {
        frag.append(d.createTextNode(text.slice(last, rep.index)));
        rep.nums.forEach((num) => {
          frag.append(makeCanonicalRef(fnByNum.get(num), d));
          consume(num);
        });
        last = rep.index + rep.length;
      });
      frag.append(d.createTextNode(text.slice(last)));
      if (node.parentNode) {
        node.parentNode.replaceChild(frag, node);
      } else {
        node.replaceWith(frag);
      }
    }
  });

  // PASS 3 — place what is left, in the order of attempts, always with a
  // warning. Placement is inference on a foreign-language string, so every
  // branch here ends in a report rather than in silence.
  //
  //   1. consume the citation's own number, searched from where the English
  //      citation stood (attempts 1 and 2 of the spec)
  //   2. place it at the matching proportional point, snapped to a word
  //      boundary (attempt 4)
  //   3. place it before the closing punctuation (attempt 5)
  //
  // The order matters: consuming a number the translator typed is always better
  // than inventing a position, because it is the one point the translator and
  // the reader both saw. A whole-block search was the ONLY way a bare number
  // used to be recognised, and only when exactly one note was outstanding, so a
  // paragraph citing 3 and 12 left the typed "12" in the sentence as text and
  // then set a second marker beside it — the duplicate-badge-plus-raw-digit
  // symptom, one paragraph away from being fixed.
  const lost = [];
  [...remaining.entries()].forEach(([num, count]) => {
    for (let k = 0; k < count; k++) lost.push(fnByNum.get(num));
  });

  // Each placement mutates the prose, so the offsets still to come are read
  // against the sentence as it stands when they run. Back to front, so every
  // earlier offset stays valid.
  const unplaced = [];
  while (lost.length > 0) {
    const prose = proseTextOf(frBlock);
    const withPos = lost.filter((fn) => typeof fn.pos === 'number' && fn.pos > 0 && fn.pos < 1);
    const target = withPos.length ? withPos[withPos.length - 1] : lost[0];
    const at = lost.indexOf(target);
    if (at !== -1) lost.splice(at, 1);
    const num = target.num;
    const relPos = typeof target.pos === 'number' && target.pos > 0 && target.pos < 1 ? target.pos : null;
    if (!prose.length) { unplaced.push(target); continue; }

    // Attempts 1 and 2 — the citation's own number, typed where the English
    // citation stood. Bracketed lists were already consumed by PASS 2.
    const typed = findTypedCitationInProse(frBlock, num, relPos);
    if (typed && insertCanonicalAtProseOffset(frBlock, typed.index, makeCanonicalRef(target, d), d, typed.length)) {
      consume(num);
      note(
        'placement',
        num,
        relPos === null
          ? 'typed number consumed in the French text; the English position could not be confirmed'
          : `typed number consumed at ${Math.round((typed.index / Math.max(1, prose.length)) * 100)}% of the block, where the English citation sits at ${Math.round(relPos * 100)}% — confirm it was the marker, not a figure`
      );
      continue;
    }

    // Attempt 4 — the proportional point, snapped to a word boundary, and kept
    // clear of any bracketed group the bracket pass declined.
    if (relPos !== null) {
      const snapped = nearestWordBoundary(prose, Math.floor(prose.length * relPos));
      const boundary = snapped === null ? null : outsideBrackets(bracketSpans(prose), snapped, prose.length);
      if (boundary !== null && boundary > 0 && boundary < prose.length
        && insertCanonicalAtProseOffset(frBlock, boundary, makeCanonicalRef(target, d), d)) {
        consume(num);
        note('placement', num, `no marker in the French text; restored at ${Math.round((boundary / Math.max(1, prose.length)) * 100)}% of the block, where the English citation stands`);
        continue;
      }
    }

    // Attempt 5 — before the closing punctuation.
    insertBeforeClosingPunctuation(frBlock, makeCanonicalRef(target, d), d);
    consume(num);
    note('placement', num, 'no marker and no position in the English source; restored before the closing punctuation — confirm it supports the right claim');
  }

  for (const fn of unplaced) {
    frBlock.appendChild(makeCanonicalRef(fn, d));
    consume(fn.num);
    note('placement', fn.num, 'the French block has no text to place the marker in; appended to the block');
  }

  return { warnings, report };
}

export function verifyFootnotes(enDoc, frDoc, inv) {
  const problems = [];
  const enCounts = new Map();
  inv.refsByBlock.forEach((refs) =>
    refs.forEach((r) => enCounts.set(r.num, (enCounts.get(r.num) || 0) + 1))
  );
  // A footnote footer carries one return link per note, and until
  // processFootnotes step 3 has run those links still look exactly like
  // citations: class "fn-lnk", href "#fn1". Counting them made every correct
  // document report "cited 1x in English vs 2x in French", so they are excluded
  // here the same way extractBlockFootnotes excludes them.
  const frCounts = new Map();
  frDoc.querySelectorAll('sup a.fn-lnk, a.fn-lnk').forEach((a) => {
    if ((a.closest && a.closest('.fn-rtn')) || (a.classList && a.classList.contains('fn-rtn'))) return;
    const href = a.getAttribute('href') || '';
    if (isFootnoteReturnHref(href)) return;
    const num = numFromHref(href) || (/^\d{1,3}$/.test(a.textContent.trim()) ? a.textContent.trim() : null);
    if (num) frCounts.set(num, (frCounts.get(num) || 0) + 1);
  });

  for (const [num, count] of enCounts) {
    const frC = frCounts.get(num) || 0;
    if (frC === 0) {
      problems.push(`Footnote ${num}: cited ${count}× in English, but missing in French`);
    } else if (frC !== count) {
      problems.push(`Footnote ${num}: cited ${count}× in English vs ${frC}× in French`);
    }
  }
  for (const num of frCounts.keys()) {
    if (!enCounts.get(num)) {
      problems.push(`Footnote ${num}: cited in French but not in English source`);
    }
    if (inv.hasDefs && !frDoc.querySelector(`#fn${num}`) && !frDoc.querySelector(`[id="fn${num}"]`)) {
      problems.push(`Footnote ${num}: definition target #fn${num} not found in French footer`);
    }
  }
  return problems;
}

export function isFootnoteHeadingBlock(block) {
  if (!block) return false;
  if (block.el && typeof block.el.closest === 'function' && (block.el.id === 'fn' || block.el.closest('#fn') || (block.el.closest('.wb-fnote, [role="note"]') && isHeadingTag(block.tag)))) {
    return true;
  }
  if (!isHeadingTag(block.tag) && block.tag !== 'dt') return false;
  return /^\s*(?:Footnotes?(?:\s+and\s+references?)?|Notes?\s+de\s+bas\s+de\s+page(?:\s+et\s+r[ée]f[ée]rences?)?)\s*[:：]?\s*$/i.test((block.text || '').trim());
}


export function isFootnoteContentBlock(block, allBlocks = []) {
  if (!block) return false;
  const tag = (block.tag || '').toLowerCase();
  if (['td', 'th', 'caption', 'figcaption', 'summary', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    return false;
  }
  if (block.inTable || (block.el && typeof block.el.closest === 'function' && block.el.closest('table, tbody, thead, tfoot, tr, td, th'))) {
    return false;
  }
  if (block.el && typeof block.el.closest === 'function' && block.el.closest('dd[id^="fn"], .wb-fnote dl, .wb-fnote, [role="note"] dl, [role="note"], dl.fnote, #fn, .footnotes')) {
    return true;
  }
  const txt = (block.text || '').trim();
  if (
    /^\s*(?:Note(?:\s+de\s+bas\s+de\s+page)?|Footnote)\s*\d+\s*[:.\-–—]?\s*/i.test(txt)
  ) {
    return true;
  }
  if (allBlocks && allBlocks.length > 0) {
    const idx = allBlocks.indexOf(block);
    if (idx > 0) {
      for (let k = idx - 1; k >= 0; k--) {
        const prev = allBlocks[k];
        if (isFootnoteHeadingBlock(prev)) {
          if (
            /^\s*(?:(?:\[|\()\s*\d{1,3}\s*(?:\]|\))\s*[:.\-–—]?\s+|\d{1,3}\s*[:.]\s+|\d{1,3}\s*[-–—]\s+|\d{1,3}\)\s+|\bNote(?:\s+de\s+bas\s+de\s+page)?\s*\d+\s*[:.\-–—]?\s*)/i.test(txt) ||
tag === 'dd' || tag === 'li' || tag === 'p'
          ) {
            return true;
          }
        if (isHeadingTag(prev.tag)) {
          return false;
        }
      }
    }
  }
  }
  return false;
}

export function extractFootnoteNumber(block, allBlocks = []) {
  if (!block) return null;
  if (block.el && typeof block.el === 'object') {
    const dd = typeof block.el.closest === 'function' ? block.el.closest('dd[id^="fn"]') : null;
    const elId = (dd && dd.id) || (block.el.id || '');
    const idMatch = elId.match(/^fn([a-zA-Z0-9_-]+)$/i);
    if (idMatch) return idMatch[1];

    const prevEl = block.el.previousElementSibling;
    if (prevEl && prevEl.tagName && prevEl.tagName.toLowerCase() === 'dt') {
      const dtTxt = prevEl.textContent || '';
      const dtMatch = dtTxt.match(/^(?:Footnote|Note\s+de\s+bas\s+de\s+page)\s*([a-zA-Z0-9_-]+)/i);
      if (dtMatch) return dtMatch[1];
    }
  }

  const txt = (block.text || '').trim();
  const prefixMatch = txt.match(/^\s*(?:Note(?:\s+de\s+bas\s+de\s+page)?|Footnote)\s*([a-zA-Z0-9_-]+)\s*[:.\-–—]?\s*/i);
  if (prefixMatch) return prefixMatch[1];

  const numMatch = txt.match(/^\s*(?:\[|\()?(\d{1,3})(?:\]|\))?\s*[:.\-–—)]\s*/);
  if (numMatch) return numMatch[1];

  const bracketMatch = txt.match(/^\s*\[(\d{1,3})\]\s*/);
  if (bracketMatch) return bracketMatch[1];

  if (allBlocks && allBlocks.length > 0) {
    const idx = allBlocks.indexOf(block);
    if (idx > 0) {
      let headerIdx = -1;
      for (let k = idx - 1; k >= 0; k--) {
        if (isFootnoteHeadingBlock(allBlocks[k])) {
          headerIdx = k;
          break;
        }
        if (isHeadingTag(allBlocks[k].tag)) break;
      }
      if (headerIdx !== -1) {
        let fnSeq = 0;
        for (let k = headerIdx + 1; k <= idx; k++) {
          if (isFootnoteContentBlock(allBlocks[k], allBlocks)) {
            fnSeq++;
          }
        }
        if (fnSeq > 0) return String(fnSeq);
      }
    }
  }

  return null;
}

export function extractBlockFootnoteNumbers(block) {
  if (!block) return [];
  const nums = [];
  if (block.el && typeof block.el.querySelectorAll === 'function') {
    const allowBareSup = allowsBareSupFootnotes(block.el);
    const fnEls = block.el.querySelectorAll('sup a.fn-lnk, a.fn-lnk, sup, a[href^="#fn"], a[href^="#footnote-"], a[href^="#noteref"], [id$="-rf"]');
    fnEls.forEach((el) => {
      const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
      const id = el.getAttribute ? (el.getAttribute('id') || '') : '';
      const text = (el.textContent || '').trim();
      // A <sup> is only a footnote marker when it carries footnote chrome and
      // renders a visible number; unit exponents (m³, cm², ³²P) must not feed
      // the alignment scores.
      if (el.tagName === 'SUP' && !isVisibleFootnoteCitation(el, allowBareSup)) return;
      const hrefMatch = href.match(/#(?:fn|footnote-)?(\d{1,3})/i);
      const idMatch = id.match(/^fn(\d{1,3})-rf$/i);
      const textMatch = text.match(/\b(\d{1,3})\b/);
      const n = (hrefMatch && hrefMatch[1]) || (idMatch && idMatch[1]) || (textMatch && textMatch[1]);
      if (n && !nums.includes(n)) nums.push(n);
    });
  }
  const rawText = block.text || '';
  const textMatches = Array.from(rawText.matchAll(/\[(\d{1,3})\]|\b(?:Note\s+de\s+bas\s+de\s+page|Footnote)\s+(\d{1,3})\b/gi));
  for (const m of textMatches) {
    const n = m[1] || m[2];
    if (n && !nums.includes(n)) nums.push(n);
  }
  // No "digit glued to a word" heuristic here: "mg/m3", "P1", "H2O" and "n3"
  // look exactly like a citation and this score short-circuits block pairing.
  return nums;
}

function isHeadingTag(tag) {
  return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes((tag || '').toLowerCase());
}
