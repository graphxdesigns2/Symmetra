// Auto-generated imports
import {
  isOmittedEnglishEquivalentBlock,
  isPdfSidePanelElement,
  isTextEquivalentSummaryText,
} from './alignment.js';
import {
  computeAlignment,
} from './alignment-compute.js';
import {
  insertExtraFrenchElement,
  replaceBlockTextPreservingLinks,
} from './block-text-replace.js';
import {
  cleanCaptionTags,
  cleanThTags,
  extractBlocks,
  getBlockContent,
  unwrapBrSegments,
} from './block-utils.js';
import {
  expandCitationRefList,
  stripFootnoteDefinitionLabel,
} from './footnotes.js';
import {
  enCodeEditor,
  enCodeGutter,
  enCodeHighlight,
  enCodeHighlightInner,
  enCodeStats,
  enCodeWrap,
  enPreviewFrame,
  frBlockCountBadge,
  frCodeEditor,
  frCodeGutter,
  frCodeHighlight,
  frCodeHighlightInner,
  frCodeStats,
  frCodeWrap,
  frPaneTitle,
  frPreviewFrame,
  frViewCodeBtn,
  frViewSplitBtn,
  frViewVisualBtn,
  htmlInput,
} from './dom-refs.js';
import {
  cleanFrenchHtmlPostProcess,
} from './footnote-transform.js';
import {
  buildFrenchFrameSource,
  buildFrenchFrameSourceFromHtml,
} from './french-frame.js';
import {
  formatFrenchRootRelativeLink,
  isFragmentHref,
} from './french-url.js';
import {
  convertFrenchImageSrc,
  synthesizeFrenchSummary,
} from './french-utils.js';
import {
  autoLocalizeAllPdfSidePanels,
  cleanFrenchDocImages,
  getSampleOrBoilerplateTranslation,
} from './pdf-side-panel.js';
import {
  alignPreviewBlocks,
  applyActiveHighlight,
  jumpToBlock,
  programmaticScrollEls,
  setupIframeEventListeners,
  updateActiveBlockHud,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  applyPreviewZoom,
} from './zoom.js';


function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatHtmlCode(html) {
  if (!html || typeof html !== 'string') return '';
  const trimmed = html.trim();
  if (!trimmed) return '';

  const hasDocType = /^<!doctype/i.test(trimmed);
  const docTypeMatch = trimmed.match(/^<!doctype[^>]*>/i);
  const docTypeStr = docTypeMatch ? docTypeMatch[0] : '<!DOCTYPE html>';
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);
  const hasHeadTag = /<head[\s>]/i.test(trimmed);

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');

  const tab = '  ';
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  // Elements that are strictly inline
  const inlineTags = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn',
    'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp',
    'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'br'
  ]);

  // Elements where content and closing tag should stay on one line (unless containing block elements)
  const singleLineBlockTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'dt', 'dd',
    'th', 'td', 'caption', 'label', 'legend', 'title', 'button',
    'summary', 'figcaption', 'option'
  ]);

  // Elements where whitespace must be preserved verbatim
  const preserveWhitespaceTags = new Set(['pre', 'textarea', 'script', 'style']);

  function serializeAttributes(el) {
    if (!el.attributes || el.attributes.length === 0) return '';
    let attrs = '';
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs += ` ${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`;
    }
    return attrs;
  }

  function hasBlockChildren(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (!inlineTags.has(tag)) return true;
      }
    }
    return false;
  }

  function formatInlineContent(el) {
    let result = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.nodeValue.replace(/[ \t\r\n]+/g, ' ');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const attrs = serializeAttributes(child);
        if (voidTags.has(tag)) {
          result += `<${tag}${attrs}>`;
        } else {
          result += `<${tag}${attrs}>${formatInlineContent(child)}</${tag}>`;
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        result += `<!--${child.nodeValue}-->`;
      }
    }
    return result;
  }

  function formatNode(node, level = 0) {
    const indent = tab.repeat(level);

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue.replace(/[ \t\r\n]+/g, ' ').trim();
      return text ? `${indent}${text}\n` : '';
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return `${indent}<!--${node.nodeValue}-->\n`;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const attrs = serializeAttributes(node);

      if (voidTags.has(tag)) {
        return `${indent}<${tag}${attrs}>\n`;
      }

      if (preserveWhitespaceTags.has(tag)) {
        return `${indent}<${tag}${attrs}>${node.innerHTML}</${tag}>\n`;
      }

      // Check if this is a leaf/single-line tag or element with only inline/text children
      const containsBlock = hasBlockChildren(node);
      const isSingleLineCandidate = singleLineBlockTags.has(tag) || (!containsBlock && node.childNodes.length > 0);

      if (!containsBlock && isSingleLineCandidate) {
        const inlineInner = formatInlineContent(node).trim();
        if (!inlineInner) {
          return `${indent}<${tag}${attrs}></${tag}>\n`;
        }
        // Break lines after <br> so each segment starts on its own line,
        // matching the formatting of the pasted English source.
        if (/<br(?:\s[^>]*)?>/i.test(inlineInner)) {
          const contIndent = `${indent}${tab}`;
          const segments = inlineInner.split(/<br(?:\s[^>]*)?>/i);
          const brTags = inlineInner.match(/<br(?:\s[^>]*)?>/gi) || [];
          let broken = segments[0].replace(/\s+$/, '');
          for (let i = 0; i < brTags.length; i++) {
            const isLast = i === brTags.length - 1;
            const next = (segments[i + 1] || '').replace(/^\s+/, '').replace(/\s+$/, '');
            if (next) {
              broken += `${brTags[i]}\n${contIndent}${next}`;
            } else if (!isLast) {
              broken += `${brTags[i]}\n${contIndent}`;
            } else {
              broken += brTags[i];
            }
          }
          return `${indent}<${tag}${attrs}>${broken}</${tag}>\n`;
        }
        return `${indent}<${tag}${attrs}>${inlineInner}</${tag}>\n`;
      }

      // Container element with child elements.
      // Hoist leading text onto the opening-tag line so mixed content like
      // <li>text<ul>…</ul></li> matches the pasted English source style.
      let inner = '';
      let leadingText = '';
      let firstElementIdx = 0;
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) {
          const t = child.nodeValue.replace(/[ \t\r\n]+/g, ' ').trim();
          if (t) leadingText += (leadingText ? ' ' : '') + t;
          firstElementIdx = i + 1;
        } else {
          break;
        }
      }
      for (let i = firstElementIdx; i < node.childNodes.length; i++) {
        inner += formatNode(node.childNodes[i], level + 1);
      }

      if (!inner.trim() && !leadingText) {
        return `${indent}<${tag}${attrs}></${tag}>\n`;
      }

      if (leadingText && !inner.trim()) {
        return `${indent}<${tag}${attrs}>${leadingText}</${tag}>\n`;
      }

      if (leadingText) {
        return `${indent}<${tag}${attrs}>${leadingText}\n${inner}${indent}</${tag}>\n`;
      }

      return `${indent}<${tag}${attrs}>\n${inner}${indent}</${tag}>\n`;
    }

    return '';
  }

  // Determine what roots to format
  let output = '';

  if (hasDocType || hasHtmlTag) {
    if (hasDocType) {
      output += `${docTypeStr}\n`;
    }
    const htmlEl = doc.documentElement;
    const htmlAttrs = serializeAttributes(htmlEl);
    output += `<html${htmlAttrs}>\n`;

    // Head
    const headEl = doc.head;
    if (hasHeadTag || (headEl && headEl.childNodes.length > 0)) {
      const headAttrs = serializeAttributes(headEl);
      let headInner = '';
      for (let i = 0; i < headEl.childNodes.length; i++) {
        headInner += formatNode(headEl.childNodes[i], 2);
      }
      if (headInner.trim()) {
        output += `  <head${headAttrs}>\n${headInner}  </head>\n`;
      } else if (hasHeadTag) {
        output += `  <head${headAttrs}></head>\n`;
      }
    }

    // Body
    const bodyEl = doc.body;
    const bodyAttrs = serializeAttributes(bodyEl);
    let bodyInner = '';
    for (let i = 0; i < bodyEl.childNodes.length; i++) {
      bodyInner += formatNode(bodyEl.childNodes[i], 2);
    }
    if (bodyInner.trim()) {
      output += `  <body${bodyAttrs}>\n${bodyInner}  </body>\n`;
    } else {
      output += `  <body${bodyAttrs}></body>\n`;
    }

    output += `</html>`;
  } else {
    // Fragment format
    const bodyEl = doc.body;
    for (let i = 0; i < bodyEl.childNodes.length; i++) {
      output += formatNode(bodyEl.childNodes[i], 0);
    }
  }

  return output.trim().replace(/\u00A0/g, '&nbsp;');
}

// Pull live direct-typing edits from the French visual preview frame into
// state.frBlocks. Uses getBlockContent (layout-independent) — never
// innerText, which is empty for hidden frames and missing in some webviews.
// Empty results are skipped: indistinguishable from an unreadable frame, and
// clobbering state with '' would wipe blocks.

// Harvest-safe reading of a live French block: serialize rendered citation
// markers back into the typed bracket form BEFORE getBlockContent flattens
// them. getBlockContent keeps a marker's visible number ("36") while dropping
// only its screen-reader label, so adjacent markers flatten into fused digit
// runs ("363739") that the matchers then refuse as ambiguous — and each
// harvest wrote those runs back into state, doubling them every cycle
// (40 -> 4040 -> 40404040). Reading "<sup>36</sup><sup>37</sup><sup>39</sup>"
// as "[36, 37, 39]" makes the harvest idempotent: regenerating from harvested
// text reproduces the same markers instead of accumulating digits. Only
// canonical in-text citations (a.fn-lnk, never return links) are serialized;
// adjacent duplicates collapse so a doubled marker heals instead of persisting.
function getHarvestableBlockContent(el) {
  if (!el) return '';
  try {
    if (typeof el.cloneNode !== 'function') return getBlockContent(el);
    const clone = el.cloneNode(true);
    const numOf = (a) => {
      const href = (a.getAttribute && a.getAttribute('href')) || '';
      const m = href.match(/#fn-?(\d{1,3})/i);
      if (m) return m[1];
      const t = (a.textContent || '').trim();
      return /^\d{1,3}$/.test(t) ? t : null;
    };
    const isReturn = (a) => {
      if (a.closest && a.closest('.fn-rtn')) return true;
      const href = (a.getAttribute && a.getAttribute('href')) || '';
      return /-rf/i.test(href);
    };
    const anchors = Array.from(clone.querySelectorAll('a.fn-lnk'))
      // NOTE: no isConnected check — the clone is detached by construction,
      // so isConnected is always false here. Attachment is irrelevant: the
      // clone mirrors the live subtree one-to-one.
      .filter((a) => !isReturn(a) && numOf(a));
    if (anchors.length === 0) return getBlockContent(el);
    const hostOf = (a) => {
      const p = a.parentNode;
      if (p && p !== clone && p.tagName && String(p.tagName).toLowerCase() === 'sup') {
        try {
          if (p.querySelectorAll('a').length === 1) return p;
        } catch (_) { /* fall through to the anchor itself */ }
      }
      return a;
    };
    const isWsNode = (n) => !!n && n.nodeType === 3 && !/\S/.test(n.textContent || '');
    const items = anchors.map((a) => ({ anchor: a, host: hostOf(a), num: numOf(a) }));
    // Group same-parent hosts separated only by whitespace, so a cluster
    // serializes as one bracket. Markers nested inside different elements
    // stay separate brackets — still matchable, just not joined.
    const groupedHosts = new Set();
    const groups = [];
    items.forEach((it) => {
      if (!it.host.parentNode) return;
      const prev = groups.length ? groups[groups.length - 1] : null;
      let adjacent = false;
      if (prev && prev.parent === it.host.parentNode) {
        adjacent = true;
        let n = prev.last.nextSibling;
        let reached = false;
        while (n) {
          if (n === it.host) { reached = true; break; }
          if (!groupedHosts.has(n) && !isWsNode(n)) { adjacent = false; break; }
          n = n.nextSibling;
        }
        if (!reached) adjacent = false;
      }
      if (adjacent) {
        prev.items.push(it);
        prev.last = it.host;
      } else {
        groups.push({ parent: it.host.parentNode, last: it.host, items: [it] });
      }
      groupedHosts.add(it.host);
    });
    const owner = clone.ownerDocument || (typeof document !== 'undefined' ? document : null);
    groups.forEach((g) => {
      const nums = [];
      g.items.forEach((it) => {
        if (it.num && nums[nums.length - 1] !== it.num) nums.push(it.num);
      });
      if (!nums.length || !g.items[0].host.parentNode) return;
      const first = g.items[0].host;
      const last = g.items[g.items.length - 1].host;
      // Conservative: only whitespace or grouped markers may sit between the
      // first and last host. Anything else means the range is not a pure
      // marker run — leave the DOM untouched rather than risk prose.
      const inter = [];
      let n = first.nextSibling;
      while (n && n !== last) { inter.push(n); n = n.nextSibling; }
      if (!inter.every((x) => isWsNode(x) || (x.nodeType === 1 && groupedHosts.has(x)))) return;
      const prev = first.previousSibling;
      const next = last.nextSibling;
      const prevText = prev && prev.nodeType === 3 ? (prev.textContent || '') : null;
      const nextText = next && next.nodeType === 3 ? (next.textContent || '') : null;
      const lead = (prevText === null || prevText === '') ? '' : (/[\s ([]$/.test(prevText) ? '' : ' ');
      const trail = (nextText === null || nextText === '') ? '' : (/^[\s )\].,;:!?']/.test(nextText) ? '' : ' ');
      inter.forEach((x) => { if (x.parentNode) x.parentNode.removeChild(x); });
      g.items.forEach((it, k) => {
        if (k > 0 && it.host.parentNode) it.host.parentNode.removeChild(it.host);
      });
      if (!first.parentNode || !owner || typeof owner.createTextNode !== 'function') return;
      first.parentNode.replaceChild(
        owner.createTextNode(`${lead}[${nums.join(', ')}]${trail}`),
        first
      );
    });
    return getBlockContent(clone);
  } catch (_) {
    return getBlockContent(el);
  }
}

function harvestVisualEdits() {
  let changed = false;
  try {
    const frDoc = frPreviewFrame && (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document);
    if (!frDoc) return false;
    const editables = frDoc.querySelectorAll('.gc-swap-editable');
    editables.forEach((el) => {
      const frIdx = el.hasAttribute('data-fr-index') ? parseInt(el.getAttribute('data-fr-index'), 10) : null;
      if (frIdx === null || isNaN(frIdx) || !state.frBlocks[frIdx]) return;
      const liveText = getHarvestableBlockContent(el);
      if (liveText && liveText.replace(/\u00A0/g, ' ') !== (state.frBlocks[frIdx].text || '').replace(/\u00A0/g, ' ')) {
        state.frBlocks[frIdx].text = liveText;
        changed = true;
      }
    });
    } catch (_) {}
  return changed;
}

let visualEditSyncTimer = null;

// Live-sync visual typing into the code pane (debounced). Called from the FR
// frame's input listener via window bridge. Regenerates only while the code
// pane is visible and the user hasn't typed manual edits into it (those win
// until the next full view switch); state is still harvested either way.
function refreshCodeFromVisualEdits() {
  try {
    if (state.frViewMode === 'visual') return;
    harvestVisualEdits();
    if (state.frCodeModified) return;
    if (!frCodeEditor) return;
    if (visualEditSyncTimer) clearTimeout(visualEditSyncTimer);
    visualEditSyncTimer = setTimeout(() => {
      visualEditSyncTimer = null;
      try {
        if (state.frViewMode === 'visual' || state.frCodeModified || !frCodeEditor) return;
        harvestVisualEdits();
        frCodeEditor.value = generateFrenchHtmlSource();
        state.frGeneratedCode = frCodeEditor.value;
        updateFrCodeView();
      } catch (_) {}
    }, 500);
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.refreshCodeFromVisualEdits = refreshCodeFromVisualEdits;
}

// Re-sync the code pane after a visual-side block mutation (replace / delete
// / resolve / split / merge / undo). Those paths update state plus the live
// preview DOM directly, and programmatic DOM edits never fire the `input`
// events that drive refreshCodeFromVisualEdits — so without this the editor
// keeps showing (and centering on) the pre-edit text. Skipped while the code
// pane is hidden, and whenever the editor holds manual edits (those win until
// the next full view switch, same contract as refreshCodeFromVisualEdits).
function refreshCodeViewAfterBlockEdit() {
  try {
    if (!frCodeEditor) return;
    if (state.frViewMode === 'visual') return;
    if (state.frCodeModified || state.frCustomHtml) return;
    frCodeEditor.value = generateFrenchHtmlSource();
    state.frGeneratedCode = frCodeEditor.value;
    updateFrCodeView();
    syncCodeViewToActiveBlock();
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.refreshCodeViewAfterBlockEdit = refreshCodeViewAfterBlockEdit;
}

const FR_STAMP_RE = /<([a-zA-Z][a-zA-Z0-9-]*)[^>]*\sdata-fr-index="(\d+)"[^>]*>/g;
const FR_VOID_TAG_RE = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;

// Last line of the element whose stamped open tag ends at afterIdx on
// lines[startLine]. Balance-counts same-name tags so nested structures
// resolve; attribute values are quote-shielded first so a ">" inside one
// cannot fake a tag boundary. Unclosed elements clamp to the document end.
// NOTE: keeps the same quote limitation as the delivery strip below (an
// attribute value containing ">" defeats both, degrading that block to text
// matching rather than misplacing it).
function elementEndLine(lines, startLine, tag, afterIdx) {
  if (FR_VOID_TAG_RE.test(tag)) return startLine;
  let depth = 1;
  for (let i = startLine; i < lines.length; i++) {
    const text = (i === startLine ? lines[i].slice(afterIdx) : lines[i])
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/"[^"]*"|'[^']*'/g, '""');
    const re = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*>`, 'gi');
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1] === '/') {
        depth -= 1;
        if (depth <= 0) return i;
      } else if (!/\/\s*>$/.test(m[0])) {
        depth += 1;
      }
    }
  }
  return lines.length - 1;
}

function publishFrCodeLineMap(stampedFormatted, finalHtml) {
  const byIndex = new Map();
  try {
    const lines = String(stampedFormatted || '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      FR_STAMP_RE.lastIndex = 0;
      let m;
      while ((m = FR_STAMP_RE.exec(lines[i])) !== null) {
        const idx = parseInt(m[2], 10);
        if (isNaN(idx)) continue;
        const end = elementEndLine(lines, i, m[1], m.index + m[0].length);
        const cur = byIndex.get(idx);
        if (cur) {
          cur.start = Math.min(cur.start, i);
          cur.end = Math.max(cur.end, end);
        } else {
          byIndex.set(idx, { start: i, end });
        }
      }
    }
  } catch (_) {}
  frCodeLineMap = { key: String(finalHtml || ''), byIndex };
}

// Strip the internal identity stamps for delivery and publish the recorded
// line map keyed by the delivered string (the same string the editor holds,
// so the index below can match on it). Attribute removal never adds or
// removes line breaks, so recorded lines stay valid after stripping.
function finalizeFrenchCode(stampedFormatted) {
  const finalHtml = String(stampedFormatted || '').replace(/\s+data-fr-index="[^"]*"/g, '');
  publishFrCodeLineMap(stampedFormatted, finalHtml);
  return finalHtml;
}

function generateFrenchHtmlSource() {
  // Placement guesses are logged during the rebuild below; start a fresh batch so
  // a regeneration does not stack this run's on top of the last one's.
  if (!Array.isArray(state.footnotePlacementDraft)) state.footnotePlacementDraft = [];
  else state.footnotePlacementDraft.length = 0;
  if (state.frCustomHtml) {
    const parser = new DOMParser();
    let doc;
    const hasHtmlTag = /<html[\s>]/i.test(state.frCustomHtml);

    if (hasHtmlTag) {
      doc = parser.parseFromString(state.frCustomHtml, 'text/html');
    } else {
      doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
      doc.body.innerHTML = state.frCustomHtml;
    }

    if (doc.documentElement) {
      doc.documentElement.setAttribute('lang', 'fr');
    }

    // Synchronize any live visual edits made in the French visual preview frame into doc
    try {
      if (frPreviewFrame && frPreviewFrame.contentDocument) {
        const editables = frPreviewFrame.contentDocument.querySelectorAll('.gc-swap-editable');
        const docBlocks = extractBlocks(doc.body);
        editables.forEach((el) => {
          const frIdx = el.hasAttribute('data-fr-index') ? parseInt(el.getAttribute('data-fr-index'), 10) : null;
          if (frIdx !== null && !isNaN(frIdx) && docBlocks[frIdx]) {
            const currentText = getBlockContent(el);
            if (!currentText) return;
            replaceBlockTextPreservingLinks(
              docBlocks[frIdx].el,
              currentText,
              docBlocks[frIdx].attrTarget,
              docBlocks[frIdx].spans
            );
            if (state.frBlocks[frIdx]) {
              state.frBlocks[frIdx].text = currentText;
            }
          }
        });
      }
    } catch (_) {}

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

    // Clean image alts and auto-localize PDF side panels
    cleanFrenchDocImages(doc, state.enHtml);
    autoLocalizeAllPdfSidePanels(doc.body, state.enHtml);

    // Clean any redundant <strong> tags inside <th> header cells and <caption>s
    cleanThTags(doc.body);
    cleanCaptionTags(doc.body);

    // Unwrap temporary br line-block spans before final output serialization
    unwrapBrSegments(doc.body);

    const rawHtml = hasHtmlTag ? doc.documentElement.outerHTML : doc.body.innerHTML;
    return finalizeFrenchCode(formatHtmlCode(cleanFrenchHtmlPostProcess(rawHtml)));
  }

  const parser = new DOMParser();
  let doc;
  const hasHtmlTag = /<html[\s>]/i.test(state.enHtml);

  if (hasHtmlTag) {
    doc = parser.parseFromString(state.enHtml, 'text/html');
  } else {
    doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
    doc.body.innerHTML = state.enHtml || '';
  }

  // Update lang attribute to fr
  if (doc.documentElement) {
    doc.documentElement.setAttribute('lang', 'fr');
  }

  const enDocBlocks = extractBlocks(doc.body);

  // Synchronize any live edits made in the French visual preview frame into state.frBlocks
  harvestVisualEdits();

  const rows = state.alignRows || [];
  let lastInsertedEl = null;

  if (rows.length > 0) {
    rows.forEach((row) => {
      if (row.enIndex !== null) {
        const enTarget = enDocBlocks[row.enIndex];
        if (enTarget) {
          if (row.frIndex !== null && !row.skip) {
            const frText = row.mergedFrText !== undefined
              ? row.mergedFrText
              : (state.frBlocks[row.frIndex] ? state.frBlocks[row.frIndex].text : '');
            const frSpans = row.mergedFrSpans !== undefined
              ? row.mergedFrSpans
              : (state.frBlocks[row.frIndex] ? state.frBlocks[row.frIndex].spans : []);
            
            replaceBlockTextPreservingLinks(
              enTarget.el,
              frText,
              enTarget.attrTarget,
              frSpans
            );
          } else {
            // English block missing French translation in Word doc:
            if (row.skip || isOmittedEnglishEquivalentBlock(enTarget)) {
              if (enTarget.el.classList.contains('gc-br-line') || enTarget.el.closest('[data-gc-br-wrapped]')) {
                const next = enTarget.el.nextSibling;
                const prev = enTarget.el.previousSibling;
                if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
                  next.remove();
                } else if (prev && prev.nodeType === 1 && prev.tagName.toLowerCase() === 'br') {
                  prev.remove();
                }
                enTarget.el.remove();
              } else {
                enTarget.el.remove();
              }
              return;
            }
            if (enTarget.tag === 'summary' && isTextEquivalentSummaryText(enTarget.text)) {
              let figTitle = '';
              const figEl = enTarget.el.closest('figure');
              if (figEl) {
                const fc = figEl.querySelector('figcaption');
                if (fc) figTitle = fc.textContent || '';
              }
              const synthText = synthesizeFrenchSummary(enTarget.text, figTitle);
              replaceBlockTextPreservingLinks(enTarget.el, synthText, enTarget.attrTarget, []);
            } else if (isPdfSidePanelElement(enTarget.el)) {
              // PDF side panel elements are web templates handled by autoLocalizeAllPdfSidePanels
              return;
            } else {
              const knownFr = getSampleOrBoilerplateTranslation(enTarget.text);
              if (knownFr) {
                replaceBlockTextPreservingLinks(enTarget.el, knownFr, enTarget.attrTarget, []);
              } else {
                const fillerText = `[TRANSLATION MISSING : ${enTarget.text}]`;
                replaceBlockTextPreservingLinks(
                  enTarget.el,
                  fillerText,
                  enTarget.attrTarget,
                  enTarget.spans
                );
              }
            }
          }
          lastInsertedEl = enTarget.el;
          // Stamp the French block's identity so the footnote pass can resolve
          // this element by index rather than by position in the output
          // document (see processFootnotes). Removed below before serialising.
          if (row.frIndex !== null && !row.skip && enTarget.el && enTarget.el.setAttribute) {
            enTarget.el.setAttribute('data-fr-index', row.frIndex);
          }
        }
      } else if (row.frIndex !== null && !row.skip) {
        // Extra French content: include in output HTML so no French content is removed!
        const frBlock = state.frBlocks[row.frIndex];
        if (frBlock) {
          const tag = frBlock.tag && ['h1','h2','h3','h4','h5','h6','p','li','blockquote','figcaption','div'].includes(frBlock.tag)
            ? frBlock.tag
            : 'p';
          const newEl = doc.createElement(tag);
          const extraText = /\[?(?:CONTENU\s+FRAN[ÇC]AIS\s+SUPPL[ÉE]MENTAIRE|EXTRA\s+FRENCH\s+CONTENT)/i.test(frBlock.text)
            ? frBlock.text
            : `[EXTRA FRENCH CONTENT : ${frBlock.text}]`;
          replaceBlockTextPreservingLinks(newEl, extraText, 'text', frBlock.spans || []);
          newEl.setAttribute('data-fr-index', row.frIndex);
          insertExtraFrenchElement(doc, newEl, lastInsertedEl);
          lastInsertedEl = newEl;
        }
      }
    });
  } else {
    enDocBlocks.forEach((enTarget, enIdx) => {
      const pair = state.alignPairs.find((p) => p.enIndex === enIdx && !p.skip);
      if (pair && pair.frIndex !== null && state.frBlocks[pair.frIndex]) {
        const frText = pair.mergedFrText !== undefined ? pair.mergedFrText : state.frBlocks[pair.frIndex].text;
        const frSpans = pair.mergedFrSpans !== undefined ? pair.mergedFrSpans : state.frBlocks[pair.frIndex].spans;
        replaceBlockTextPreservingLinks(
          enTarget.el,
          frText,
          enTarget.attrTarget,
          frSpans
        );
        // Same identity stamp as the alignRows path: the code index reads
        // positions from these instead of text-matching reshaped content.
        if (pair && pair.frIndex !== null && !pair.skip && enTarget.el && enTarget.el.setAttribute) {
          enTarget.el.setAttribute('data-fr-index', pair.frIndex);
        }
      } else {
        const pair = state.alignPairs.find((p) => p.enIndex === enIdx);
        if (pair?.skip || isOmittedEnglishEquivalentBlock(enTarget)) {
          if (enTarget.el.classList.contains('gc-br-line') || enTarget.el.closest('[data-gc-br-wrapped]')) {
            const next = enTarget.el.nextSibling;
            const prev = enTarget.el.previousSibling;
            if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
              next.remove();
            } else if (prev && prev.nodeType === 1 && prev.tagName.toLowerCase() === 'br') {
              prev.remove();
            }
            enTarget.el.remove();
          } else {
            enTarget.el.remove();
          }
          return;
        }
        if (enTarget.tag === 'summary' && isTextEquivalentSummaryText(enTarget.text)) {
          let figTitle = '';
          const figEl = enTarget.el.closest('figure');
          if (figEl) {
            const fc = figEl.querySelector('figcaption');
            if (fc) figTitle = fc.textContent || '';
          }
          const synthText = synthesizeFrenchSummary(enTarget.text, figTitle);
          replaceBlockTextPreservingLinks(enTarget.el, synthText, enTarget.attrTarget, []);
        } else if (isPdfSidePanelElement(enTarget.el)) {
          // PDF side panel elements are web templates handled by autoLocalizeAllPdfSidePanels
          return;
        } else {
          const knownFr = getSampleOrBoilerplateTranslation(enTarget.text);
          if (knownFr) {
            replaceBlockTextPreservingLinks(enTarget.el, knownFr, enTarget.attrTarget, []);
          } else {
            const fillerText = `[TRANSLATION MISSING : ${enTarget.text}]`;
            replaceBlockTextPreservingLinks(
              enTarget.el,
              fillerText,
              enTarget.attrTarget,
              enTarget.spans
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
  cleanFrenchDocImages(doc, state.enHtml);

  // Auto-localize Canada.ca PDF side panels (H1 download link, Health Canada / PHAC links, published date)
  autoLocalizeAllPdfSidePanels(doc.body, state.enHtml);

  // Clean any redundant <strong> tags inside <th> header cells
  cleanThTags(doc.body);

  // Unwrap temporary br line-block spans before final output serialization
  unwrapBrSegments(doc.body);

  const rawHtml = hasHtmlTag ? doc.documentElement.outerHTML : doc.body.innerHTML;
  // data-fr-index is internal bookkeeping used to line blocks up during
  // generation; it must not reach the delivered HTML. Positions are recorded
  // first (see finalizeFrenchCode), so the code index reads them instead of
  // text-matching reshaped content.
  return finalizeFrenchCode(formatHtmlCode(cleanFrenchHtmlPostProcess(rawHtml)));
}

function highlightHtmlCode(code) {
  if (!code) return '';

  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const formatted = escaped.replace(
    /(&lt;!--[\s\S]*?--&gt;)|(&lt;!DOCTYPE[^&]*&gt;)|(&lt;\/?)([a-zA-Z0-9:-]+)((?:\s+[a-zA-Z0-9_:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s&>]+))?)*\s*)(\/?&gt;)/gi,
    (match, comment, doctype, openBracket, tagName, attrs, closeBracket) => {
      if (comment) {
        return `<span class="hl-comment">${comment}</span>`;
      }
      if (doctype) {
        return `<span class="hl-doctype">${doctype}</span>`;
      }
      if (openBracket && tagName) {
        let formattedAttrs = '';
        if (attrs) {
          formattedAttrs = attrs.replace(
            /([a-zA-Z0-9_:-]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s&>]+))?/g,
            (attrMatch, attrName, eq, attrVal) => {
              let out = `<span class="hl-attr-name">${attrName}</span>`;
              if (eq) out += `<span class="hl-punct">${eq}</span>`;
              if (attrVal) out += `<span class="hl-attr-val">${attrVal}</span>`;
              return out;
            }
          );
        }
        return `<span class="hl-bracket">${openBracket}</span><span class="hl-tag">${tagName}</span>${formattedAttrs}<span class="hl-bracket">${closeBracket}</span>`;
      }
      return match;
    }
  );

  return formatted.replace(/&amp;nbsp;/g, '<span class="hl-entity hl-nbsp">&amp;nbsp;</span>');
}

function getActiveEnIndex() {
  return typeof state.activePreviewBlock === 'number' && state.activePreviewBlock >= 0
    ? state.activePreviewBlock
    : 0;
}

function getActiveEnBlock() {
  const enIdx = getActiveEnIndex();
  return state.enBlocks && state.enBlocks[enIdx] ? state.enBlocks[enIdx] : null;
}

// Resolve the pane-local block index for an English block index. On the EN
// side the two are the same number; on the FR side the pair table maps across.
// A gapped English block (no pair, e.g. an image whose alt has no Word
// counterpart) maps to null — never to the bare English number. EN and FR
// numbering diverge wherever anything is missing or extra, so the number
// routinely names a different French block (typically the figcaption above
// the image), which parks the French bar on the wrong line for two counts.
function frIndexForEnIndex(enIdx) {
  if (typeof enIdx !== 'number' || enIdx < 0) return null;
  const pair = state.alignPairs.find((p) => p.enIndex === enIdx && !p.skip);
  const targetFrIdx = pair && pair.frIndex !== null && pair.frIndex !== undefined ? pair.frIndex : null;
  if (targetFrIdx === null) return null;
  return state.frBlocks && state.frBlocks[targetFrIdx] ? targetFrIdx : null;
}

function getActiveFrIndex() {
  return frIndexForEnIndex(getActiveEnIndex());
}

// French range for the active English block. Paired blocks resolve through
// the pair table; gapped ones (no French counterpart, e.g. an image whose
// alt has no Word text) resolve to the element the generator still emits for
// them — usually a MISSING filler embedding the English text — so the bar
// tracks the block instead of sticking to a neighbouring line.
function findFrRangeForEnIndex(enIdx) {
  const frIdx = frIndexForEnIndex(enIdx);
  if (frIdx !== null && frIdx !== undefined) return findRangeForBlockIndex('fr', frIdx);
  return findGeneratedFrRangeForEnBlock(enIdx);
}

// Locate the French-code element generated for an English block that has no
// French pair. Searched strictly between the generated positions of the
// nearest mapped neighbours, so duplicates elsewhere in the document cannot
// pull the hit out of order (same bracketing convention as the index rescue
// pass). Returns null when there is nothing to show: synthesised,
// boilerplate-substituted, skipped, or removed elements leave no trace of
// the English text behind.
function findGeneratedFrRangeForEnBlock(enIdx) {
  try {
    const enBlock = state.enBlocks && state.enBlocks[enIdx];
    const frCode = frCodeEditor ? frCodeEditor.value || '' : '';
    if (!enBlock || !frCode) return null;
    const needle = (enBlock.text || '').replace(/\s+/g, ' ').trim();
    if (needle.length < 4) return null;

    const frRanges = getCodeBlockIndex('fr');
    const rangeByFrIndex = new Map();
    frRanges.forEach((r) => {
      if (!rangeByFrIndex.has(r.index)) rangeByFrIndex.set(r.index, r);
    });
    const frIndexOfEn = (e) => {
      const p = (state.alignPairs || []).find((q) => q.enIndex === e && !q.skip);
      return p && p.frIndex !== null && p.frIndex !== undefined ? p.frIndex : null;
    };
    let loLine = -1;
    for (let e = enIdx - 1; e >= 0; e--) {
      const f = frIndexOfEn(e);
      const r = f !== null ? rangeByFrIndex.get(f) : null;
      if (r && !r.estimated) { loLine = r.endLine; break; }
    }
    let hiLine = Infinity;
    const enTotal = state.enBlocks ? state.enBlocks.length : 0;
    for (let e = enIdx + 1; e < enTotal; e++) {
      const f = frIndexOfEn(e);
      const r = f !== null ? rangeByFrIndex.get(f) : null;
      if (r && !r.estimated) { hiLine = r.startLine; break; }
    }

    if (enBlock.tag === 'img') {
      // Alt text lives in attributes, invisible to the flattened projection:
      // match it inside the <img> tag region, like the index pass does.
      const spans = findImgTagSpans(frCode);
      if (!spans.length) return null;
      const lineStarts = [0];
      for (let i = 0; i < frCode.length; i++) {
        if (frCode[i] === '\n') lineStarts.push(i + 1);
      }
      const lineAt = (off) => {
        let lo = 0;
        let hi = lineStarts.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
        }
        return lo;
      };
      const normAttr = (s) => String(s || '').toLowerCase().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      const nNeedle = normAttr(needle);
      let fallback = null;
      for (let s = 0; s < spans.length; s++) {
        const l0 = lineAt(spans[s].start);
        if (l0 < loLine || (hiLine !== Infinity && l0 > hiLine)) continue;
        const spanRange = { startLine: l0, endLine: lineAt(spans[s].end) };
        if (nNeedle && normAttr(spans[s].text).includes(nNeedle)) return spanRange;
        if (!fallback) fallback = spanRange;
      }
      return fallback;
    }

    // Text blocks: a MISSING filler embeds the English text verbatim in the
    // element body, which the flattened projection can see.
    const flat = getFlattenedCode(frCode);
    const normLine = flat.normLine;
    let loFlat = 0;
    if (loLine >= 0) {
      loFlat = normLine.length;
      for (let i = 0; i < normLine.length; i++) {
        if (normLine[i] >= loLine) { loFlat = i; break; }
      }
    }
    let hiFlat = flat.norm.length;
    if (hiLine !== Infinity) {
      hiFlat = flat.norm.length;
      for (let i = loFlat; i < normLine.length; i++) {
        if (normLine[i] > hiLine) { hiFlat = i; break; }
      }
    }
    if (hiFlat <= loFlat) return null;
    return findBlockInFlattened(frCode, enBlock, loFlat, hiFlat);
  } catch (_) {
    return null;
  }
}

function findRangeForBlockIndex(side, blockIdx) {
  if (typeof blockIdx !== 'number' || blockIdx < 0) return null;
  const ranges = getCodeBlockIndex(side);
  for (let i = 0; i < ranges.length; i++) {
    // estimated must travel with the range: renderRangeOrNull skips estimated
    // ranges so the bar is never drawn on an interpolated position.
    if (ranges[i].index === blockIdx) {
      return {
        startLine: ranges[i].startLine,
        endLine: ranges[i].endLine,
        estimated: ranges[i].estimated,
      };
    }
  }
  // Estimated fallback for blocks whose text can't be located (entities,
  // heavy markup drift): interpolate between the nearest resolved neighbors
  // so the result stays monotonic with block order, else fall back to a
  // global proportional estimate. Flagged estimated so the bar draws in the
  // approximate style rather than reading as an exact hit.
  //
  // Deliberately no unconstrained text search here: an out-of-order hit
  // (first match anywhere in the file) maps the block to the top of the
  // document, which is far worse than an estimate placed between its
  // neighbors.
  try {
    const isEn = side === 'en';
    const editor = isEn ? enCodeEditor : frCodeEditor;
    const blocks = isEn ? state.enBlocks : state.frBlocks;
    const text = editor ? editor.value || '' : '';
    const total = blocks ? blocks.length : 0;
    if (!text || total <= 1) return null;
    const lineCount = Math.max(1, text.split('\n').length);
    let lo = null;
    let hi = null;
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (r.index < blockIdx && (!lo || r.index > lo.index)) lo = r;
      if (r.index > blockIdx && (!hi || r.index < hi.index)) hi = r;
    }
    let line;
    if (lo && hi && hi.index > lo.index) {
      const t = (blockIdx - lo.index) / (hi.index - lo.index);
      line = Math.round(lo.endLine + t * (hi.startLine - lo.endLine));
    } else {
      line = Math.round((blockIdx / (total - 1)) * (lineCount - 1));
    }
    line = Math.max(0, Math.min(lineCount - 1, line));
    return { startLine: line, endLine: line, estimated: true };
  } catch (_) {
    return null;
  }
}

// --- Markup-insensitive block matching -------------------------------------
// Block texts are plain strings, but the code is markup. Matching a block's
// head against raw markup only works while the block has no inline tags: one
// <a> mid-sentence splits the 30-char head ("Voir le site" vs
// "Voir <a href=…>le site</a>"), the block silently drops out of the index,
// the search cursor stops advancing, and every later block then matches a
// LATER duplicate — cascading the whole block->line map out of document
// order. Matching against a flattened projection of the code makes the head
// always findable, in order.

// Every JS-whitespace codepoint, checked by range (called per character, so a
// regex test would be far too slow on large documents).
function isSpaceCode(c) {
  return c === 32 || (c >= 9 && c <= 13) || c === 160
    || (c >= 8199 && c <= 8202) || c === 8232 || c === 8233
    || c === 8239 || c === 8287 || c === 12288;
}

// Named entities beyond the handful handled above (&ndash; &mdash; &rsquo;
// &eacute; &hellip; &laquo; …) are decoded through the browser, which owns the
// full HTML table. Without this the projection kept the literal seven
// characters "&ndash;" while the block text held a real en dash, so every
// block containing a typographic entity silently failed to place. Results are
// cached: this runs once per distinct entity name per session, and the cache
// lives on the module so it survives the code-pane cache being rebuilt.
const namedEntityCache = new Map();
let entityDecoderEl = null;

function decodeNamedEntity(body) {
  if (namedEntityCache.has(body)) return namedEntityCache.get(body);
  let out = null;
  try {
    if (typeof document !== 'undefined') {
      if (!entityDecoderEl) entityDecoderEl = document.createElement('textarea');
      entityDecoderEl.innerHTML = `&${body};`;
      const decoded = entityDecoderEl.value;
      // An unrecognised name round-trips unchanged; treat that as "not an
      // entity" so the ampersand is treated as literal text.
      if (decoded && decoded !== `&${body};`) out = decoded;
    }
  } catch (_) {
    out = null;
  }
  namedEntityCache.set(body, out);
  return out;
}

function decodeHtmlEntity(body) {
  if (body === 'nbsp' || body === '#160' || body === '#xA0' || body === '#xa0') return ' ';
  if (body === 'amp') return '&';
  if (body === 'lt') return '<';
  if (body === 'gt') return '>';
  if (body === 'quot') return '"';
  if (body === 'apos' || body === '#39') return "'";
  if (body.charCodeAt(0) === 35 /* # */) {
    const code = (body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88)
      ? parseInt(body.slice(2), 16)
      : parseInt(body.slice(1), 10);
    if (!isNaN(code) && code > 0 && code < 0x110000) return String.fromCodePoint(code);
    return null;
  }
  return decodeNamedEntity(body);
}

// Tags that sit inside a sentence: dropping them must not insert a space, or
// "Voir <a>le site</a>" would flatten to "Voir le site" while
// "<b>Important</b>information" wrongly became "Important information".
const INLINE_TAG_RE = /^(?:a|b|i|u|s|em|strong|span|code|sup|sub|small|mark|abbr|cite|q|dfn|var|samp|kbd|time|big|del|ins|bdi|bdo|wbr|img|br)$/;

// Text a reader never sees, and footnote chrome. These must stay in step with
// the removals in getBlockContent (block-utils.js), because the flattened
// projection and block.text are two views of the same block and have to agree —
// when they disagree the block's text cannot be found here and it silently loses
// its highlight.
//
// getBlockContent removes exactly three things, and nothing else:
//   1. .fn-rtn elements
//   2. a[href*="-rf"]
//   3. .wb-inv spans *whose own text* matches a footnote label
// Note what is NOT removed: aria-hidden, the bare hidden attribute, and any
// .wb-inv span holding ordinary content. "wb-inv" is a general WET utility
// class, not a footnote marker, so dropping it wholesale deleted real text and
// made whole blocks unfindable. That is why 1 and 2 are unconditional while 3
// is decided per element from the text it contains.
const FN_CHROME_CLASS_RE = /class\s*=\s*["'][^"']*\bfn-rtn\b[^"']*["']/i;
const FN_RETURN_HREF_RE = /href\s*=\s*["'][^"']*-rf["']/i;
const HIDDEN_LABEL_CLASS_RE = /class\s*=\s*["'][^"']*\bwb-inv(?:isible)?\b[^"']*["']/i;
const FOOTNOTE_LABEL_RE = /Footnote|Note de bas de page|Return to footnote|Retour à la référence/i;

let flattenedCache = { text: null, norm: '', normLine: new Uint32Array(0) };

// Strip markup, decode entities, collapse whitespace runs to one space, and
// record the source line for every character of the result. Block-level tags
// and <br> contribute a separator (block.text stores a line break as "\n",
// which normalizes to the same space); inline tags contribute nothing.
function getFlattenedCode(codeText) {
  const text = codeText || '';
  if (flattenedCache.text === text) return flattenedCache;

  const chars = [];
  const lines = [];
  const n = text.length;
  let line = 0;
  let i = 0;
  let pendingSpace = false;
  let hasContent = false;
  // Depth of the footnote-chrome region being skipped, and the text inside it.
  // A candidate is buffered rather than dropped outright: .fn-rtn and -rf
  // links always go, but a .wb-inv span is only chrome when its own text is a
  // footnote label, and that is only knowable once the span has been read.
  let skipDepth = 0;
  let skipIsChrome = false;
  let skipIsCandidate = false;
  let skipText = '';

  const pushChar = (c) => {
    const code = c.charCodeAt(0);
    if (isSpaceCode(code)) {
      if (hasContent) pendingSpace = true;
      return;
    }
    if (pendingSpace) {
      chars.push(' ');
      lines.push(line);
      pendingSpace = false;
    }
    chars.push(c);
    lines.push(line);
    hasContent = true;
  };

  while (i < n) {
    const ch = text.charCodeAt(i);
    // A newline is whitespace like any other: it advances the source line AND
    // separates the words around it. Swallowing it without setting
    // pendingSpace glued hard-wrapped source lines together ("similar\nin" ->
    // "similarin") while the needle keeps its space, so any block whose source
    // breaks mid-sentence without indentation silently lost its highlight.
    if (ch === 10) { line++; if (hasContent) pendingSpace = true; i++; continue; }
    // Inside a skipped region, characters are buffered instead of emitted, so a
    // .wb-inv span that turns out to hold ordinary content can be put back.
    if (skipDepth > 0 && ch !== 60) { skipText += text[i]; i++; continue; }
    if (ch === 60 /* < */) {
      if (text.startsWith('<!--', i)) {
        const end = text.indexOf('-->', i);
        const stop = end === -1 ? n : end + 3;
        // Newlines inside the comment are still source lines; see the tag branch
        // below for why this has to be counted here.
        for (let k = i; k < stop; k++) if (text.charCodeAt(k) === 10) line++;
        i = stop;
      } else {
        // Scan for the closing '>' while honouring quoted attribute values:
        // indexOf('>') stops early on alt="Rate > 5" and leaves the tail of
        // the attribute list to be flattened as visible text, corrupting the
        // projection for every block that follows on the page.
        let j = i + 1;
        let quote = 0;
        while (j < n) {
          const c = text.charCodeAt(j);
          if (quote) {
            if (c === quote) quote = 0;
          } else if (c === 34 || c === 39) {
            quote = c;
          } else if (c === 62 /* > */) {
            break;
          }
          j++;
        }
        const end = j < n ? j : -1;
        const nameEnd = end === -1 ? n : end;
        const tagSrc = text.slice(i, nameEnd);
        const m = /^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(tagSrc);
        const name = m ? m[1].toLowerCase() : '';
        const isClose = /^<\s*\//.test(tagSrc);
        const isSelfClosing = /\/\s*>$/.test(tagSrc);

        // Footnote chrome is dropped here for the same reason getBlockContent
        // drops it: both have to agree on what a block's text is, or the needle
        // never appears in this projection and the block silently loses its
        // highlight. The accessibility label of a citation and the "return to
        // footnote" link are not part of the sentence.
        if (skipDepth > 0) {
          if (isClose) {
            skipDepth--;
            if (skipDepth === 0) {
              // A buffered candidate is put back unless it really is a
              // footnote label — the same test getBlockContent applies.
              if (skipIsCandidate && !skipIsChrome && !FOOTNOTE_LABEL_RE.test(skipText)) {
                // Count newlines as they go past: the buffer swallowed them, and
                // line must keep tracking the source position.
                for (let k = 0; k < skipText.length; k++) {
                  if (skipText.charCodeAt(k) === 10) { line++; continue; }
                  pushChar(skipText[k]);
                }
              }
              skipText = '';
              skipIsChrome = false;
              skipIsCandidate = false;
            }
          } else if (!isSelfClosing) {
            skipDepth++;
          }
        } else if (!isClose && !isSelfClosing) {
          const isChrome = FN_CHROME_CLASS_RE.test(tagSrc) || FN_RETURN_HREF_RE.test(tagSrc);
          if (isChrome) {
            skipDepth = 1;
            skipIsChrome = true;
          } else if (HIDDEN_LABEL_CLASS_RE.test(tagSrc)) {
            skipDepth = 1;
            skipIsCandidate = true;
          } else if (hasContent && (name === 'br' || !INLINE_TAG_RE.test(name))) {
            pendingSpace = true;
          }
        } else if (hasContent && (name === 'br' || !INLINE_TAG_RE.test(name))) {
          pendingSpace = true;
        }
        // Newlines *inside* the tag are real source lines. The scan above jumps
        // `i` past the whole tag, so the main loop never sees those characters
        // and `line` would under-count them. That silently attributed every
        // block after a long wrapped attribute to a line that was too high — an
        // <img src="..."> broken across four lines put the rest of the
        // document's highlight bars three lines above their blocks.
        const scanEnd = end === -1 ? n - 1 : end;
        for (let k = i; k <= scanEnd; k++) if (text.charCodeAt(k) === 10) line++;
        i = end === -1 ? n : end + 1;
      }
      continue;
    }
    if (ch === 38 /* & */) {
      // Only treat this as an entity when a ';' follows within a plausible
      // name length; otherwise the ampersand is literal text (e.g. "AT&T").
      const semi = text.indexOf(';', i);
      if (semi !== -1 && semi - i <= 32) {
        const decoded = decodeHtmlEntity(text.slice(i + 1, semi));
        if (decoded !== null) {
          for (let k = 0; k < decoded.length; k++) pushChar(decoded[k]);
          i = semi + 1;
          continue;
        }
      }
    }
    pushChar(text[i]);
    i++;
  }

  flattenedCache = {
    text,
    norm: chars.join(''),
    normLine: new Uint32Array(lines),
  };
  return flattenedCache;
}

// Locate a block's text in the flattened projection, at or after fromFlat and
// strictly before beforeFlat (Infinity for "no upper bound"). Whitespace is
// already normalized on both sides, so no entity / nbsp variants are needed.
//
// minLen is deliberately different per caller: a short needle ("Yes", "p. 1")
// can match a distant duplicate and be placed far too late, so the
// unconstrained sequential pass rejects them; the neighbour-bracketed rescue
// pass can accept them, because the window is tight enough that the first
// hit inside it is the right one.
function findBlockInFlattened(codeText, block, fromFlat, beforeFlat, minLen) {
  if (!codeText || !block || !block.text) return null;
  const flat = getFlattenedCode(codeText);
  const hay = flat.norm;
  if (!hay) return null;
  const floor = typeof minLen === 'number' ? minLen : 4;
  const upper = Math.min(
    typeof beforeFlat === 'number' && !isNaN(beforeFlat) ? beforeFlat : hay.length,
    hay.length
  );
  const tryNeedle = (needle) => {
    if (!needle || needle.length < floor) return null;
    const start = hay.indexOf(needle, Math.max(0, fromFlat || 0));
    if (start === -1 || start >= upper) return null;
    const end = start + needle.length;
    const lineAt = flat.normLine;
    return {
      startLine: lineAt[start] || 0,
      endLine: lineAt[Math.min(end, lineAt.length) - 1] || 0,
      startFlat: start,
      endFlat: end,
    };
  };
  const needle = block.text.replace(/\s+/g, ' ').trim();
  // Footnote definitions carry their number label in block state ("1. …")
  // while generated code holds the stripped text: retry stripped so those
  // blocks locate exactly instead of interpolating onto boilerplate lines.
  // The stripped form must still open on a letter or digit, so a
  // bracket-led needle ("[36, …]") can never degrade into punctuation soup.
  const stripped = stripFootnoteDefinitionLabel(needle);
  const cleanStripped = stripped !== needle && /^[0-9A-Za-zÀ-ÖØ-öø-ÿ]/.test(stripped || '') ? stripped : null;
  // Typed bracket groups never survive generation either: consumed brackets
  // become adjacent markers, which flatten to fused digit runs ("[36, 37,
  // 39]" → "363739"). Expanding the typed groups to the same fused form
  // lets those blocks locate exactly. Unparseable groups stay intact (the
  // length floor then rejects them), and fallbacks run only after verbatim
  // fails, so this strictly rescues otherwise-estimated blocks.
  const expanded = expandBracketCitations(needle);
  const expandedStripped = cleanStripped ? expandBracketCitations(cleanStripped) : null;
  return tryNeedle(needle)
    || (cleanStripped ? tryNeedle(cleanStripped) : null)
    || (expanded !== needle ? tryNeedle(expanded) : null)
    || (expandedStripped && expandedStripped !== needle && expandedStripped !== cleanStripped
      ? tryNeedle(expandedStripped) : null);
}

// Joins each typed bracket citation group in a needle into the fused digit
// run generation leaves behind ("[36, 37, 39]" → "363739"). Groups that do
// not parse stay untouched.
function expandBracketCitations(needle) {
  if (!needle || typeof needle !== 'string' || needle.indexOf('[') === -1) return needle;
  return needle.replace(/\[([\d\s,;–—-]+?)\]/g, (m, inner) => {
    const nums = expandCitationRefList(inner);
    return nums.length ? nums.join('') : m;
  });
}

// Active-block highlight bar in Code View.
//
// Two things are expensive here and both used to happen on every active-block
// change, twice (EN + FR), over documents of a few hundred KB:
//   1. re-highlighting the whole source, and
//   2. re-parsing the result via innerHTML.
// Neither depends on WHICH block is active — only which lines carry the bar.
// So each line is built once into its own element and thereafter the bar is
// moved by toggling a class on the affected lines.
//
// The line breaks are kept as zero-size text nodes so the layer's textContent
// still reads as the source text (panel search flattens the <pre> to find its
// matches); they are display:none so they contribute no layout.
const CODE_LINE_CLASS = 'code-line';
const CODE_NL_CLASS = 'code-nl';
const activeLineClass = 'code-active-line';
// Applied on top of activeLineClass when the block's line had to be
// interpolated rather than located, so a guess never reads as an exact hit.
const approxLineClass = 'code-active-line-approx';
const highlightCache = { text: null, lines: null };
const codePaneState = new WeakMap();

function highlightedLinesFor(codeText) {
  const text = codeText || '';
  if (highlightCache.text === text && highlightCache.lines) return highlightCache.lines;
  const trailing = text.endsWith('\n') ? '\n' : '';
  const lines = (highlightHtmlCode(text) + trailing).split('\n');
  highlightCache.text = text;
  highlightCache.lines = lines;
  return lines;
}

function buildCodeLineLayer(innerEl, text) {
  const lines = highlightedLinesFor(text);
  const frag = document.createDocumentFragment();
  const lineEls = [];
  lines.forEach((html, i) => {
    const el = document.createElement('span');
    el.className = CODE_LINE_CLASS;
    el.innerHTML = html;
    lineEls.push(el);
    frag.appendChild(el);
    if (i < lines.length - 1) {
      const nl = document.createElement('span');
      nl.className = CODE_NL_CLASS;
      nl.textContent = '\n';
      frag.appendChild(nl);
    }
  });
  innerEl.replaceChildren(frag);
  const state = { text, lineEls, start: -1, end: -1 };
  codePaneState.set(innerEl, state);
  return state;
}

function setActiveLineRange(state, start, end, approx) {
  if (state.start === start && state.end === end && state.approx === approx) return;
  for (let i = state.start; i >= 0 && i <= state.end; i++) {
    const el = state.lineEls[i];
    if (!el) continue;
    el.classList.remove(activeLineClass);
    el.classList.remove(approxLineClass);
  }
  for (let i = start; i >= 0 && i <= end; i++) {
    const el = state.lineEls[i];
    if (!el) continue;
    el.classList.add(activeLineClass);
    if (approx) el.classList.add(approxLineClass);
  }
  state.start = start;
  state.end = end;
  state.approx = approx;
}

function renderCodeWithActiveLines(innerEl, codeText, range, preEl) {
  if (!innerEl) return;
  const text = codeText || '';
  let state = codePaneState.get(innerEl);
  // The cached line elements are only usable while they are still the ones in
  // the document. Anything that assigns innerHTML on the layer detaches them,
  // and the text check alone cannot see that: if the code text happens to be
  // unchanged the cache is trusted and setActiveLineRange applies the bar's
  // classes to detached nodes, so the bar silently stops appearing in that
  // pane. Comparing the first cached line against the layer's real first child
  // catches any such wipe, not just the ones we remember to patch.
  if (state) {
    const expectedFirst = state.lineEls.length ? state.lineEls[0] : null;
    if (expectedFirst !== innerEl.firstElementChild) state = null;
  }
  if (!state || state.text !== text) state = buildCodeLineLayer(innerEl, text);

  const total = state.lineEls.length;
  if (!range || total === 0) {
    setActiveLineRange(state, -1, -1, false);
    reapplySearchMarksToCodePanes();
    return;
  }
  const start = Math.max(0, Math.min(range.startLine, total - 1));
  const end = Math.max(start, Math.min(range.endLine, total - 1));
  setActiveLineRange(state, start, end, Boolean(range.estimated));
  void preEl;
  reapplySearchMarksToCodePanes();
}

// Read-only report on why the active block is or is not centred. Exposed on
// window so it can be run against a real document from the console; it reads
// only geometry and state, and never scrolls anything.
function getCodeViewDiagnostics() {
  // `view` is the highlight <pre> in both panes; leveling math runs in that
  // space (bar geometry + pre scroll), never in textarea space, since the two
  // differ wherever lines wrap.
  const paneInfo = (view, inner, editor) => {
    const out = { present: Boolean(view && inner && editor) };
    if (!out.present) return out;
    const rect = view.getBoundingClientRect();
    const centreY = rect.top + rect.height / 2;
    out.paneTop = Math.round(rect.top);
    out.paneHeight = Math.round(rect.height);
    out.centreY = Math.round(centreY);
    out.scrollTop = Math.round(editor.scrollTop || 0);
    out.clientHeight = editor.clientHeight;
    out.scrollHeight = editor.scrollHeight;
    out.maxScroll = Math.max(0, editor.scrollHeight - editor.clientHeight);
    out.preScrollTop = Math.round(view.scrollTop || 0);
    out.preMaxScroll = Math.max(0, view.scrollHeight - view.clientHeight);
    out.lineCount = (editor.value || '').split('\n').length;
    // A long block lights many lines: measure the whole span and report its
    // middle, mirroring what alignCodeBarsHorizontally levels by.
    const barEls = Array.from(inner.querySelectorAll('.' + activeLineClass));
    out.hasBar = barEls.length > 0;
    if (barEls.length) {
      const first = barEls[0].getBoundingClientRect();
      const last = barEls[barEls.length - 1].getBoundingClientRect();
      out.barTop = Math.round(first.top);
      out.barMid = Math.round((first.top + last.bottom) / 2);
      out.barHeight = Math.round(last.bottom - first.top);
      out.offsetFromCentre = Math.round((first.top + last.bottom) / 2 - centreY);
      out.approximate = barEls.some((el) => el.classList.contains(approxLineClass));
      out.approxLineIndex = Array.prototype.indexOf.call(inner.children, barEls[0]);
    }
    // What pre scrollTop would put the bar dead centre, and whether that is
    // legal. Reported in highlight space, matching the leveler.
    if (out.hasBar) {
      const want = Math.round(out.preScrollTop + out.offsetFromCentre);
      out.centredScrollTop = want;
      out.centreReachable = want >= 0 && want <= out.preMaxScroll;
      out.clampReason = want < 0 ? 'document start' : (want > out.preMaxScroll ? 'document end' : null);
    }
    return out;
  };

  const en = paneInfo(enCodeHighlight, enCodeHighlightInner, enCodeEditor);
  const fr = paneInfo(frCodeHighlight, frCodeHighlightInner, frCodeEditor);
  const ranges = getActiveCodeRanges();

  // How much of each document can actually be located. A block whose text no
  // longer matches its pane is placed by interpolation, so its bar can be on the
  // wrong line — worth counting, because a pane full of them is a locating
  // problem rather than a styling one.
  const tally = (side) => {
    const rs = getCodeBlockIndex(side) || [];
    return {
      ranges: rs.length,
      estimated: rs.filter((r) => r.estimated).length,
    };
  };
  const enIndex = tally('en');
  const frIndex = tally('fr');

  // The guards alignCodeBarsHorizontally applies, reported as they evaluate —
  // any one of them makes it return without moving either pane.
  const guards = {};
  guards.bothPanesPresent = en.present && fr.present;
  guards.sameRow = Math.abs(en.paneTop - fr.paneTop) <= 2;
  guards.sameHeight = Math.abs(en.paneHeight - fr.paneHeight) <= 2;
  guards.bothHaveBar = Boolean(en.hasBar && fr.hasBar);
  if (en.hasBar && fr.hasBar) {
    // Highlight space throughout: viewport mids converted with paneTop, pre
    // scroll ranges — the same inputs alignCodeBarsHorizontally decides on.
    const maxScrolls = [en.preMaxScroll, fr.preMaxScroll];
    const bases = [
      en.barMid - en.paneTop + en.preScrollTop,
      fr.barMid - fr.paneTop + fr.preScrollTop,
    ];
    const height = en.paneHeight;
    const range = reachableRange(bases, maxScrolls, { top: 0, bottom: height });
    guards.sharedYReachable = Boolean(range);
    guards.centreYReachableByBoth = Boolean(range)
      && (height / 2) >= range.lo && (height / 2) <= range.hi;
  }

  return {
    viewMode: state.frViewMode,
    autoSync: state.autoSync,
    syncPaused: state.syncPaused,
    showHighlightBox: state.showHighlightBox,
    activePreviewBlock: state.activePreviewBlock,
    enBlockCount: state.enBlocks ? state.enBlocks.length : 0,
    frBlockCount: state.frBlocks ? state.frBlocks.length : 0,
    measuredLineHeight: Math.round(getCodeLineHeight() * 100) / 100,
    fallbackLineHeight: CODE_LINE_HEIGHT_FALLBACK,
    activeRanges: { en: ranges.en, fr: ranges.fr },
    enIndex,
    frIndex,
    en,
    fr,
    guards,
  };
}

function printCodeViewDiagnostics() {
  const d = getCodeViewDiagnostics();
  if (typeof console !== 'undefined' && console.table) console.table(d);
  return d;
}

// A flat, single-string report. Devtools collapses nested objects, which is
// exactly the wrong thing for a diagnostic meant to be pasted elsewhere, so
// this flattens the decision-critical values into one line each.
function codeViewDiagnosticsText() {
  const d = getCodeViewDiagnostics();
  const g = d.guards;
  const p = (pane, name) => [
    `${name}.barPresent      = ${pane.hasBar}`,
    `${name}.barFromCentre  = ${pane.offsetFromCentre} px  (negative = above centre)`,
    `${name}.clampReason    = ${pane.clampReason === null ? 'none' : pane.clampReason}`,
    `${name}.centreReachable= ${pane.centreReachable}`,
    `${name}.approximate    = ${pane.approximate}`,
    `${name}.scrollTop      = ${pane.scrollTop} of max ${pane.maxScroll} (editor)`,
    `${name}.preScrollTop   = ${pane.preScrollTop} of max ${pane.preMaxScroll} (highlight)`,
    `${name}.paneHeight     = ${pane.paneHeight}`,
  ];
  // Image blocks, on both sides. They are the awkward case: their alt never
  // reaches the flattened projection, so they can only be placed by their <img>
  // tag, and they only highlight in the other pane if the pair table actually
  // maps them across.
  const imgReport = (side) => {
    const blocks = side === 'en' ? state.enBlocks : state.frBlocks;
    const rs = getCodeBlockIndex(side) || [];
    const out = [];
    (blocks || []).forEach((b, i) => {
      if (!b || b.tag !== 'img') return;
      const r = rs.find((x) => x.index === i);
      const pair = (state.alignPairs || []).find((p) => !p.skip
        && (side === 'en' ? p.enIndex === i : p.frIndex === i));
      const other = side === 'en'
        ? (pair ? pair.frIndex : null)
        : (pair ? pair.enIndex : null);
      out.push(
        `  ${side} img block ${i}: lines ${r ? `${r.startLine}..${r.endLine}` : 'NONE'}`
        + `${r && r.estimated ? ' (estimated)' : ''}`
        + `, pair -> ${other === null ? 'NONE' : other}`
        + `, alt "${String(b.text || '').slice(0, 34)}"`,
      );
    });
    return out.length ? out : [`  ${side}: no image blocks`];
  };

  return [
    `activeBlock   = ${d.activePreviewBlock}`,
    `blockCounts   = EN ${d.enBlockCount} / FR ${d.frBlockCount}`,
    `lineHeight    = measured ${d.measuredLineHeight} (fallback ${d.fallbackLineHeight})`,
    `range.en      = ${JSON.stringify(d.activeRanges.en)}`,
    `range.fr      = ${JSON.stringify(d.activeRanges.fr)}`,
    `--- how much of each pane can be located ---`,
    `EN located     = ${d.enIndex.ranges - d.enIndex.estimated} exact, ${d.enIndex.estimated} estimated`,
    `FR located     = ${d.frIndex.ranges - d.frIndex.estimated} exact, ${d.frIndex.estimated} estimated`,
    `--- guards that can stop the aligner ---`,
    `bothPanesPresent  = ${g.bothPanesPresent}`,
    `bothHaveBar       = ${g.bothHaveBar}`,
    `sameRow           = ${g.sameRow}`,
    `sameHeight        = ${g.sameHeight}`,
    `sharedYReachable  = ${g.sharedYReachable}`,
    `centreYReachable  = ${g.centreYReachableByBoth}`,
    `--- panes ---`,
    ...p(d.en, 'EN'),
    ...p(d.fr, 'FR'),
    `--- image blocks ---`,
    ...imgReport('en'),
    ...imgReport('fr'),
  ].join('\n');
}

if (typeof window !== 'undefined') {
  window.__codeViewDiag = getCodeViewDiagnostics;
  window.__codeViewDiagPrint = printCodeViewDiagnostics;
  window.__codeViewDiagText = codeViewDiagnosticsText;
  window.__frCodeIndex = () => getCodeBlockIndex('fr');
  window.__enCodeIndex = () => getCodeBlockIndex('en');
}

function getActiveCodeRanges() {
  // Resolve through the order-aware block index so repeated text highlights
  // the active block's own occurrence, not the first match in the document.
  // Estimated (interpolated) positions are returned too: the bar is drawn for
  // them, marked approximate, because dropping them left the highlight
  // completely absent for any block that could not be located exactly.
  return {
    en: findRangeForBlockIndex('en', getActiveEnIndex()),
    fr: findFrRangeForEnIndex(getActiveEnIndex()),
  };
}

function renderRangeOrNull(range) {
  if (!range) return null;
  if (state.showHighlightBox === false) return null;
  return range;
}

function updateCodeActiveBlockHighlight() {
  if (state.frViewMode === 'visual') return;
  const ranges = getActiveCodeRanges();
  if (enCodeHighlightInner && enCodeEditor) {
    renderCodeWithActiveLines(enCodeHighlightInner, enCodeEditor.value || '', renderRangeOrNull(ranges.en));
    syncEnCodeScroll(enCodeEditor);
  }
  if (frCodeHighlightInner && frCodeEditor) {
    renderCodeWithActiveLines(frCodeHighlightInner, frCodeEditor.value || '', renderRangeOrNull(ranges.fr));
    syncFrCodeScroll();
  }
  return ranges;
}

// Removes the "extra French content" annotation the builder wraps around a
// French block it could not pair, leaving the translated text underneath.
//
// Both the English and the French spelling are handled, and the wrapper is
// required to close: the French one in particular appears in running prose
// ("see [CONTENU FRANÇAIS SUPPLÉMENTAIRE : …]") where a bare phrase match
// would eat real text. Applied to the text only — the element still carries the
// annotation visually, which is the point of it.
const EXTRA_FR_MARKER_RE = /^\s*\[(?:EXTRA\s+FRENCH\s+CONTENT|CONTENU\s+FRAN[CÇ]AIS\s+SUPPL[CÉ]MENTAIRE)\s*:\s*([\s\S]*?)\s*\]\s*$/i;
function stripExtraFrenchMarker(text) {
  if (!text) return text;
  const m = EXTRA_FR_MARKER_RE.exec(text);
  return m ? m[1] : text;
}

if (typeof window !== 'undefined') {
  window.updateCodeActiveBlockHighlight = updateCodeActiveBlockHighlight;
}

// --- Code-view block selection + follow-scroll (mirrors visual-view behavior) ---
//
// The height of one code line is MEASURED, not assumed. The highlight layer
// sets `line-height: inherit` (global.css) and therefore never picks up the
// textarea's `line-height: 22px !important`; it resolves to whatever the
// container gives it, observed around 30px. Every scroll<->line conversion in
// this file divides by that height, so a stale 22px constant over-reads line
// numbers by 30/22 and under-scrolls by the same factor. The two symptoms are
// the same bug: centring a block lands it near the top of the pane instead of
// centred, and the block read back from the centre line is not the block that
// was just selected — which is why stepping off a figure appeared to do nothing.
const CODE_LINE_HEIGHT_FALLBACK = 22;
const CODE_PAD_TOP = 16;
let codeLineHeightCache = 0;

// Distance between the tops of two consecutive rendered lines. Measuring the
// delta rather than a single rect keeps the container's padding out of it, and
// reads the real box the bar is drawn on.
// The height of one code line, measured rather than assumed.
//
// Measure a `.code-line` itself. The layer's children alternate
// .code-line / .code-nl, and the .code-nl spans are display:none, so they
// report an all-zero rect: indexing raw children measured the gap between a
// line and a hidden sibling, which is either a bogus height or a negative one
// the guard rejects — leaving a stale cached value in charge. On a real
// document that produced 13.27 against a true ~30px, so every scroll<->line
// division was out by more than half: centreEditorOnLine under-scrolled and
// codeCenterLine read line numbers more than double the truth.
//
// A hidden or not-yet-laid-out layer reports 0, and a webfont that has not
// loaded yet lays out shorter than the real one. Measuring either would poison
// the result again, so require a real box and treat a fresh reading as
// authoritative over the cache. The cache is only a fallback for when nothing
// is rendered at all.
function getCodeLineHeight() {
  try {
    for (const layer of [enCodeHighlightInner, frCodeHighlightInner]) {
      if (!layer) continue;
      const line = layer.querySelector('.' + CODE_LINE_CLASS);
      if (!line) continue;
      const h = line.getBoundingClientRect().height;
      if (h >= 8 && h < 200) {
        codeLineHeightCache = h;
        return h;
      }
    }
  } catch (_) { /* unrendered layer */ }
  return codeLineHeightCache || CODE_LINE_HEIGHT_FALLBACK;
}

// The line height only changes when wrap, font size or zoom changes; the cache
// is cleared at those points rather than on every scroll read.
function resetCodeLineHeight() {
  codeLineHeightCache = 0;
}

// Suppress active-block derivation shortly after our own programmatic scroll
// writes, so mirrored/synced panes don't fight over the active block.
const CODE_SCROLL_SUPPRESS_MS = 120;
const codeScrollWriteTimes = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

function setCodeScroll(el, top, left) {
  if (!el) return;
  try {
    if (typeof top === 'number') el.scrollTop = top;
    if (typeof left === 'number') el.scrollLeft = left;
    if (codeScrollWriteTimes) codeScrollWriteTimes.set(el, Date.now());
  } catch (_) {}
}

function isCodeScrollSuppressed(el) {
  try {
    if (!el || !codeScrollWriteTimes) return false;
    return (Date.now() - (codeScrollWriteTimes.get(el) || 0)) < CODE_SCROLL_SUPPRESS_MS;
  } catch (_) {
    return false;
  }
}

// Split <-> Code toggles rewrite the FR code value (which resets scrollTop
// to 0 synchronously) and hide/show the preview frames (which reflows the
// editors). The scroll events all of that queues would otherwise derive
// block 1 (scrollTop <= 4 → line 0) and overwrite the active block before
// the re-center passes run. While this guard is armed, scroll-driven active
// changes are ignored; explicit navigation (click/wheel → jumpToBlock) still
// works because it writes state directly instead of going through the scroll
// derivation.
let codeViewTransitionUntil = 0;
// Bumped every time the view becomes code-like, to cancel the Visual-mode
// restore loop still waiting on the preview frames to parse.
let visualRestoreGeneration = 0;

function isCodeViewTransitioning() {
  try {
    return Date.now() < codeViewTransitionUntil;
  } catch (_) {
    return false;
  }
}

// renderCodeWithActiveLines() rewrites the <pre> on every block change, which
// destroys any <mark> an open search placed there. Re-apply the current query
// afterwards so a search started in Code view survives arrow-key navigation and
// the active-block highlight moving.
function reapplySearchMarksToCodePanes() {
  try {
    if (typeof window === 'undefined') return;
    if (typeof window.__reapplyCodeSearch === 'function') window.__reapplyCodeSearch();
  } catch (_) {}
}

// Highlight <pre> that mirrors a given editor's text (the read-only layer
// carries the same line breaks, so its layout is the reference geometry).
function getCodeHighlightForEditor(editor) {
  if (!editor) return null;
  if (editor === enCodeEditor) return enCodeHighlight;
  if (editor === frCodeEditor) return frCodeHighlight;
  return null;
}

// The Wrap toolbar toggle sets `is-wrapped` on the editor box, which flips
// white-space to pre-wrap. Line height stays 22px, but one *logical* line can
// then occupy several *visual* lines, so scrollTop / CODE_LINE_HEIGHT is a
// visual line count, not a line number.
function isCodePaneWrapped(editor) {
  try {
    const box = editor && editor.closest ? editor.closest('.fr-code-editor-box') : null;
    return !!(box && box.classList.contains('is-wrapped'));
  } catch (_) {
    return false;
  }
}

// Content-space pixel offset of a logical line inside a code <pre>, measured
// from the real layout. Exact in wrap mode, where a line number is not a
// fixed multiple of the line height; returns null when the line can't be
// located so callers can fall back to the proportional estimate.
function getCodeLineTop(pre, line) {
  if (!pre || typeof line !== 'number' || isNaN(line) || line < 0) return null;
  try {
    // One .code-line element per logical line, in document order. The
    // zero-size .code-nl breaks between them are display:none, so a probe
    // *inside* a break node always measures a zero rect — the old text-walk
    // did exactly that and returned null for every line but the first,
    // leaving wrap-mode centring on the proportional fallback. Measuring the
    // line element itself reports its first visual row, wrapped or not, and
    // still works for empty lines (kept laid out by the :empty rule).
    const lineEls = pre.querySelectorAll('.' + CODE_LINE_CLASS);
    const idx = Math.floor(line);
    if (!lineEls || idx >= lineEls.length) return null;
    const elRect = lineEls[idx].getBoundingClientRect();
    if (!elRect || elRect.height === 0) return null;
    const preRect = pre.getBoundingClientRect();
    return elRect.top - preRect.top + (pre.scrollTop || 0);
  } catch (_) {
    return null;
  }
}

// Logical code line at the vertical center of an editor viewport (mirrors
// the visual view's reading line).
//
// The caret hit-test is exact for wrapped and unwrapped panes alike, so it is
// tried first in both. Only if it fails do we fall back to dividing pixels by
// the line height — which used to be the ONLY path for an unwrapped pane, and
// therefore the source of every "landed on the wrong block" report.
function codeCenterLine(editor) {
  if (!editor) return 0;
  {
    const pre = getCodeHighlightForEditor(editor);
    if (pre) {
      try {
        const r = pre.getBoundingClientRect();
        if (r.height >= 2) {
          const hit = lineFromPointInCode(pre, editor, r.left + Math.min(40, r.width / 2), r.top + r.height / 2);
          if (typeof hit === 'number' && !isNaN(hit) && hit >= 0) return hit;
        }
      } catch (_) {}
    }
  }
  const top = (editor.scrollTop || 0) + (editor.clientHeight || 0) / 2 - CODE_PAD_TOP;
  return Math.max(0, Math.floor(top / getCodeLineHeight()));
}

// Follow the user's scroll (wheel, trackpad, or scrollbar drag) by moving
// the active block to whatever sits at the reading line — the code-view
// equivalent of visual syncScroll. Never re-centers editors (that would yank
// the pane being dragged); the other pane keeps following proportionally via
// the existing scroll-mirror listeners.
function updateActiveFromCodeScroll(side, editor) {
  if (!editor || state.frViewMode === 'visual') return;
  if (!state.enBlocks || state.enBlocks.length === 0) return;
  if (isCodeViewTransitioning()) return;
  if (isCodeScrollSuppressed(editor)) return;
  // Pin the first/last block at the true scroll edges (mirrors visual view);
  // otherwise read the block under the viewport center.
  const maxScroll = Math.max(0, (editor.scrollHeight || 0) - (editor.clientHeight || 0));
  const top = editor.scrollTop || 0;
  const line = top <= 4 ? 0 : (maxScroll > 0 && top >= maxScroll - 4
    ? Number.MAX_SAFE_INTEGER
    : codeCenterLine(editor));
  const blockIdx = findBlockIndexForLine(side, line);
  if (blockIdx === null || blockIdx === undefined || isNaN(blockIdx)) return;
  const enIdx = side === 'fr' ? findEnIndexForFr(blockIdx) : blockIdx;
  // French-only content (extra blocks, grouped members handled inside the
  // lookup) maps to no English block: keep the current one rather than
  // clamping a null into block 0 and teleporting there on scroll.
  if (enIdx === null || enIdx === undefined || isNaN(enIdx)) return;
  const clamped = Math.max(0, Math.min(enIdx, state.enBlocks.length - 1));
  // The two panes must never be dragged together when they are independent:
  // Alt-held, paused, or manual sync off. Same gate as syncCodeViewScroll.
  const mayTouchOther = Boolean(state.autoSync && !state.syncPaused);
  if (clamped === state.activePreviewBlock) {
    // No new block, but the user just scrolled, so ratio-sync has put the panes
    // wherever proportional positions land — which is not level. Re-level the
    // highlight bars, pinning the pane being scrolled so its own view is untouched.
    if (mayTouchOther) scheduleCodeBarAlignment(side === 'en' ? 0 : 1);
    return;
  }
  state.activePreviewBlock = clamped;
  state.lastKnownEnIndex = clamped;
  updateCodeActiveBlockHighlight();
  // The bar is now drawn at whatever line the active block happens to fall on in
  // each pane, which differ because the two documents have different lengths.
  // Bring the other pane's bar onto this one's y — never move the pane being
  // scrolled. Centring is deliberately not used here: it would yank the view
  // while the user is scrolling it.
  if (mayTouchOther) scheduleCodeBarAlignment(side === 'en' ? 0 : 1);
  updateActiveBlockHud(clamped);
}

let enCodeBlockIndex = { text: null, ranges: [] };
let frCodeBlockIndex = { text: null, ranges: [] };

// Recorded French code positions, published by generateFrenchHtmlSource on
// every regeneration: frIndex -> { start, end } line spans in the FINAL
// (stamp-stripped) code text, keyed by that exact string. Text matching
// cannot locate blocks whose text generation reshaped (stripped definition
// labels, consumed brackets, injected markers), but generation knows every
// block's element — so the index reads recorded positions instead of
// guessing. A key mismatch (manual code edits) falls back to text matching.
let frCodeLineMap = { key: null, byIndex: new Map() };

// Locate <img> tags in the raw code, scanning quote-aware so a ">" inside an
// attribute value does not end the tag early.
//
// An image block cannot be found by text: its alt lives in an attribute, and the
// flattened projection drops it (it mirrors getBlockContent, which reads text
// nodes only), so findBlockInFlattened has nothing to match. Matching the alt
// inside the tag's own attribute region is exact, and — unlike pairing the
// k-th image block with the k-th tag — it stays correct when the code contains
// images that were dropped from the block list for having no usable alt.
function findImgTagSpans(codeText) {
  const spans = [];
  const re = /<img\b/gi;
  let m;
  while ((m = re.exec(codeText)) !== null) {
    let i = m.index + m[0].length;
    let quote = null;
    while (i < codeText.length) {
      const ch = codeText[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      i++;
    }
    const end = Math.min(i + 1, codeText.length);
    spans.push({ start: m.index, end, text: codeText.slice(m.index, end) });
    re.lastIndex = end;
  }
  return spans;
}

function buildCodeBlockIndex(codeText, blocks) {
  const ranges = [];
  if (!codeText || !blocks) return ranges;

  // Pass 1: sequential match, each block searching after the previous hit, so
  // repeated text maps to successive occurrences instead of all collapsing
  // onto the first one.
  const hits = new Array(blocks.length).fill(null);
  let cursor = 0;
  for (let i = 0; i < blocks.length; i++) {
    const r = findBlockInFlattened(codeText, blocks[i], cursor, Infinity);
    if (r) {
      hits[i] = r;
      cursor = Math.max(cursor, r.endFlat);
    }
  }

  // Pass 2: rescue blocks pass 1 could not place. A block missed there is
  // usually one whose text only appears near a neighbour (or is too short to
  // risk matching unconstrained), so search strictly inside the window its
  // already-resolved neighbours bracket. Anything found that way is monotonic
  // by construction, and a genuine duplicate can't pull it out of order.
  // Short needles are allowed here: the bracket is tight, so the first hit
  // inside it is the right one.
  for (let i = 0; i < blocks.length; i++) {
    if (hits[i]) continue;
    let lo = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (hits[j]) { lo = hits[j].endFlat; break; }
    }
    let hi = Infinity;
    for (let j = i + 1; j < blocks.length; j++) {
      if (hits[j]) { hi = hits[j].startFlat; break; }
    }
    const r = findBlockInFlattened(codeText, blocks[i], lo, hi, 1);
    if (r) hits[i] = r;
  }

  // Pass 2b: image blocks, placed by their <img> tag rather than by text. Runs
  // before the estimated fallback below so an image is never given a guessed
  // position: the tag span is exact, and it covers the whole tag even when a
  // long src wraps across several code lines.
  const imgSpans = findImgTagSpans(codeText);
  if (imgSpans.length) {
    const lineStarts = [0];
    for (let i = 0; i < codeText.length; i++) {
      if (codeText[i] === '\n') lineStarts.push(i + 1);
    }
    const lineAt = (off) => {
      let lo = 0;
      let hi2 = lineStarts.length - 1;
      while (lo < hi2) {
        const mid = (lo + hi2 + 1) >> 1;
        if (lineStarts[mid] <= off) lo = mid; else hi2 = mid - 1;
      }
      return lo;
    };
    const normAttr = (s) => String(s || '').toLowerCase().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const taken = new Set();
    for (let i = 0; i < blocks.length; i++) {
      if (hits[i] || !blocks[i] || blocks[i].tag !== 'img') continue;
      const needle = normAttr(blocks[i].text);
      let found = -1;
      if (needle) {
        for (let s = 0; s < imgSpans.length; s++) {
          if (taken.has(s)) continue;
          if (normAttr(imgSpans[s].text).includes(needle)) { found = s; break; }
        }
      }
      if (found === -1) {
        // The alt did not survive into the tag text (entity-normalised away, or
        // rewritten): fall back to the first unclaimed tag in document order.
        for (let s = 0; s < imgSpans.length; s++) if (!taken.has(s)) { found = s; break; }
      }
      if (found === -1) continue;
      taken.add(found);
      const span = imgSpans[found];
      hits[i] = {
        startLine: lineAt(span.start),
        endLine: lineAt(span.end),
        startFlat: span.start,
        endFlat: span.end,
      };
    }
  }

  // Pass 3: a block whose text could not be located still gets an entry.
  // Anything that steps along this index — block-to-block navigation, click
  // resolution, scroll-to-block — walks straight past a missing block, so the
  // user jumps two blocks instead of one and it looks like blocks are skipped.
  //
  // The usual cause is text the tool changed after the block list was built: a
  // footnote citation injected into a French paragraph makes the generated
  // markup longer than the .docx text this index matches against, so the needle
  // can never match.
  //
  // Each gap is interpolated between its nearest resolved neighbours, which
  // keeps the sequence monotonic with block order (an unconstrained search would
  // match a duplicate far away and reorder the document). Estimates are flagged
  // so the bar draws in the approximate style rather than as an exact hit —
  // the same convention findRangeForBlockIndex already uses.
  for (let i = 0; i < blocks.length; i++) {
    if (hits[i]) continue;
    let lo = -1;
    for (let j = i - 1; j >= 0; j--) if (hits[j]) { lo = j; break; }
    let hi = -1;
    for (let j = i + 1; j < blocks.length; j++) if (hits[j]) { hi = j; break; }

    let line;
    if (lo >= 0 && hi >= 0) {
      const t = (i - lo) / (hi - lo);
      line = Math.round(hits[lo].endLine + t * (hits[hi].startLine - hits[lo].endLine));
      line = Math.max(hits[lo].endLine, Math.min(hits[hi].startLine, line));
    } else if (lo >= 0) {
      line = hits[lo].endLine + (i - lo);
    } else if (hi >= 0) {
      line = Math.max(0, hits[hi].startLine - (hi - i));
    } else {
      line = 0;
    }
    hits[i] = { startLine: line, endLine: line, estimated: true };
  }

  for (let i = 0; i < blocks.length; i++) {
    const r = hits[i];
    if (r) ranges.push({ startLine: r.startLine, endLine: r.endLine, index: i, estimated: Boolean(r.estimated) });
  }
  ranges.sort((a, b) => a.startLine - b.startLine);
  return ranges;
}


function getCodeBlockIndex(side) {
  const isEn = side === 'en';
  const editor = isEn ? enCodeEditor : frCodeEditor;
  const blocks = isEn ? state.enBlocks : state.frBlocks;
  const cache = isEn ? enCodeBlockIndex : frCodeBlockIndex;
  const text = editor ? editor.value || '' : '';
  if (cache.text !== text) {
    cache.text = text;
    cache.ranges = buildCodeBlockIndex(text, blocks);
  }
  if (!isEn && frCodeLineMap.key === text && frCodeLineMap.byIndex.size) {
    // Recorded positions beat text matching: generation stamped each French
    // block's element, so locations are exact regardless of how markers,
    // labels, or brackets reshaped the text afterward. Unstamped blocks keep
    // their text-matched (or interpolated) ranges.
    const total = blocks ? blocks.length : 0;
    const byIdx = new Map();
    cache.ranges.forEach((r) => byIdx.set(r.index, r));
    frCodeLineMap.byIndex.forEach((span, frIdx) => {
      if (typeof frIdx !== 'number' || isNaN(frIdx) || frIdx < 0 || frIdx >= total) return;
      const start = Math.max(0, span.start);
      const end = Math.max(start, span.end);
      byIdx.set(frIdx, { startLine: start, endLine: end, index: frIdx, estimated: false });
    });
    return Array.from(byIdx.values()).sort((a, b) => a.startLine - b.startLine);
  }
  return cache.ranges;
}

function findBlockIndexForLine(side, line) {
  // Garbage lines (negative / NaN) resolve to nothing instead of snapping to
  // the first block — a mis-resolved click must never teleport to block 1.
  if (typeof line !== 'number' || isNaN(line) || line < 0) return null;
  const ranges = getCodeBlockIndex(side);
  if (!ranges.length) return null;
  for (let i = 0; i < ranges.length; i++) {
    if (line >= ranges[i].startLine && line <= ranges[i].endLine) return ranges[i].index;
  }
  // Snap to the nearest block, like the visual view does.
  let best = ranges[0];
  let bestDist = Math.abs(line - ranges[0].startLine);
  for (let i = 1; i < ranges.length; i++) {
    const dist = line < ranges[i].startLine
      ? ranges[i].startLine - line
      : line - ranges[i].endLine;
    if (dist < bestDist) {
      bestDist = dist;
      best = ranges[i];
    }
  }
  return best.index;
}

function findEnIndexForFr(frIdx) {
  if (typeof frIdx !== 'number' || frIdx < 0) return null;
  const pairs = state.alignPairs || [];
  // Direct pair first, then grouped members: a French block absorbed into a
  // multi-line group has no pair of its own but still belongs to the group's
  // English block. Anything else (extra French content) has no English
  // counterpart — null, never a clamped guess at another block's line.
  const direct = pairs.find((p) => p.frIndex === frIdx && !p.skip);
  if (direct && direct.enIndex !== null && direct.enIndex !== undefined) return direct.enIndex;
  const grouped = pairs.find((p) => !p.skip && Array.isArray(p.groupedFrIndices) && p.groupedFrIndices.includes(frIdx));
  if (grouped && grouped.enIndex !== null && grouped.enIndex !== undefined) return grouped.enIndex;
  return null;
}

// --- Independent (Alt / sync-paused) stepping inside the code view ---
// The preview-frame stepper can't be reused here: in Code mode both frames
// are display:none. jumpToBlock() isn't a substitute either — it routes
// through syncCodeViewToActiveBlock, which re-centers BOTH editors, so Alt
// looked inert (it only suppressed the EN<->FR mirror). This steps exactly
// one code pane and leaves the other where it is.

// Which code pane the user is working in. Focus wins; otherwise the last
// pane they pointed at or scrolled. The <pre> layers are pointer-events:none
// and the EN textarea is too, so this is tracked on the wrap containers.
let lastCodeSide = 'fr';

function markCodeSide(side) {
  lastCodeSide = side === 'en' ? 'en' : 'fr';
}

function getLastCodeSide() {
  if (document.activeElement === frCodeEditor) return 'fr';
  if (document.activeElement === enCodeEditor) return 'en';
  return lastCodeSide;
}

function bindCodeSideTracking() {
  const pairs = [
    { el: enCodeWrap, side: 'en' },
    { el: frCodeWrap, side: 'fr' },
  ];
  pairs.forEach(({ el, side }) => {
    if (!el || el.dataset.sideMarkBound === 'true') return;
    el.dataset.sideMarkBound = 'true';
    const mark = () => markCodeSide(side);
    el.addEventListener('mousedown', mark);
    el.addEventListener('wheel', mark, { passive: true });
    el.addEventListener('keydown', mark);
  });
}

// Step one block within a single code pane. Returns the new active block or
// null when there is nothing to step.
function stepCodeEditorBlock(side, stepCount) {
  try {
    const isEn = side === 'en';
    const editor = isEn ? enCodeEditor : frCodeEditor;
    if (!editor) return null;
    const value = editor.value || '';
    if (!value) return null;
    const ranges = getCodeBlockIndex(isEn ? 'en' : 'fr');
    if (!ranges.length) return null;

    // Step along document order, not by numeric block index: EN and FR
    // numbering diverge as soon as anything is missing or extra, so
    // index +/- 1 can skip or repeat a block.
    const curLine = codeCenterLine(editor);
    let pos = ranges.findIndex((r) => curLine >= r.startLine && curLine <= r.endLine);
    if (pos === -1) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const d = curLine < r.startLine
          ? r.startLine - curLine
          : (curLine > r.endLine ? curLine - r.endLine : 0);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      pos = best;
    }

    const nextPos = Math.max(0, Math.min(pos + stepCount, ranges.length - 1));
    const maxIdx = state.enBlocks ? state.enBlocks.length - 1 : 0;

    // One decision, one block space. The scroll target and the active block
    // used to be resolved independently: the target from `next` (a block in
    // this pane's own space) and the active block from the English index that
    // FR block pairs to. On the FR side those are two different block spaces
    // and they disagree wherever a figure sits, because the FR block after a
    // figure can pair back onto the figure's own English block. The highlight
    // then stayed on the figure while the pane scrolled to the following
    // block, which parks the figure at the top of the view.
    //
    // So walk forward to the first range that genuinely changes the active
    // block, and take the scroll position from that same range. A press then
    // either advances the highlight, or does nothing visible — it can never
    // leave the view on a line the highlight is not on.
    const dir = stepCount >= 0 ? 1 : -1;
    let clamped = null;
    let next = null;
    for (let i = nextPos; i >= 0 && i < ranges.length; i += dir) {
      const r = ranges[i];
      const candidate = isEn ? r.index : findEnIndexForFr(r.index);
      // Ranges with no English counterpart (extra French content) can never
      // change the active block: walk past them instead of clamping null to 0.
      if (candidate === null || candidate === undefined || isNaN(candidate)) continue;
      const c = Math.max(0, Math.min(candidate, maxIdx));
      if (c !== state.activePreviewBlock) { clamped = c; next = r; break; }
    }
    if (clamped === null) return null;

    state.activePreviewBlock = clamped;
    state.lastKnownEnIndex = clamped;

    // Recenter ONLY this editor. No applyActiveHighlight() / no
    // syncCodeViewToActiveBlock() — those are what dragged the other pane
    // along, which is the behaviour Alt exists to switch off.
    //
    // The view update is guarded separately from the state change above. The
    // outer catch returns null, so a throw in the highlight/HUD layer used to
    // report "nothing happened" even though the active block had already moved
    // — the caller then treated the keypress as ignored while the pane sat
    // somewhere new. Report the block that was actually selected either way.
    const lineCount = Math.max(1, value.split('\n').length);
    try {
      centerEditorOnLine(editor, (next.startLine + next.endLine) / 2, lineCount);
      if (isEn) {
        syncEnCodeScroll(editor);
      } else {
        syncFrCodeScroll();
      }
      updateCodeActiveBlockHighlight();
      updateActiveBlockHud(clamped);
    } catch (_) {
      return clamped;
    }
    return clamped;
  } catch (_) {
    return null;
  }
}

if (typeof window !== 'undefined') {
  // Bridged on window because keyboard-nav -> code-view -> scroll-sync ->
  // keyboard-nav is an import cycle (same contract as syncCodeViewToActiveBlock).
  window.stepCodeEditorBlock = stepCodeEditorBlock;
  window.getLastCodeSide = getLastCodeSide;
  window.resetCodeLineHeight = resetCodeLineHeight;
}

function jumpToCodeBlock(side, idx) {
  if (typeof idx !== 'number' || isNaN(idx)) return;
  if (side === 'fr') {
    idx = findEnIndexForFr(idx);
    // Clicking French-only content has no English block to jump to: ignore
    // rather than clamping to block 0.
    if (idx === null || idx === undefined || isNaN(idx)) return;
  }
  if (!state.enBlocks || !state.enBlocks.length) return;
  idx = Math.max(0, Math.min(idx, state.enBlocks.length - 1));
  jumpToBlock(idx);
}

function centerEditorOnLine(editor, line, lineCount) {
  if (!editor || lineCount <= 1) return;
  const maxScroll = Math.max(0, editor.scrollHeight - editor.clientHeight);
  if (maxScroll <= 0) return;
  const pad = CODE_PAD_TOP * 2;
  // Wrapped panes: measure the line instead of scaling a line number across
  // the content height. With pre-wrap a logical line spans a variable number
  // of visual lines, so line * (contentH / lineCount) is only a guess — and a
  // wrong guess here re-centers on the wrong block, whose scroll event then
  // derives a *different* active block, so the next keypress compounds the
  // drift instead of undoing it.
  const measured = isCodePaneWrapped(editor)
    ? getCodeLineTop(getCodeHighlightForEditor(editor), Math.round(line))
    : null;
  const dest = measured !== null && measured !== undefined
    ? measured - editor.clientHeight / 2
    // Non-wrapped pane: every line is the same measured height, so the offset
    // of a line is simply line * height. Scaling a line number by
    // (scrollHeight - pad) / lineCount instead folds the padding into the
    // divisor and comes out short by the padding fraction, which drifts about a
    // line every twenty and centres the pane on a neighbouring block.
    : (line * getCodeLineHeight() + pad / 2 - editor.clientHeight / 2);
  setCodeScroll(editor, Math.max(0, Math.min(Math.round(dest), maxScroll)));
}

// The two panes centre the block independently, and centring is clamped at a
// document boundary. The English and French documents have different lengths, so
// near the top or the end the same block lands at a different height in each and
// the two highlight bars read as a stepped band instead of one level bar.
//
// Measure where each bar actually landed and nudge the scrolls until they share
// a y. Only ever scrolls down (which is blocked only at the very bottom), and
// re-measures up to three times so a pane that hit its bottom clamp pulls the
// other one back into agreement.
// The y values both panes can share: the overlap of their scrollable ranges,
// intersected with the band actually on screen. A target outside the band is
// inside the scroll range yet invisible, so it has to be excluded.
function reachableRange(bases, maxScrolls, visible) {
  let lo = -Infinity;
  let hi = Infinity;
  bases.forEach((b, i) => {
    const paneLo = b - (maxScrolls[i] || 0);
    if (paneLo > lo) lo = paneLo;
    if (b < hi) hi = b;
  });
  if (visible) {
    if (visible.top > lo) lo = visible.top;
    if (visible.bottom < hi) hi = visible.bottom;
  }
  return lo <= hi ? { lo, hi } : null;
}

// Picks the one y that both panes can place their bar on.
//
// A pane's bar can sit anywhere in [base - maxScroll, base]: base is where it
// falls with the pane scrolled to the very top (the lowest it can go), and
// base - maxScroll is where it lands scrolled to the very bottom. Both panes
// sharing a y means the target has to lie in the overlap of those intervals —
// which is why neither "align to the highest" nor "align to the lowest" works:
// whichever you pick, the pane pinned at the opposite end of its document cannot
// follow.
//
// `preferred` (the vertical centre of the panes) wins whenever both panes can
// actually reach it, so the active block is centred in the English and the
// French alike. When one pane is clamped against a document boundary centring
// is unreachable, and levelling takes priority: the target falls back to the
// average of where the bars are now, which keeps the scroll movement small.
// Returns null when no common on-screen y exists, meaning the panes should be
// left alone rather than fight for one.
function levelTarget(bases, maxScrolls, currentTops, preferred, visible) {
  const range = reachableRange(bases, maxScrolls, visible);
  if (!range) return null;
  if (typeof preferred === 'number' && !Number.isNaN(preferred) && preferred >= range.lo && preferred <= range.hi) {
    return Math.round(preferred);
  }
  const avg = currentTops.reduce((s, t) => s + t, 0) / currentTops.length;
  return Math.max(range.lo, Math.min(range.hi, Math.round(avg)));
}

// `pinnedIndex` names the pane the user is currently driving. That pane is left
// exactly where they put it and the other is brought to meet it — nudging the
// pane under their cursor would fight the scroll they are making.
// Re-levelling the two bars reads layout (getBoundingClientRect) and writes
// scrollTop, so running it on every scroll event both thrashes layout and
// re-enters through the scroll listener it triggers. Coalesce to one pass per
// frame instead, and let a newer request supersede an older one.
let barAlignFrame = 0;

function scheduleCodeBarAlignment(pinnedIndex = null) {
  if (barAlignFrame) return;
  barAlignFrame = requestAnimationFrame(() => {
    barAlignFrame = 0;
    alignCodeBarsHorizontally(pinnedIndex);
  });
}

function alignCodeBarsHorizontally(pinnedIndex = null) {
  if (state.frViewMode === 'visual') return;
  // The bars live in the highlight <pre>s, but the native scroller differs
  // per pane: EN scrolls its <pre> directly (the textarea is a hidden
  // overlay), FR scrolls its textarea (the <pre> is a mirror). All leveling
  // math runs in highlight space; writes go through the native scroller, with
  // the FR target inverse-mapped through the editor<->highlight ratio.
  // Mixing pre geometry with editor scrollTops (as this used to) misplaces
  // both bars by the pre/editor height difference wherever lines wrap.
  const panes = [
    { view: enCodeHighlight, inner: enCodeHighlightInner, editor: enCodeEditor, pre: enCodeHighlight, native: 'pre', sync: () => syncEnCodeScroll(enCodeHighlight) },
    { view: frCodeHighlight, inner: frCodeHighlightInner, editor: frCodeEditor, pre: frCodeHighlight, native: 'editor', sync: () => syncFrCodeScroll() },
  ].filter((p) => p.view && p.inner && p.editor && p.pre);
  if (panes.length < 2) return;

  const rects = panes.map((p) => p.view.getBoundingClientRect());
  const [a, b] = rects;
  // Only meaningful when the panes sit side by side at the same height; if the
  // layout stacks them differently a shared bar position means nothing.
  // NOTE: this must be the <pre> viewport, not the <code> inside it — the inner
  // element is the whole scrollable document (ten thousand pixels tall), so its
  // top and height reflect the scroll position, not the visible box.
  if (Math.abs(a.top - b.top) > 2 || Math.abs(a.height - b.height) > 2) return;

  // A long block lights many lines: level by the MIDDLE of each bar span, not
  // its first line. scrollCodeEditorsToRanges centres the block midpoint, and
  // levelling by the top edge would drag it back down — parking a tall block
  // by its first line at viewport centre so the rest spills below the fold.
  const spans = panes.map((p) => Array.from(p.inner.querySelectorAll('.code-active-line')));
  if (spans.some((lines) => lines.length === 0)) return;

  // Recover each bar's middle in its own highlight document from where it
  // currently sits, so its achievable interval is known without measuring a
  // hidden element. Viewport mids are converted to highlight-scroll space by
  // subtracting the pane top: same space as pre.scrollTop.
  const mids = spans.map((lines) => {
    const first = lines[0].getBoundingClientRect();
    const last = lines[lines.length - 1].getBoundingClientRect();
    return (first.top + last.bottom) / 2 - a.top;
  });
  const preTops = panes.map((p) => p.pre.scrollTop || 0);
  const bases = panes.map((p, i) => mids[i] + preTops[i]);
  const maxScrolls = panes.map((p) => Math.max(0, p.pre.scrollHeight - p.pre.clientHeight));
  const visible = { top: 0, bottom: a.height };
  const range = reachableRange(bases, maxScrolls, visible);
  if (!range) return;

  const pinned = (pinnedIndex !== null && panes[pinnedIndex]) ? pinnedIndex : null;
  let target;
  if (pinned !== null) {
    // Pinned means pinned. If the user's bar cannot be shared, leave both panes
    // alone: falling back to centring would move the other pane without the
    // pinned one and leave the two bars further apart than before.
    const at = Math.round(mids[pinned]);
    if (at < range.lo || at > range.hi) return;
    target = at;
  } else {
    // Centred, not top-aligned: both panes scroll so the active block sits at
    // the vertical centre of the code area. That is the one y both panes can
    // aim at and still have the block read as centred in each — top-aligning
    // instead parked the block at the top edge of the pane, which is where this
    // used to leave it.
    //
    // The centre of the shared <pre> viewport, not the inner <code> (the inner
    // element is the whole scrollable document and has no meaningful centre).
    target = levelTarget(bases, maxScrolls, mids, a.height / 2, visible);
    if (target === null) return;   // no shared y is reachable; leave both alone
  }

  bases.forEach((base, i) => {
    if (i === pinned) return;
    const wantPre = Math.max(0, Math.min(maxScrolls[i], base - target));
    const p = panes[i];
    // Hold the ratio-mirror lock while placing the bar: the scrollTop write
    // fires the other pane's scroll listener, which would otherwise ratio-sync
    // straight back and undo the level. Released on the next frame, exactly
    // like syncCodeViewScroll does. Written through setCodeScroll (rather than
    // a bare assignment) so block derivation is suppressed for our own move too.
    if (p.native === 'pre') {
      const delta = wantPre - (p.pre.scrollTop || 0);
      if (!delta) return;
      codeViewScrollLock = true;
      setCodeScroll(p.pre, wantPre);
      p.sync();
      requestAnimationFrame(() => { codeViewScrollLock = false; });
    } else {
      const edMax = Math.max(0, p.editor.scrollHeight - p.editor.clientHeight);
      const wantEd = !maxScrolls[i] || !edMax ? wantPre : (wantPre / maxScrolls[i]) * edMax;
      const delta = wantEd - (p.editor.scrollTop || 0);
      if (!delta) return;
      codeViewScrollLock = true;
      setCodeScroll(p.editor, wantEd);
      p.sync();
      requestAnimationFrame(() => { codeViewScrollLock = false; });
    }
  });
}

function scrollCodeEditorsToRanges(ranges) {
  if (!ranges || state.frViewMode === 'visual') return;
  // Every scrollTop write below fires a scroll event that ratio-mirrors the
  // other pane (syncCodeViewScroll). The centers stamp derivation suppression
  // but nothing stops the mirror — with wrap on, proportional positions are
  // systematically wrong (the panes wrap to different row counts), so the
  // mirror visibly undoes the centring right after it lands. Hold the mirror
  // lock for the whole sequence; the release rides the next frame.
  codeViewScrollLock = true;
  try {
    if (!centerPreOnBarMid('en') && ranges.en && enCodeEditor && enCodeEditor.value) {
      const lineCount = Math.max(1, enCodeEditor.value.split('\n').length);
      centerEditorOnLine(enCodeEditor, (ranges.en.startLine + ranges.en.endLine) / 2, lineCount);
      syncEnCodeScroll(enCodeEditor);
    }
    if (!centerPreOnBarMid('fr') && ranges.fr && frCodeEditor && frCodeEditor.value) {
      const lineCount = Math.max(1, frCodeEditor.value.split('\n').length);
      centerEditorOnLine(frCodeEditor, (ranges.fr.startLine + ranges.fr.endLine) / 2, lineCount);
      syncFrCodeScroll();
    }
  } finally {
    requestAnimationFrame(() => { codeViewScrollLock = false; });
  }
}

// Centre a highlight on its own active bar's middle — the code-view version
// of what alignPreviewBlocks does per visual pane: dest = bar middle minus
// viewport half, clamped per pane. Both bars land centred, so they are level
// with each other, with no shared target and no second pass to fight the
// first. Bar rects are scaled by the box CSS zoom while scroll space and
// clientHeight are layout px, so the rect delta is converted back with
// invZoom (same conversion as the gutter layout).
function centerPreOnBarMid(side) {
  try {
    const isEn = side === 'en';
    const pre = isEn ? enCodeHighlight : frCodeHighlight;
    const inner = isEn ? enCodeHighlightInner : frCodeHighlightInner;
    const editor = isEn ? enCodeEditor : frCodeEditor;
    if (!pre || !inner || !editor || pre.clientHeight === 0) return false;
    const bars = inner.querySelectorAll('.' + activeLineClass);
    if (!bars || !bars.length) return false;
    const first = bars[0].getBoundingClientRect();
    const last = bars[bars.length - 1].getBoundingClientRect();
    const preRect = pre.getBoundingClientRect();
    if (!preRect || preRect.height === 0) return false;
    let invZoom = 1;
    try {
      const box = pre.closest ? pre.closest('.fr-code-editor-box') : null;
      const z = parseFloat((box && (box.style.zoom || getComputedStyle(box).zoom)) || '');
      if (z > 0 && isFinite(z)) invZoom = 1 / z;
    } catch (_) {}
    const midContent = (((first.top + last.bottom) / 2) - preRect.top) * invZoom + (pre.scrollTop || 0);
    const preMax = Math.max(0, (pre.scrollHeight || 0) - (pre.clientHeight || 0));
    const wantPre = Math.max(0, Math.min(preMax, midContent - (pre.clientHeight || 0) / 2));
    if (isEn) {
      // EN scrolls its <pre> directly; the textarea is a hidden overlay.
      setCodeScroll(pre, wantPre);
      syncEnCodeScroll(pre);
    } else {
      // FR scrolls its textarea; the <pre> is a mirror reached through the
      // editor<->highlight ratio.
      const edMax = Math.max(0, (editor.scrollHeight || 0) - (editor.clientHeight || 0));
      const wantEd = !preMax || !edMax ? wantPre : (wantPre / preMax) * edMax;
      setCodeScroll(editor, wantEd);
      syncFrCodeScroll();
    }
    return true;
  } catch (_) {
    return false;
  }
}

function syncCodeViewToActiveBlock() {
  const ranges = updateCodeActiveBlockHighlight();
  scrollCodeEditorsToRanges(ranges);
  return ranges;
}

// Resolve a code line from a caret range. Accepts ranges inside the highlight
// <pre> (normal hit-testing) AND ranges reporting the overlay <textarea> as
// container (some engines hit-test the topmost element despite its
// pointer-events:none). The textarea holds the same code text, so its
// character offset maps to a line exactly — independent of zoom or overlay
// quirks. Returns null when the range belongs to neither.
function codeLineFromRange(pre, editor, range) {
  try {
    if (!range || range.startContainer === null || range.startContainer === undefined) return null;
    if (pre && typeof pre.contains === 'function' && pre.contains(range.startContainer)) {
      const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
      let line = 0;
      let node = null;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue || '';
        if (node === range.startContainer) {
          line += text.substring(0, range.startOffset).split('\n').length - 1;
          return line;
        }
        line += text.split('\n').length - 1;
      }
      return line;
    }
    if (editor && range.startContainer === editor && typeof range.startOffset === 'number') {
      const value = editor.value || '';
      const at = Math.max(0, Math.min(range.startOffset, value.length));
      return value.substring(0, at).split('\n').length - 1;
    }
  } catch (_) {}
  return null;
}

// `editor` is the scroller whose text the <pre> mirrors. It must be passed
// explicitly: when hit-testing reports the overlay textarea as the container
// instead of a node inside the <pre>, the fallback reads character offsets
// from that textarea — hardcoding the English one returned English line
// numbers for the French pane.
function lineFromPointInCode(pre, editor, clientX, clientY) {
  try {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos) range = { startContainer: pos.offsetNode, startOffset: pos.offset };
    }
    const line = codeLineFromRange(pre, editor, range);
    if (line !== null && line !== undefined) return line;
  } catch (_) {}
  // Fallback: approximate from pointer Y position. Deliberately unclamped:
  // a negative result means "not on content" and must resolve to null
  // (via findBlockIndexForLine) rather than teleporting to block 1.
  // Wrapped panes get a wrap-aware estimate (see isCodePaneWrapped).
  try {
    const rect = pre.getBoundingClientRect();
    const zoom = state.previewZoom || 1.0;
    const y = clientY - rect.top - CODE_PAD_TOP * zoom + pre.scrollTop;
    const visual = Math.floor(y / (getCodeLineHeight() * zoom));
    if (!isCodePaneWrapped(editor)) return visual;
    // Average the visual line over the neighbours on either side: with
    // pre-wrap most lines are still one visual line, so the ratio stays
    // near 1 and only genuinely-wrapped lines are corrected.
    const raw = editor ? (editor.value || '') : pre.textContent || '';
    const total = Math.max(1, raw.split('\n').length);
    const scale = Math.max(1, editor ? (editor.scrollHeight / (getCodeLineHeight() * total)) : 1);
    return Math.max(0, Math.floor(visual / scale));
  } catch (_) {}
  return null;
}

function bindCodeBlockClick() {
  if (enCodeHighlight && enCodeHighlight.dataset.blockClickBound !== 'true') {
    enCodeHighlight.dataset.blockClickBound = 'true';
    enCodeHighlight.addEventListener('click', (e) => {
      if (state.frViewMode === 'visual') return;
      const line = lineFromPointInCode(enCodeHighlight, enCodeEditor, e.clientX, e.clientY);
      if (line === null || line === undefined) return;
      const idx = findBlockIndexForLine('en', line);
      if (idx !== null && idx !== undefined) jumpToCodeBlock('en', idx);
    });
  }
  if (frCodeEditor && frCodeEditor.dataset.blockClickBound !== 'true') {
    frCodeEditor.dataset.blockClickBound = 'true';
    frCodeEditor.addEventListener('click', () => {
      if (state.frViewMode === 'visual') return;
      const pos = frCodeEditor.selectionStart;
      if (pos === null || pos === undefined) return;
      const line = (frCodeEditor.value || '').substring(0, pos).split('\n').length - 1;
      const idx = findBlockIndexForLine('fr', line);
      if (idx !== null && idx !== undefined) jumpToCodeBlock('fr', idx);
    });
  }
  bindCodeSideTracking();
}

if (typeof window !== 'undefined') {
  window.syncCodeViewToActiveBlock = syncCodeViewToActiveBlock;
  window.jumpToCodeBlock = jumpToCodeBlock;
  window.__relayoutCodeGutters = relayoutCodeGutters;
}

// Re-measure gutter rows and re-pin gutter scroll positions. Called after
// anything that changes rendered line heights without changing the text:
// wrap toggle, preview zoom, pane resize, font load.
function relayoutCodeGutters() {
  try {
    layoutCodeGutters();
    if (typeof enCodeHighlight !== 'undefined' && enCodeHighlight) {
      syncEnCodeScroll(enCodeHighlight);
    }
    syncFrCodeScroll();
  } catch (_) {}
}

// Wrapped heights depend on pane width, zoom, and fonts — none of which go
// through the text-driven render paths. Observe the editor boxes (covers
// collapse/expand, split toggles, zoom) plus window resize and font load.
let gutterRelayoutQueued = false;
function scheduleGutterRelayout() {
  if (gutterRelayoutQueued) return;
  gutterRelayoutQueued = true;
  const run = () => {
    gutterRelayoutQueued = false;
    relayoutCodeGutters();
  };
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(run);
  else setTimeout(run, 32);
}

try {
  if (typeof ResizeObserver !== 'undefined') {
    const gutterRO = new ResizeObserver(() => scheduleGutterRelayout());
    ['enCodeEditorBox', 'frCodeEditorBox'].forEach((id) => {
      try {
        const box = typeof document !== 'undefined' ? document.getElementById(id) : null;
        if (box) gutterRO.observe(box);
      } catch (_) {}
    });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', scheduleGutterRelayout);
  }
  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(() => scheduleGutterRelayout()).catch(() => {});
  }
} catch (_) {}

// Gutter rows sized to the highlight layer's RENDERED lines. The gutter holds
// one number per logical line while wrapped code renders many visual rows per
// line, so no scrollTop mapping can align a plain-text gutter: the rows
// themselves must match the rendered heights. Measured from element tops
// (not per-line heights) so rounding cannot accumulate down the document.
// After layout, gutter and highlight share the same content height and 1:1
// scroll sync is exact in both wrapped and unwrapped modes.
function layoutCodeGutter(side) {
  try {
    const isEn = side === 'en';
    const editor = isEn ? enCodeEditor : frCodeEditor;
    const pre = isEn ? enCodeHighlight : frCodeHighlight;
    const inner = isEn ? enCodeHighlightInner : frCodeHighlightInner;
    const gutter = isEn ? enCodeGutter : frCodeGutter;
    if (!editor || !pre || !inner || !gutter) return false;
    if (pre.clientHeight === 0) return false;
    const text = editor.value || '';
    const lineCount = text ? text.split('\n').length : 1;
    const lineEls = inner.querySelectorAll('.' + CODE_LINE_CLASS);
    if (!lineEls || lineEls.length !== lineCount) return false;
    const preRect = pre.getBoundingClientRect();
    if (!preRect || preRect.height === 0) return false;
    // CSS `zoom` on the editor box (preview zoom) scales getBoundingClientRect
    // but NOT scrollHeight, scrollTop, or style px. Convert the measured tops
    // back to layout px (divide by the box zoom) or every row renders z-times
    // too short and the shortfall accumulates down the document. Page-level
    // browser zoom needs no handling: it scales all CSS px uniformly.
    let invZoom = 1;
    try {
      const box = editor.closest ? editor.closest('.fr-code-editor-box') : null;
      const zRaw = (box && (box.style.zoom
        || (typeof getComputedStyle !== 'undefined' ? getComputedStyle(box).zoom : ''))) || '';
      const z = parseFloat(zRaw);
      if (z > 0 && isFinite(z)) invZoom = 1 / z;
    } catch (_) {}
    const scrollTop = pre.scrollTop || 0;
    const tops = new Array(lineEls.length);
    for (let i = 0; i < lineEls.length; i++) {
      const r = lineEls[i].getBoundingClientRect();
      if (!r || r.height === 0) return false;
      tops[i] = (r.top - preRect.top) * invZoom + scrollTop;
    }
    const cs = typeof getComputedStyle !== 'undefined' ? getComputedStyle(pre) : null;
    const padBottom = cs ? (parseFloat(cs.paddingBottom) || 0) : 16;
    const contentBottom = (pre.scrollHeight || 0) - padBottom;
    // Rebuild rows only when the line count changed; otherwise update heights.
    if (gutter.children.length !== lineCount) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < lineCount; i++) {
        const row = document.createElement('div');
        row.className = 'fr-code-gutter-row';
        row.textContent = String(i + 1);
        frag.appendChild(row);
      }
      gutter.replaceChildren(frag);
    }
    const rows = gutter.children;
    if (!rows || rows.length !== lineCount) return false;
    for (let i = 0; i < lineCount; i++) {
      const next = i + 1 < tops.length ? tops[i + 1] : contentBottom;
      const h = Math.max(0, next - tops[i]);
      rows[i].style.height = h.toFixed(2) + 'px';
    }
    gutter.scrollTop = pre.scrollTop || 0;
    return true;
  } catch (_) {
    return false;
  }
}

function layoutCodeGutters() {
  let ok = false;
  try { ok = layoutCodeGutter('en') || ok; } catch (_) {}
  try { ok = layoutCodeGutter('fr') || ok; } catch (_) {}
  return ok;
}

// Mirror scroll between two code layers whose content heights differ
// (wrapped lines, entity rendering). Ends stay glued; the middle tracks.
// Unrounded so a mirror round-trip converges instead of oscillating.
function mirrorCodeScroll(from, to) {
  if (!from || !to || from === to) return;
  try {
    const fromMax = Math.max(0, (from.scrollHeight || 0) - (from.clientHeight || 0));
    const toMax = Math.max(0, (to.scrollHeight || 0) - (to.clientHeight || 0));
    const top = !fromMax || !toMax
      ? (from.scrollTop || 0)
      : ((from.scrollTop || 0) / fromMax) * toMax;
    setCodeScroll(to, top, from.scrollLeft);
  } catch (_) {}
}

function syncFrCodeScroll() {
  if (!frCodeEditor) return;
  if (frCodeHighlight) {
    mirrorCodeScroll(frCodeEditor, frCodeHighlight);
  }
  // Gutter rows are sized to the highlight's rendered lines, so gutter and
  // highlight share the same content height: 1:1 from the visible layer.
  if (frCodeGutter && frCodeHighlight) {
    frCodeGutter.scrollTop = frCodeHighlight.scrollTop;
  }
}

function syncEnCodeScroll(source) {
  if (!enCodeEditor || !enCodeHighlight) return;
  const target = source === enCodeHighlight ? enCodeEditor : enCodeHighlight;
  mirrorCodeScroll(source, target);
  if (enCodeGutter) enCodeGutter.scrollTop = enCodeHighlight.scrollTop;
}

let codeViewScrollLock = false;

function syncCodeViewScroll(source) {
  if (!frCodeEditor || !enCodeHighlight || codeViewScrollLock) return;
  // Alt-held / paused / manual: EN and FR panes scroll independently (mirrors visual view).
  if (!state.autoSync || state.syncPaused) return;
  const sourceMaxY = Math.max(0, source.scrollHeight - source.clientHeight);
  const sourceMaxX = Math.max(0, source.scrollWidth - source.clientWidth);
  const yRatio = sourceMaxY ? source.scrollTop / sourceMaxY : 0;
  const xRatio = sourceMaxX ? source.scrollLeft / sourceMaxX : 0;
  const target = source === frCodeEditor ? enCodeHighlight : frCodeEditor;
  const targetMaxY = Math.max(0, target.scrollHeight - target.clientHeight);
  const targetMaxX = Math.max(0, target.scrollWidth - target.clientWidth);

  codeViewScrollLock = true;
  setCodeScroll(target, yRatio * targetMaxY, xRatio * targetMaxX);
  if (target === enCodeHighlight) {
    syncEnCodeScroll(enCodeHighlight);
  } else {
    syncFrCodeScroll();
  }
  requestAnimationFrame(() => {
    codeViewScrollLock = false;
  });
}

function bindEnCodeScrollSync() {
  if (!enCodeEditor || !enCodeHighlight || enCodeHighlight.dataset.scrollSyncBound === 'true') return;
  enCodeHighlight.dataset.scrollSyncBound = 'true';
  enCodeHighlight.addEventListener('scroll', () => {
    syncEnCodeScroll(enCodeHighlight);
    syncCodeViewScroll(enCodeHighlight);
    updateActiveFromCodeScroll('en', enCodeHighlight);
  }, { passive: true });
  enCodeEditor.addEventListener('scroll', () => {
    syncEnCodeScroll(enCodeEditor);
    syncCodeViewScroll(enCodeEditor);
    // Parity with the FR editor below: without this the English pane never
    // re-resolves the active block or re-levels on scroll, so its bar drifts
    // away from the French one and nothing brings them back.
    updateActiveFromCodeScroll('en', enCodeEditor);
  }, { passive: true });
  frCodeEditor.addEventListener('scroll', () => {
    syncCodeViewScroll(frCodeEditor);
    updateActiveFromCodeScroll('fr', frCodeEditor);
  }, { passive: true });
}

function updateFrCodeView() {
  if (!frCodeEditor) return;
  const text = frCodeEditor.value || '';
  const lines = text ? text.split('\n') : [];
  const lineCount = lines.length || 1;
  const chars = text.length;

  if (frCodeStats) {
    frCodeStats.textContent = `${lineCount} ${lineCount === 1 ? 'line' : 'lines'} • ${chars} chars`;
  }

  // Update Syntax Highlighting (with active-block highlight bar while in code view)
  if (frCodeHighlightInner) {
    const range = (state.frViewMode !== 'visual' && state.showHighlightBox !== false && frCodeEditor)
      ? findFrRangeForEnIndex(getActiveEnIndex())
      : null;
    renderCodeWithActiveLines(frCodeHighlightInner, text, renderRangeOrNull(range));
  }

  // Size the gutter rows to the freshly rendered lines, then sync. The
  // layout must run after the highlight render (it measures .code-line).
  layoutCodeGutter('fr');

  // Synchronize Scroll
  syncFrCodeScroll();
}

function moveFrViewSlider() {
  try {
    const container = frViewVisualBtn && frViewVisualBtn.closest
      ? frViewVisualBtn.closest('.fr-view-toggle')
      : null;
    if (!container) return;
    const slider = container.querySelector('.fr-view-slider');
    const active = container.querySelector('.fr-view-btn.is-active');
    if (!slider || !active || !active.offsetWidth) return;
    slider.style.left = `${active.offsetLeft}px`;
    slider.style.width = `${active.offsetWidth}px`;
  } catch (_) {}
}

function initFrViewSlider() {
  moveFrViewSlider();
  try {
    const container = frViewVisualBtn && frViewVisualBtn.closest
      ? frViewVisualBtn.closest('.fr-view-toggle')
      : null;
    if (container && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => moveFrViewSlider());
      ro.observe(container);
    }
  } catch (_) {}
  window.addEventListener('resize', moveFrViewSlider);
}

function switchFrenchView(mode) {
  const prevMode = state.frViewMode;
  state.frViewMode = mode;
  const isCode = mode === 'code';
  const isSplit = mode === 'split';
  const isCodeLike = isCode || isSplit;
  const wasCodeLike = prevMode === 'code' || prevMode === 'split';

  if (frViewVisualBtn) frViewVisualBtn.classList.toggle('is-active', mode === 'visual');
  if (frViewCodeBtn) frViewCodeBtn.classList.toggle('is-active', isCode);
  if (frViewSplitBtn) frViewSplitBtn.classList.toggle('is-active', isSplit);
  moveFrViewSlider();

  if (frPaneTitle) {
    frPaneTitle.textContent = 'French (aligned)';
  }

  const enFrameWrap = enCodeWrap && enCodeWrap.parentElement ? enCodeWrap.parentElement : null;
  const frFrameWrap = frCodeWrap && frCodeWrap.parentElement ? frCodeWrap.parentElement : null;
  const setSplitClass = (on) => {
    if (enFrameWrap) enFrameWrap.classList.toggle('split-mode', on);
    if (frFrameWrap) frFrameWrap.classList.toggle('split-mode', on);
  };

  if (mode === prevMode) {
    // Re-clicking the active view button: keep everything as-is.
    applyPreviewZoom();
    return;
  }

  // Entering (or staying in) a code-like view supersedes any Visual-mode
  // restore loop that is still retrying. Without this the loop kept calling
  // jumpToBlock for up to 3s after the user came back, resetting the active
  // block to the block they had left visual view on — the code view then looked
  // frozen no matter how far you scrolled.
  if (isCodeLike) visualRestoreGeneration++;

  if (isCodeLike && wasCodeLike) {
    // Toggling between Code and Split: keep manual code edits, just re-layout —
    // but pick up visual edits made since the code was generated.
    // Pin the active block across the toggle: the regen (.value assignment)
    // and the display toggles below reset scrollTop to 0 synchronously, and
    // the scroll events they queue would otherwise derive block 1 and
    // overwrite the active block before the re-center passes run.
    let pinnedEnIndex = typeof state.activePreviewBlock === 'number' && !isNaN(state.activePreviewBlock)
      ? state.activePreviewBlock
      : (typeof state.lastKnownEnIndex === 'number' && !isNaN(state.lastKnownEnIndex)
        ? state.lastKnownEnIndex
        : (typeof state.savedVisualActiveBlock === 'number' && !isNaN(state.savedVisualActiveBlock)
          ? state.savedVisualActiveBlock : 0));
    if (state.enBlocks && state.enBlocks.length > 0) {
      pinnedEnIndex = Math.max(0, Math.min(pinnedEnIndex, state.enBlocks.length - 1));
    } else {
      pinnedEnIndex = Math.max(0, pinnedEnIndex);
    }
    codeViewTransitionUntil = Date.now() + 600;
    // Keep hidden/shown iframe scroll events from driving the active block
    // while their layout is in flux (syncScroll ignores programmatic els).
    try {
      [enPreviewFrame, frPreviewFrame].forEach((frame) => {
        const doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
        const scrollEl = doc && (doc.scrollingElement || doc.documentElement);
        if (scrollEl) programmaticScrollEls.add(scrollEl);
      });
    } catch (_) {}
    const releaseIframeScrollGuard = () => {
      try {
        [enPreviewFrame, frPreviewFrame].forEach((frame) => {
          const doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
          const scrollEl = doc && (doc.scrollingElement || doc.documentElement);
          if (scrollEl) programmaticScrollEls.delete(scrollEl);
        });
      } catch (_) {}
    };
    setTimeout(releaseIframeScrollGuard, 600);
    if (!state.frCodeModified) {
      try {
        harvestVisualEdits();
        if (frCodeEditor) {
          // Assigning .value resets scrollTop: preserve the viewport across
          // the regen so the toggle doesn't drop back to the first block.
          const keepTop = frCodeEditor.scrollTop || 0;
          const keepLeft = frCodeEditor.scrollLeft || 0;
          frCodeEditor.value = generateFrenchHtmlSource();
          state.frGeneratedCode = frCodeEditor.value;
          state.frCodeModified = false;
          updateFrCodeView();
          setCodeScroll(frCodeEditor, keepTop, keepLeft);
          syncFrCodeScroll();
        }
      } catch (_) {}
    }
    // Re-assert the pin synchronously: nothing above should have touched the
    // active block, but restore it anyway so queued scroll events (suppressed
    // by the transition guard) can't win.
    state.activePreviewBlock = pinnedEnIndex;
    state.lastKnownEnIndex = pinnedEnIndex;
    setSplitClass(isSplit);
    if (isSplit) {
      if (enPreviewFrame) enPreviewFrame.style.display = 'block';
      if (enCodeWrap) enCodeWrap.style.display = 'flex';
      if (frPreviewFrame) frPreviewFrame.style.display = 'block';
      if (frCodeWrap) frCodeWrap.style.display = 'flex';
    } else {
      if (enPreviewFrame) enPreviewFrame.style.display = 'none';
      if (enCodeWrap) enCodeWrap.style.display = 'flex';
      if (frPreviewFrame) frPreviewFrame.style.display = 'none';
      if (frCodeWrap) frCodeWrap.style.display = 'flex';
    }
    bindEnCodeScrollSync();
    bindCodeBlockClick();
    state.activePreviewBlock = pinnedEnIndex;
    state.lastKnownEnIndex = pinnedEnIndex;
    updateActiveBlockHud(pinnedEnIndex);
    syncCodeViewToActiveBlock();
    requestAnimationFrame(() => {
      syncFrCodeScroll();
    });
    // Settle passes: the split-mode class/display toggles above relayout
    // asynchronously, so re-center once layout is final (code-view only —
    // skip if the user already moved on). Re-assert the pin first: any stray
    // scroll derivation during the transition is suppressed by the guard, but
    // if one slipped through, the pin still wins within the settle window.
    requestAnimationFrame(() => {
      try {
        if (state.frViewMode === 'code') {
          if (isCodeViewTransitioning()) {
            state.activePreviewBlock = pinnedEnIndex;
            state.lastKnownEnIndex = pinnedEnIndex;
            updateActiveBlockHud(pinnedEnIndex);
          }
          syncCodeViewToActiveBlock();
        }
      } catch (_) {}
    });
    setTimeout(() => {
      try {
        if (state.frViewMode === 'code') {
          if (isCodeViewTransitioning()) {
            state.activePreviewBlock = pinnedEnIndex;
            state.lastKnownEnIndex = pinnedEnIndex;
            updateActiveBlockHud(pinnedEnIndex);
          }
          syncCodeViewToActiveBlock();
        }
      } catch (_) {}
    }, 150);
    // Re-assert the visual position when (re)showing the preview frames:
    // hidden iframes don't reliably keep their scroll offset, so center
    // them on the active block once layout is back (plus a settle pass).
    // This mirrors syncCodeViewToActiveBlock above, which does the same job
    // for the code editors.
    requestAnimationFrame(() => {
      try {
        alignPreviewBlocks(state.activePreviewBlock);
        applyActiveHighlight();
      } catch (_) {}
    });
    setTimeout(() => {
      try {
        if (state.frViewMode === 'split') {
          alignPreviewBlocks(state.activePreviewBlock);
          applyActiveHighlight();
        }
      } catch (_) {}
    }, 150);
    applyPreviewZoom();
    return;
  }

  if (isCodeLike) {
    setSplitClass(isSplit);
    bindEnCodeScrollSync();
    const englishSourceHtml = htmlInput && htmlInput.value.trim()
      ? htmlInput.value.trim()
      : (state.enHtml || '');
    if (enCodeEditor) enCodeEditor.value = englishSourceHtml;
    const enLineCount = Math.max(1, englishSourceHtml.split('\n').length);
    if (enCodeStats) {
      enCodeStats.textContent = `${enLineCount} ${enLineCount === 1 ? 'line' : 'lines'} • ${englishSourceHtml.length} chars`;
    }
    if (enCodeHighlightInner) {
      // Build through the line layer, not a raw innerHTML assignment. The
      // per-line .code-line / .code-nl structure is what the active bar and
      // panel search both rely on, and what codePaneState caches; assigning
      // innerHTML here detached the cached elements and left the cache pointing
      // at nodes that were no longer in the document.
      buildCodeLineLayer(enCodeHighlightInner, englishSourceHtml);
    }
    // Size the gutter rows to the freshly built lines (measures .code-line).
    layoutCodeGutter('en');
    syncEnCodeScroll(enCodeHighlight);
    if (!isSplit) {
      if (enPreviewFrame) enPreviewFrame.style.display = 'none';
    }
    if (enCodeWrap) enCodeWrap.style.display = 'flex';

    // 1. Keep the exact highlighted active block from Visual view
    const liveIdx = state.activePreviewBlock;
    const savedIdx = state.savedVisualActiveBlock;
    let currentVisualEnIdx = (typeof liveIdx === 'number' && !isNaN(liveIdx) && liveIdx >= 0)
      ? liveIdx
      : ((typeof savedIdx === 'number' && !isNaN(savedIdx) && savedIdx >= 0) ? savedIdx : 0);
    if (state.enBlocks && state.enBlocks.length > 0) {
      currentVisualEnIdx = Math.max(0, Math.min(currentVisualEnIdx, state.enBlocks.length - 1));
    }
    state.savedVisualActiveBlock = currentVisualEnIdx;
    // Same full-jump logic as code→visual: re-assert state, highlight, HUD,
    // and alignment so the code view opens exactly where visual left off.
    // Arm the transition guard: the regen and centering below reset scrollTop
    // to 0, and the scroll events they queue would otherwise derive block 1
    // and overwrite the pin before the settle passes run (same failure mode
    // as the split<->code toggle).
    codeViewTransitionUntil = Date.now() + 600;
    state.activePreviewBlock = currentVisualEnIdx;
    state.lastKnownEnIndex = currentVisualEnIdx;
    jumpToBlock(currentVisualEnIdx);

    let visualScrollRatio = null;
    try {
      const activeFrame = frPreviewFrame || enPreviewFrame;
      if (activeFrame && activeFrame.contentDocument) {
        const frDoc = activeFrame.contentDocument;
        const frScroll = frDoc.scrollingElement || frDoc.documentElement;
        if (frScroll && frScroll.scrollHeight > frScroll.clientHeight) {
          visualScrollRatio = frScroll.scrollTop / (frScroll.scrollHeight - frScroll.clientHeight);
        }
      }
    } catch (_) {}

    const htmlCode = generateFrenchHtmlSource();
    if (frCodeEditor) {
      frCodeEditor.value = htmlCode;
      state.frGeneratedCode = htmlCode;
      state.frCodeModified = false;
      updateFrCodeView();

      // Find character location of the current active block in the generated HTML code
      const pair = state.alignPairs.find((p) => p.enIndex === currentVisualEnIdx && !p.skip);
      const targetFrIdx = pair && pair.frIndex !== null ? pair.frIndex : currentVisualEnIdx;
      const frBlock = state.frBlocks && state.frBlocks[targetFrIdx] ? state.frBlocks[targetFrIdx] : null;
      const enBlock = state.enBlocks && state.enBlocks[currentVisualEnIdx] ? state.enBlocks[currentVisualEnIdx] : null;

      let targetCharIndex = -1;
      if (frBlock && frBlock.text && frBlock.text.trim().length > 3) {
        const cleanSnippet = frBlock.text.trim().replace(/\s+/g, ' ').substring(0, 30);
        targetCharIndex = htmlCode.indexOf(cleanSnippet);
      }
      if (targetCharIndex === -1 && enBlock && enBlock.text && enBlock.text.trim().length > 3) {
        const cleanSnippet = enBlock.text.trim().replace(/\s+/g, ' ').substring(0, 30);
        targetCharIndex = htmlCode.indexOf(cleanSnippet);
      }

      if (targetCharIndex !== -1) {
        const lineNum = htmlCode.substring(0, targetCharIndex).split('\n').length - 1;
        const totalLines = Math.max(1, htmlCode.split('\n').length);
        const maxScroll = Math.max(0, frCodeEditor.scrollHeight - frCodeEditor.clientHeight);
        frCodeEditor.scrollTop = Math.round((lineNum / totalLines) * maxScroll);
        frCodeEditor.selectionStart = targetCharIndex;
        frCodeEditor.selectionEnd = targetCharIndex;
      } else if (visualScrollRatio !== null && visualScrollRatio > 0) {
        const maxScroll = Math.max(0, frCodeEditor.scrollHeight - frCodeEditor.clientHeight);
        frCodeEditor.scrollTop = Math.round(visualScrollRatio * maxScroll);
      }
      syncFrCodeScroll();
    }
    if (isSplit) {
      if (enPreviewFrame) enPreviewFrame.style.display = 'block';
      if (enCodeWrap) enCodeWrap.style.display = 'flex';
      if (frPreviewFrame) frPreviewFrame.style.display = 'block';
      if (frCodeWrap) frCodeWrap.style.display = 'flex';
    } else {
      if (frPreviewFrame) frPreviewFrame.style.display = 'none';
      if (frCodeWrap) frCodeWrap.style.display = 'flex';
    }
    bindCodeBlockClick();
    // Re-assert the pin: scroll noise from the regen above is suppressed by
    // the transition guard, but restore synchronously anyway so the centering
    // below can never lock in a corrupted value.
    state.activePreviewBlock = currentVisualEnIdx;
    state.lastKnownEnIndex = currentVisualEnIdx;
    updateActiveBlockHud(currentVisualEnIdx);
    // Highlight the active block's lines in both code panes + center them
    syncCodeViewToActiveBlock();
    requestAnimationFrame(() => {
      syncFrCodeScroll();
    });
  } else {
    setSplitClass(false);
    // Returning to Visual Mode: Update French preview with any code added, modified, or removed in the Code Editor
    // Resume the block left off on in code view (code clicks navigate via
    // jumpToCodeBlock → jumpToBlock, which keeps state.activePreviewBlock
    // current); fall back to the entry-time block only if that's invalid.
    //
    // Claim a restore generation. The retry loop below re-asserts this block
    // with jumpToBlock while the preview frames finish parsing, and jumpToBlock
    // resets state.activePreviewBlock — so a loop still running after the user
    // went back to Code view kept yanking the active block to this index and the
    // code view looked frozen. Returning to a code-like view bumps the counter,
    // which makes every pending iteration a no-op.
    const restoreGeneration = ++visualRestoreGeneration;
    const liveEnIndex = (typeof state.activePreviewBlock === 'number' && !isNaN(state.activePreviewBlock))
      ? state.activePreviewBlock
      : (typeof state.savedVisualActiveBlock === 'number' ? state.savedVisualActiveBlock : 0);

    let targetEnIndex = Math.max(0, Math.min(liveEnIndex, (state.enBlocks ? state.enBlocks.length - 1 : 0)));

    if (frCodeEditor && frCodeEditor.value) {
      const editedCode = frCodeEditor.value.trim();
      const isModified = state.frCodeModified || (state.frGeneratedCode && editedCode !== state.frGeneratedCode.trim());

      if (isModified) {
        state.frCustomHtml = editedCode;

        // Extract new blocks from edited HTML to update state.frBlocks
        const parser = new DOMParser();
        let doc;
        const hasHtmlTag = /<html[\s>]/i.test(editedCode);
        if (hasHtmlTag) {
          doc = parser.parseFromString(editedCode, 'text/html');
        } else {
          doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
          doc.body.innerHTML = editedCode;
        }

        const extractedFrBlocks = extractBlocks(doc.body);
        // Keep the full block shape (especially el and the structural flags).
        // The element reference is what the alignment scorer uses to recognize
        // PDF side-panel elements (+14 side-panel match); stripping it makes
        // edited panel blocks unpairable, so they come back tagged as extra
        // French content. hasBr/brCount/inTable feed the grouping pass.
        state.frBlocks = extractedFrBlocks.map((b) => ({
          tag: b.tag,
          attrTarget: b.attrTarget,
          // The edited code IS generated output, and generated output carries
          // the "[EXTRA FRENCH CONTENT : …]" / "[CONTENU FRANÇAIS
          // SUPPLÉMENTAIRE : …]" annotation the builder puts on a French block
          // it could not pair. That annotation is an instruction to the reader,
          // not translated content, and it is derived state: the pairing it
          // describes is recomputed on every pass. Kept in the text it becomes
          // the block's identity — the text no longer matches the Word
          // document, so the block can never pair again, and the annotation is
          // re-emitted on top of it each time, compounding. Strip it here, at
          // the one point where generated markup is read back as content.
          text: stripExtraFrenchMarker(b.text),
          spans: b.spans,
          el: b.el,
          inTable: b.inTable,
          hasBr: b.hasBr,
          brCount: b.brCount,
          isBrLine: b.isBrLine,
        }));

        computeAlignment(targetEnIndex);

        if (frBlockCountBadge) {
          frBlockCountBadge.textContent = `${state.frBlocks.length} blocks`;
        }
        renderStatsBar();

        // Render updated visual preview frame
        const updatedFrDocHtml = buildFrenchFrameSourceFromHtml(editedCode, state.frBlocks);
        if (frPreviewFrame) {
          frPreviewFrame.srcdoc = updatedFrDocHtml;
        }
      } else {
        // Code was not edited: restore visual preview with complete alignment, missing translation, and extra content highlights
        state.frCustomHtml = null;
        const updatedFrDocHtml = buildFrenchFrameSource(state.enHtml, state.enBlocks, state.frBlocks, state.alignPairs);
        if (frPreviewFrame) {
          frPreviewFrame.srcdoc = updatedFrDocHtml;
        }
      }

      setupIframeEventListeners();

      // Restore position reliably: jumpToBlock is a safe no-op while the
      // rebuilt frames are still parsing, so retry until both panes are laid
      // out with the target block (covers slow docs and a missed load event).
      const framesReadyFor = (idx) => {
        try {
          const enDoc = enPreviewFrame && (enPreviewFrame.contentDocument || enPreviewFrame.contentWindow?.document);
          const frDoc = frPreviewFrame && (frPreviewFrame.contentDocument || frPreviewFrame.contentWindow?.document);
          if (!enDoc || !frDoc) return false;
          const enScroll = enDoc.scrollingElement || enDoc.documentElement;
          const frScroll = frDoc.scrollingElement || frDoc.documentElement;
          if (!enScroll || enScroll.clientHeight === 0 || !frScroll || frScroll.clientHeight === 0) return false;
          return Boolean(
            enDoc.querySelector(`[data-swap-index="${idx}"]`) &&
            frDoc.querySelector(`[data-swap-index="${idx}"], [data-fr-index="${idx}"]`)
          );
        } catch (_) {
          return false;
        }
      };
      const restoreDeadline = Date.now() + 3000;
      const restoreSuperseded = () => restoreGeneration !== visualRestoreGeneration
        || state.frViewMode !== 'visual';
      const restorePosition = () => {
        // Bail if we have been superseded: a newer switch owns the active block
        // now, and re-asserting this one would fight the user's scrolling.
        if (restoreSuperseded()) return;
        jumpToBlock(targetEnIndex);
        if (!framesReadyFor(targetEnIndex) && Date.now() < restoreDeadline) {
          setTimeout(restorePosition, 120);
        } else {
          // One final settle pass after layout/fonts finish.
          setTimeout(() => {
            if (!restoreSuperseded()) jumpToBlock(targetEnIndex);
          }, 150);
        }
      };

      if (frPreviewFrame) {
        frPreviewFrame.addEventListener('load', restorePosition, { once: true });
      }
      setTimeout(restorePosition, 30);
    }

    if (frCodeWrap) frCodeWrap.style.display = 'none';
    if (frPreviewFrame) frPreviewFrame.style.display = 'block';
    if (enCodeWrap) enCodeWrap.style.display = 'none';
    if (enPreviewFrame) enPreviewFrame.style.display = 'block';
  }
  applyPreviewZoom();
}

export {
  alignCodeBarsHorizontally,
  buildCodeBlockIndex,
  getCodeViewDiagnostics,
  centerEditorOnLine,
  codeCenterLine,
  codeLineFromRange,
  escapeHtml,
  escapeRegExp,
  findBlockInFlattened,
  formatHtmlCode,
  generateFrenchHtmlSource,
  getCodeLineHeight,
  getFlattenedCode,
  getLastCodeSide,
  levelTarget,
  reachableRange,
  highlightHtmlCode,
  initFrViewSlider,
  jumpToCodeBlock,
  moveFrViewSlider,
  refreshCodeViewAfterBlockEdit,
  resetCodeLineHeight,
  setCodeScroll,
  stepCodeEditorBlock,
  switchFrenchView,
  syncCodeViewToActiveBlock,
  syncFrCodeScroll,
  updateActiveFromCodeScroll,
  updateCodeActiveBlockHighlight,
  updateFrCodeView,
};
