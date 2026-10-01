// src/modules/panelSearch.js
// Per-Panel In-Preview Search (Ctrl + F) & Highlight Navigation Engine

export const panelSearchStates = {
  en: { query: '', matches: [], currentIdx: -1, isOpen: false },
  fr: { query: '', matches: [], currentIdx: -1, isOpen: false },
  docx: { query: '', matches: [], currentIdx: -1, isOpen: false },
};

export function getFrameForSide(side) {
  if (typeof document === 'undefined') return null;
  if (side === 'en') return document.getElementById('enPreviewFrame');
  if (side === 'docx') return document.getElementById('docxPreviewFrame');
  return document.getElementById('frPreviewFrame');
}

// Code mode hides the preview frame (display:none) and shows the code editor
// instead, so the preview-pane search bar — the only search UI — has nothing
// to search and no way to reach the code text. Route the same bar at the
// editor's <pre> highlight layer, which mirrors the editor's text line for
// line, so one implementation serves both views.
function codeTargetForSide(side) {
  if (typeof document === 'undefined') return null;
  if (side === 'en') {
    const ed = document.getElementById('enCodeEditor');
    const pre = document.getElementById('enCodeHighlight');
    return ed && pre ? { editor: ed, pre } : null;
  }
  if (side !== 'fr') return null;
  const ed = document.getElementById('frCodeEditor');
  const pre = document.getElementById('frCodeHighlight');
  return ed && pre ? { editor: ed, pre } : null;
}

function isCodeViewForSide(side) {
  try {
    const st = (typeof window !== 'undefined' && window.state) || null;
    const mode = st ? st.frViewMode : null;
    if (mode !== 'code' && mode !== 'split') return false;
    return !!codeTargetForSide(side);
  } catch (_) {
    return false;
  }
}

export function clearDocSearchHighlights(doc) {
  if (!doc || !doc.body) return;
  const marks = Array.from(doc.querySelectorAll('mark.symmetra-search-hit'));
  for (const m of marks) {
    const parent = m.parentNode;
    if (parent) {
      while (m.firstChild) {
        parent.insertBefore(m.firstChild, m);
      }
      parent.removeChild(m);
    }
  }
  doc.body.normalize();
}

export function highlightSearchMatchesInDoc(doc, query) {
  clearDocSearchHighlights(doc);
  const q = (query || '').trim().toLowerCase();
  if (!q || !doc || !doc.body) return [];

  const walker = doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.symmetra-search-hit')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(q)) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToProcess = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    nodesToProcess.push(currentNode);
  }

  const matches = [];
  for (const textNode of nodesToProcess) {
    const parent = textNode.parentNode;
    if (!parent) continue;

    const fullText = textNode.nodeValue;
    const lowerText = fullText.toLowerCase();
    const fragments = doc.createDocumentFragment();
    let lastIdx = 0;
    let matchIdx = lowerText.indexOf(q, lastIdx);

    while (matchIdx !== -1) {
      if (matchIdx > lastIdx) {
        fragments.appendChild(doc.createTextNode(fullText.substring(lastIdx, matchIdx)));
      }
      const mark = doc.createElement('mark');
      mark.className = 'symmetra-search-hit';
      mark.textContent = fullText.substring(matchIdx, matchIdx + q.length);
      fragments.appendChild(mark);
      matches.push(mark);

      lastIdx = matchIdx + q.length;
      matchIdx = lowerText.indexOf(q, lastIdx);
    }

    if (lastIdx < fullText.length) {
      fragments.appendChild(doc.createTextNode(fullText.substring(lastIdx)));
    }

    parent.replaceChild(fragments, textNode);
  }

  return matches;
}

export function openPanelSearch(side = 'fr', options = {}) {
  const previewSection = options.previewSection || document.getElementById('previewSection');
  if (previewSection && !previewSection.classList.contains('show')) return;
  const state = options.state || (typeof window !== 'undefined' ? window.state : null);
  if (side === 'docx' && state && !state.showWordDocView) side = 'fr';

  const bar = document.getElementById(`${side}PanelSearch`);
  const input = document.getElementById(`${side}SearchInput`);
  const openBtn = document.getElementById(`${side}OpenSearchBtn`);
  if (!bar || !input) return;

  panelSearchStates[side].isOpen = true;
  bar.classList.add('is-open');
  if (openBtn) openBtn.classList.add('is-active');

  // The bar lives in the preview pane header, which Code mode keeps, so the
  // same UI serves both views. In Code mode the label promises a preview
  // search that is not what runs, so say what is actually searched.
  const codeMode = isCodeViewForSide(side);
  input.placeholder = codeMode
    ? 'Find in code (Enter: next, Esc: close)...'
    : `Find in ${side === 'docx' ? 'Word document' : side === 'en' ? 'English' : 'French'} preview (Enter: next, Esc: close)...`;

  input.focus();
  input.select();

  if (input.value && input.value.trim()) {
    performPanelSearch(side, input.value, options);
  }
}

export function closePanelSearch(side, options = {}) {
  const bar = document.getElementById(`${side}PanelSearch`);
  const countEl = document.getElementById(`${side}SearchCount`);
  const openBtn = document.getElementById(`${side}OpenSearchBtn`);
  if (!bar) return;

  panelSearchStates[side].isOpen = false;
  panelSearchStates[side].matches = [];
  panelSearchStates[side].currentIdx = -1;
  // Code view keeps its hits on the <pre>; clear them so stale highlights
  // don't survive a closed search.
  const codeTarget = codeTargetForSide(side);
  if (codeTarget) clearCodeHitMarks(codeTarget.pre);

  bar.classList.remove('is-open');
  if (openBtn) openBtn.classList.remove('is-active');
  if (countEl) countEl.textContent = '';

  const frame = (options.getFrame ? options.getFrame(side) : null) || getFrameForSide(side);
  const doc = frame ? (frame.contentDocument || frame.contentWindow?.document) : null;
  if (doc) {
    clearSearchDetailsPins(doc);
    clearDocSearchHighlights(doc);
  }
}

// --- Code-view search ------------------------------------------------------
// The editor is a <textarea>, so there is no DOM to mark up. The highlight
// <pre> behind it carries the same text with the same line breaks and is what
// the user actually reads, so the search runs against THAT text and nothing
// needs translating between the two.
//
// An earlier version searched the editor text and mapped the offsets onto the
// <pre>. That cannot work: the highlighter escapes &, <, > and " into
// entities (&amp; &lt; &gt; &quot;) and leaves &nbsp; as literal characters,
// so the two strings diverge constantly and every offset after the first
// entity landed somewhere arbitrary — a search for "Sant" painted the s of
// "class" all down the document. Searching the pre's own text is exact, and it
// has the pleasant side effect of matching inside attribute values and tag
// names, which is what you want when searching code.
const codeHitMarkClass = 'symmetra-search-hit';

// Text nodes of the <pre> in document order, with their offsets into the
// concatenated text.
function collectCodeText(pre) {
  const code = pre.querySelector('code') || pre;
  const nodes = [];
  let flat = '';
  const walker = pre.ownerDocument.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const value = n.nodeValue || '';
    nodes.push({ node: n, start: flat.length, len: value.length });
    flat += value;
  }
  return { code, nodes, flat };
}

function findCodeMatchOffsets(text, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const hay = text.toLowerCase();
  const out = [];
  let i = hay.indexOf(q);
  while (i !== -1 && out.length < 5000) {
    out.push({ start: i, end: i + q.length });
    i = hay.indexOf(q, i + q.length);
  }
  return out;
}

// Wrap flat-text ranges in <mark> and return one element per hit, in order.
// A hit that straddles a highlighted token spans several text nodes, so the
// ranges are cut per node and the first <mark> of each hit is the element used
// for scrolling.
function applyCodeHitMarks(pre, offsets, currentOffset) {
  if (!pre || !offsets || !offsets.length) return [];
  const { code, nodes, flat } = collectCodeText(pre);
  if (!flat) return [];
  const doc = pre.ownerDocument;

  const sorted = offsets.slice().sort((a, b) => a.start - b.start);
  const byNode = new Map();
  sorted.forEach((hit) => {
    const isCurrent = !!(currentOffset && currentOffset.start === hit.start);
    for (let i = 0; i < nodes.length; i++) {
      const info = nodes[i];
      const a = Math.max(hit.start, info.start);
      const b = Math.min(hit.end, info.start + info.len);
      if (b <= a) continue;
      if (!byNode.has(i)) byNode.set(i, []);
      byNode.get(i).push({ start: a - info.start, end: b - info.start, isCurrent, key: hit.start });
    }
  });

  // Track the first <mark> created for each hit so the caller gets exactly one
  // element per hit, in hit order.
  const firstMarkByKey = new Map();
  // Rebuild affected nodes in reverse document order so the offsets of the
  // nodes not yet visited stay valid.
  [...byNode.keys()].sort((a, b) => b - a).forEach((nodeIdx) => {
    const info = nodes[nodeIdx];
    const text = info.node.nodeValue || '';
    const hits = byNode.get(nodeIdx).sort((a, b) => a.start - b.start);
    const frag = doc.createDocumentFragment();
    let cursor = 0;
    hits.forEach((h) => {
      if (h.start > cursor) frag.appendChild(doc.createTextNode(text.substring(cursor, h.start)));
      const mark = doc.createElement('mark');
      mark.className = codeHitMarkClass;
      if (h.isCurrent) mark.classList.add('is-current');
      mark.textContent = text.substring(h.start, h.end);
      frag.appendChild(mark);
      if (!firstMarkByKey.has(h.key)) firstMarkByKey.set(h.key, mark);
      cursor = h.end;
    });
    if (cursor < text.length) frag.appendChild(doc.createTextNode(text.substring(cursor)));
    if (info.node.parentNode) info.node.parentNode.replaceChild(frag, info.node);
  });

  void code;
  return sorted.map((h) => firstMarkByKey.get(h.start)).filter(Boolean);
}

function clearCodeHitMarks(pre) {
  if (!pre) return;
  try {
    const code = pre.querySelector('code') || pre;
    const marks = code.querySelectorAll('mark.' + codeHitMarkClass);
    if (!marks.length) return;
    marks.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    code.normalize();
  } catch (_) {}
}

function performCodeSearch(side, query) {
  const target = codeTargetForSide(side);
  const countEl = document.getElementById(`${side}SearchCount`);
  const st = panelSearchStates[side];
  if (!target) return;
  st.query = query;
  clearCodeHitMarks(target.pre);
  const { flat } = collectCodeText(target.pre);
  const offsets = findCodeMatchOffsets(flat, query);
  st.codeOffsets = offsets;
  st.codeText = flat;
  st.currentIdx = offsets.length ? 0 : -1;
  const marks = applyCodeHitMarks(target.pre, offsets, offsets[0] || null);
  st.matches = marks;
  if (offsets.length) {
    if (countEl) countEl.textContent = `1 of ${offsets.length}`;
    if (marks[0]) scrollCodeHitIntoView(target, marks[0]);
  } else if (countEl) {
    countEl.textContent = (query || '').trim() ? '0 of 0' : '';
  }
}

// Centre a hit in the code editor.
//
// Rect-based, like the preview path: the <pre> and the <mark> are both inside
// the same (possibly zoom-scaled) editor box, so their rects share a space and
// no coordinate conversion is needed. The editor textarea is kept in step
// because it is the interactive layer — its own scroll drives the block
// follow-scroll, and the <pre> must not drift away from the visible text.
function scrollCodeHitIntoView(target, mark) {
  if (!target || !mark) return;
  try {
    mark.scrollIntoView({ behavior: 'instant', block: 'center' });
  } catch (_) {
    try { mark.scrollIntoView(); } catch (_) {}
  }
  try {
    const pre = target.pre;
    const editor = target.editor;
    const r = mark.getBoundingClientRect();
    const pr = pre.getBoundingClientRect();
    if (!(r.height > 0) || !(pr.height > 0)) return;
    const centerDelta = (r.top + r.height / 2) - (pr.top + pr.height / 2);
    const tolerance = Math.max(4, pr.height * 0.03);
    if (Math.abs(centerDelta) <= tolerance) return;
    const dest = (pre.scrollTop || 0) + centerDelta;
    const max = Math.max(0, pre.scrollHeight - pre.clientHeight);
    const next = Math.max(0, Math.min(dest, max));
    if (Math.abs(next - (pre.scrollTop || 0)) > 1) {
      pre.scrollTop = next;
      if (editor && Math.abs(editor.scrollTop - next) > 1) editor.scrollTop = next;
    }
  } catch (_) {}
}


export function performPanelSearch(side, query, options = {}) {
  const countEl = document.getElementById(`${side}SearchCount`);

  if (isCodeViewForSide(side)) {
    performCodeSearch(side, query);
    return;
  }

  const frame = (options.getFrame ? options.getFrame(side) : null) || getFrameForSide(side);
  const doc = frame ? (frame.contentDocument || frame.contentWindow?.document) : null;
  if (!doc) return;

  panelSearchStates[side].query = query;
  const frameForPins = frame;
  try {
    const pinDoc = frameForPins ? (frameForPins.contentDocument || frameForPins.contentWindow?.document) : null;
    clearSearchDetailsPins(pinDoc);
  } catch (_) {}
  const matches = highlightSearchMatchesInDoc(doc, query);
  panelSearchStates[side].matches = matches;
  panelSearchStates[side].currentIdx = -1;

  if (matches.length > 0) {
    panelSearchStates[side].currentIdx = 0;
    matches[0].classList.add('is-current');
    scrollSearchMatchIntoView(frame, matches[0], side);
    if (countEl) countEl.textContent = `1 of ${matches.length}`;
  } else {
    if (countEl) {
      countEl.textContent = (query || '').trim() ? '0 of 0' : '';
    }
  }
}

// The preview frames are rebuilt on every edit, undo, view switch and
// alignment (srcdoc assignment wipes the document). The stored <mark>
// elements then point at detached nodes: classList writes and scrollIntoView
// silently do nothing, the count still reads "4 of 12", and navigation
// appears dead — including a wrap that advances the index but never moves.
// Re-highlight from the stored query when the stored hits are stale.
function ensureFreshMatches(side, doc) {
  const st = panelSearchStates[side];
  if (!st.matches || st.matches.length === 0) return false;
  let stale = false;
  for (const m of st.matches) {
    if (!m || !m.isConnected || !m.classList || !m.classList.contains('symmetra-search-hit')) {
      stale = true;
      break;
    }
  }
  if (!stale) return true;
  const fresh = highlightSearchMatchesInDoc(doc, st.query);
  st.matches = fresh;
  st.currentIdx = -1;
  const countEl = document.getElementById(`${side}SearchCount`);
  if (countEl) countEl.textContent = fresh.length > 0 ? `0 of ${fresh.length}` : '0 of 0';
  return fresh.length > 0;
}

// A search hit inside a collapsed <details> must keep it open, not just open
// it: updateDetailsStateForActiveBlock closes every details that doesn't hold
// the active block ~150ms after any scroll, which would revert the open and
// collapse the hit back out from under the viewport. The pin is just a DOM
// expando (no import needed) that the details sync respects. Re-pinned on
// every jump so only the current hit's section is protected; cleared when the
// search moves on or closes, letting normal behaviour resume.
function pinSearchDetails(doc, el) {
  try {
    if (!doc) return;
    doc.querySelectorAll('details').forEach((d) => {
      try {
        if (d._searchPinned) d._searchPinned = false;
      } catch (_) {}
    });
    const host = el && el.closest ? el.closest('details') : null;
    if (host) {
      host._searchPinned = true;
      if (!host.open) host.open = true;
    }
  } catch (_) {}
}

function clearSearchDetailsPins(doc) {
  try {
    if (!doc) return;
    doc.querySelectorAll('details').forEach((d) => {
      try {
        if (d._searchPinned) d._searchPinned = false;
      } catch (_) {}
    });
  } catch (_) {}
}

// One centering attempt.
//
// Two coordinate spaces are in play and mixing them is what broke centring
// before. applyPreviewZoom sets body.style.zoom on the preview document and
// the level persists in localStorage, so at any zoom other than 100%:
//   - the hit's getBoundingClientRect() is in ZOOMED document pixels,
//   - the frame's own rect, and the search bar's, are in top-window pixels,
//   - scrollTop / clientHeight are in UNZOOMED document pixels.
// So the hit rect is divided by the zoom, and the bar height is divided by the
// zoom, leaving every term in the same unzoomed space. scrollTop is then
// written directly, which is what the rest of the app already relies on for
// scroll sync — scrollIntoView across the iframe boundary is not dependable
// and would centre against the region hidden behind the search bar.
//
// Idempotent: writes only when the hit is genuinely off-centre.
function centerSearchHit(frame, el, side) {
  if (!frame || !el) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow?.document;
    const scrollEl = doc ? (doc.scrollingElement || doc.documentElement) : null;
    if (!scrollEl) return;

    let zoom = 1;
    try {
      const z = parseFloat(doc.defaultView.getComputedStyle(doc.body).zoom);
      if (!isNaN(z) && z > 0) zoom = z;
    } catch (_) {}

    const clientH = scrollEl.clientHeight || 0;
    if (!(clientH > 0)) return;

    // Height of the search bar, converted into unzoomed document pixels.
    let barH = 0;
    try {
      if (side && typeof document !== 'undefined') {
        const bar = document.getElementById(`${side}PanelSearch`);
        if (bar && bar.classList.contains('is-open')) {
          barH = (bar.getBoundingClientRect().height || 0) / zoom;
        }
      }
    } catch (_) {}
    if (barH >= clientH) barH = 0;

    const paneH = clientH - barH;
    if (!(paneH > 0)) return;

    const r = el.getBoundingClientRect();
    if (r.height === 0 && r.width === 0) return;
    // Hit centre in unzoomed document pixels, measured from the viewport top.
    const hitCenter = r.top / zoom + (r.height / zoom) / 2;
    const paneCenter = barH + paneH / 2;

    const centerDelta = hitCenter - paneCenter;
    const tolerance = Math.max(4, paneH * 0.03);
    if (Math.abs(centerDelta) <= tolerance) return;

    const dest = (scrollEl.scrollTop || 0) + centerDelta;
    const max = Math.max(0, (scrollEl.scrollHeight || 0) - clientH);
    const clamped = Math.max(0, Math.min(dest, max));
    if (Math.abs(clamped - (scrollEl.scrollTop || 0)) <= 1) {
      // Already at the document edge: a hit in the first or last block cannot
      // be centred, because there is no content on one side to scroll into.
      return;
    }
    scrollEl.scrollTop = clamped;
  } catch (_) {}
}

// Centre the hit, then re-centre as the layout settles.
//
// One attempt is not enough. Opening a collapsed <details> changes the
// document height, which re-triggers pair-height equalization and reflows the
// page — so a measurement taken immediately after the jump describes layout
// that no longer exists and the hit drifts off-centre. Re-check over the
// following frames and once more after the reflow has had time to run. The
// details pin keeps the section open throughout.
function scrollSearchMatchIntoView(frame, el, side) {
  if (!frame || !el) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow?.document;
    pinSearchDetails(doc, el);
  } catch (_) {}
  centerSearchHit(frame, el, side);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      centerSearchHit(frame, el, side);
      requestAnimationFrame(() => {
        centerSearchHit(frame, el, side);
        setTimeout(() => centerSearchHit(frame, el, side), 160);
      });
    });
  }
}

// Re-apply the active query's marks to a code pane. The pane's <pre> is
// re-rendered on every block change (the active-line highlight repaints it), so
// an open Code-view search would lose its highlights on the next arrow press.
// code-view calls this through a window bridge after each repaint (same
// contract as syncCodeViewToActiveBlock) to avoid an import cycle.
function reapplyCodeSearchMarks(side) {
  const st = panelSearchStates[side];
  if (!st || !st.isOpen || !st.query) return;
  const target = codeTargetForSide(side);
  if (!target) return;
  // Offsets were computed against the pre's text, and the pre has just been
  // repainted — so recompute from the fresh text rather than reusing them.
  const { flat } = collectCodeText(target.pre);
  const offsets = findCodeMatchOffsets(flat, st.query);
  st.codeOffsets = offsets;
  st.codeText = flat;
  if (!offsets.length) return;
  if (st.currentIdx < 0 || st.currentIdx >= offsets.length) st.currentIdx = 0;
  st.matches = applyCodeHitMarks(target.pre, offsets, offsets[st.currentIdx]);
}

if (typeof window !== 'undefined') {
  window.__reapplyCodeSearch = () => {
    ['en', 'fr'].forEach(reapplyCodeSearchMarks);
  };
}

export function navigatePanelSearch(side, delta, options = {}) {
  const stateObj = panelSearchStates[side];
  const countEl = document.getElementById(`${side}SearchCount`);

  if (isCodeViewForSide(side)) {
    const target = codeTargetForSide(side);
    if (!target) return;
    // The <pre> is re-rendered on every keystroke and on block navigation, so
    // re-derive the hits from its current text before stepping rather than
    // reusing offsets computed against the previous markup.
    clearCodeHitMarks(target.pre);
    const { flat } = collectCodeText(target.pre);
    const offsets = findCodeMatchOffsets(flat, stateObj.query);
    stateObj.codeOffsets = offsets;
    stateObj.codeText = flat;
    if (!offsets.length) {
      if (countEl) countEl.textContent = (stateObj.query || '').trim() ? '0 of 0' : '';
      return;
    }
    if (stateObj.currentIdx < 0 || stateObj.currentIdx >= offsets.length) {
      stateObj.currentIdx = delta < 0 ? 0 : -1;
    }
    stateObj.currentIdx = (stateObj.currentIdx + delta + offsets.length) % offsets.length;
    const currentOffset = offsets[stateObj.currentIdx];
    const marks = applyCodeHitMarks(target.pre, offsets, currentOffset);
    stateObj.matches = marks;
    const current = marks[stateObj.currentIdx];
    if (current) scrollCodeHitIntoView(target, current);
    if (countEl) countEl.textContent = `${stateObj.currentIdx + 1} of ${offsets.length}`;
    return;
  }

  const frame = (options.getFrame ? options.getFrame(side) : null) || getFrameForSide(side);
  const doc = frame ? (frame.contentDocument || frame.contentWindow?.document) : null;
  if (!doc) return;
  if (!ensureFreshMatches(side, doc)) return;
  const matches = stateObj.matches;
  if (!matches || matches.length === 0) return;

  if (stateObj.currentIdx >= 0 && stateObj.currentIdx < matches.length) {
    matches[stateObj.currentIdx].classList.remove('is-current');
  }

  // Normalise a reset/invalid position first, so stepping backwards from "no
  // current match" (e.g. right after the highlights were rebuilt) lands on the
  // last match instead of skipping it.
  if (stateObj.currentIdx < 0 || stateObj.currentIdx >= matches.length) {
    stateObj.currentIdx = delta < 0 ? 0 : -1;
  }
  stateObj.currentIdx = (stateObj.currentIdx + delta + matches.length) % matches.length;
  const current = matches[stateObj.currentIdx];
  if (current) {
    current.classList.add('is-current');
    scrollSearchMatchIntoView(frame, current, side);
  }
  if (countEl) countEl.textContent = `${stateObj.currentIdx + 1} of ${matches.length}`;
}

export function getHoveredOrActiveSearchPane(options = {}) {
  const docxPreviewFrame = document.getElementById('docxPreviewFrame');
  const enPreviewFrame = document.getElementById('enPreviewFrame');
  const frPreviewFrame = document.getElementById('frPreviewFrame');
  const lastHoveredFrame = options.lastHoveredFrame !== undefined
    ? options.lastHoveredFrame
    : (typeof window !== 'undefined' ? window.lastHoveredFrame : null);
  const state = options.state || (typeof window !== 'undefined' ? window.state : null);

  if (lastHoveredFrame === docxPreviewFrame && state?.showWordDocView) return 'docx';
  if (lastHoveredFrame === enPreviewFrame) return 'en';
  if (lastHoveredFrame === frPreviewFrame) return 'fr';
  if (document.activeElement === enPreviewFrame) return 'en';
  if (document.activeElement === docxPreviewFrame) return 'docx';
  return 'fr';
}

export function initPanelSearchListeners(options = {}) {
  const enPreviewFrame = document.getElementById('enPreviewFrame');
  const frPreviewFrame = document.getElementById('frPreviewFrame');
  const docxPreviewFrame = document.getElementById('docxPreviewFrame');

  ['en', 'fr', 'docx'].forEach((side) => {
    const input = document.getElementById(`${side}SearchInput`);
    const prevBtn = document.getElementById(`${side}SearchPrevBtn`);
    const nextBtn = document.getElementById(`${side}SearchNextBtn`);
    const closeBtn = document.getElementById(`${side}SearchCloseBtn`);
    const openBtn = document.getElementById(`${side}OpenSearchBtn`);

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (panelSearchStates[side].isOpen) {
          closePanelSearch(side, options);
        } else {
          openPanelSearch(side, options);
        }
      });
    }

    if (input) {
      let debounceTimer = null;
      input.addEventListener('input', () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          performPanelSearch(side, input.value, options);
        }, 150);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Flush a pending debounce first: typing then hitting Enter faster
          // than 150ms would otherwise navigate the PREVIOUS query's matches
          // (or an empty set), so the first Enter appears to do nothing.
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
            performPanelSearch(side, input.value, options);
          }
          if (e.shiftKey) {
            navigatePanelSearch(side, -1, options);
          } else {
            navigatePanelSearch(side, 1, options);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePanelSearch(side, options);
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => navigatePanelSearch(side, -1, options));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => navigatePanelSearch(side, 1, options));
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closePanelSearch(side, options));
    }
  });

  const enPaneEl = document.querySelector('.preview-pane:first-child');
  const frPaneEl = document.getElementById('frPreviewPane');
  const docxPaneEl = document.getElementById('docxPreviewPane');
  if (enPaneEl) {
    enPaneEl.addEventListener('mouseenter', () => {
      if (options.setHoveredFrame) options.setHoveredFrame(enPreviewFrame);
      else if (typeof window !== 'undefined') window.lastHoveredFrame = enPreviewFrame;
    });
  }
  if (frPaneEl) {
    frPaneEl.addEventListener('mouseenter', () => {
      if (options.setHoveredFrame) options.setHoveredFrame(frPreviewFrame);
      else if (typeof window !== 'undefined') window.lastHoveredFrame = frPreviewFrame;
    });
  }
  if (docxPaneEl) {
    docxPaneEl.addEventListener('mouseenter', () => {
      if (options.setHoveredFrame) options.setHoveredFrame(docxPreviewFrame);
      else if (typeof window !== 'undefined') window.lastHoveredFrame = docxPreviewFrame;
    });
  }
}
