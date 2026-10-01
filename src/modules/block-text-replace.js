// Auto-generated imports
import {
  absorbCitationResidue,
  buildFootnoteAnchorAlternation,
  createFrenchFootnoteNode,
  expandCitationRefList,
  extractBlockFootnotes,
  findJoinedCitationRun,
  nearestWordBoundary,
  standaloneCitationRe,
  stripOrphanFootnoteTokens,
  toUnicodeSuperscript,
} from './footnotes.js';
import {
  cleanCaptionTags,
  cleanThTags,
  extractBlockSpans,
  getBlockContent,
} from './block-utils.js';
import {
  escapeRegExp,
} from './code-view.js';
import {
  SPAN_TAGS,
} from './constants.js';
import {
  appendTextWithLineBreaks,
  convertNodeHrefToFrench,
  formatFrenchRootRelativeLink,
  isFragmentHref,
  isNodeHref,
} from './french-url.js';
// state.ts is a leaf (it imports nothing), and code-view.js in this same graph
// already pulls it in, so the placement log can be written directly rather than
// read off window behind a typeof guard.
import { state } from './state.ts';


// Parks a placement guess for the post-process to publish.
//
// The generation pass works on a flat French string, so it has nowhere to put a
// warning of its own. The log lives in state and is folded into footnoteReport
// by cleanFrenchHtmlPostProcess, which is the only place that hands it to the
// QA panel. Written defensively: the footnote pipeline must never be the thing
// that breaks a generation.
function recordPlacementGuess(num, detail) {
  try {
    if (!Array.isArray(state.footnotePlacementDraft)) state.footnotePlacementDraft = [];
    state.footnotePlacementDraft.push({
      kind: 'placement',
      num: String(num),
      detail,
      enIndex: null,
      frIndex: null,
    });
  } catch (_) {}
}

function insertExtraFrenchElement(doc, newEl, lastEnEl) {
  if (!newEl || !doc) return;
  if (lastEnEl && lastEnEl.isConnected) {
    const lastTag = lastEnEl.tagName ? lastEnEl.tagName.toLowerCase() : '';
    const newTag = newEl.tagName ? newEl.tagName.toLowerCase() : '';

    if (lastTag === 'td' || lastTag === 'th') {
      lastEnEl.appendChild(newEl);
    } else if (lastTag === 'li' && newTag !== 'li' && lastEnEl.closest('ul, ol')) {
      const listEl = lastEnEl.closest('ul, ol');
      if (listEl && listEl.parentElement) {
        listEl.insertAdjacentElement('afterend', newEl);
      } else {
        lastEnEl.insertAdjacentElement('afterend', newEl);
      }
    } else if (lastEnEl.insertAdjacentElement) {
      lastEnEl.insertAdjacentElement('afterend', newEl);
    } else if (lastEnEl.parentElement) {
      lastEnEl.parentElement.appendChild(newEl);
    } else if (doc.body) {
      doc.body.appendChild(newEl);
    }
  } else if (doc.body) {
    if (doc.body.firstChild) {
      doc.body.insertBefore(newEl, doc.body.firstChild);
    } else {
      doc.body.appendChild(newEl);
    }
  }
}

// One-time self-heal for state polluted by an earlier render's placeholder
// leak: leaked ___GC_FN_ fragments harvested back into frBlocks text would
// otherwise be fed in as prose on every regeneration (and their digits
// re-matched as fresh citations). Runs once per session; the per-call
// newText sanitization below covers mergedFrText and any other input path.
let orphanTokenCleanupDone = false;
function cleanOrphanFootnoteTokensFromState() {
  if (orphanTokenCleanupDone) return;
  orphanTokenCleanupDone = true;
  try {
    const blocks = (typeof state !== 'undefined' && state.frBlocks) || [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b && typeof b.text === 'string' && b.text.indexOf('FN_') !== -1) {
        const cleaned = stripOrphanFootnoteTokens(b.text);
        if (cleaned !== b.text) b.text = cleaned;
      }
    }
  } catch (_) {}
}

function replaceBlockTextPreservingLinks(
  el,
  newText,
  attrTarget = 'text',
  frSpans = []
) {
  // Debris from a previous cycle's fragmented placeholders must never be
  // treated as translator input (see stripOrphanFootnoteTokens). Without
  // this, polluted state also trips the `rebuilt.includes(___GC_FN_)` guard
  // below into wrongly skipping footnotes that were never placed.
  cleanOrphanFootnoteTokensFromState();
  if (typeof newText === 'string' && newText.indexOf('FN_') !== -1) {
    newText = stripOrphanFootnoteTokens(newText);
  }
  if (attrTarget !== 'text') {
    el.setAttribute(attrTarget, newText);
    return { unresolvedLinks: 0 };
  }

  // If this element has nested child lists (e.g. an <li> that contains a <ul> or <ol>),
  // detach those child lists before updating this element's text/links, and re-append them afterward.
  const childLists = Array.from(el.querySelectorAll(':scope > ul, :scope > ol'));
  childLists.forEach((cl) => cl.remove());

  const blockTag = el.tagName.toLowerCase();
  const isTh = blockTag === 'th' || el.tagName.toLowerCase() === 'th' || Boolean(el.closest('th'));
  // Headings carry their own typographic weight — never output <strong> inside them
  const isHeading = /^h[1-7]$/.test(blockTag);
  // Table captions carry their own emphasis — never output <strong> inside them
  const isCaption = blockTag === 'caption' || Boolean(el.closest('caption'));

  // If this is a footnote content element inside a definition list, strip leading number labels like "1. ", "1 - ", "1) ", "[1] ", "Note 1 : "
  const isFootnoteItem = Boolean(el.closest('dd[id^="fn"], .wb-fnote dl, [role="note"] dl'));
  if (isFootnoteItem && newText) {
    const stripped = newText.replace(/^(?:(?:\(|\[)?\s*\d+\s*(?:\)|\])?\s*[:.\-–—]?\s*|\bNote(?:\s+de\s+bas\s+de\s+page)?\s*\d+\s*[:.\-–—]?\s*)/i, '').trim();
    if (stripped) {
      newText = stripped;
    }
  }

  // Extract any footnotes from English element before modifying children
  const blockFootnotes = extractBlockFootnotes(el);

  if (SPAN_TAGS.includes(blockTag) && !el.classList.contains('gc-br-line')) {
    if (blockTag === 'a') {
      const originalHref = el.getAttribute('href') || '';
      el.replaceChildren();
      appendTextWithLineBreaks(el, newText);
      childLists.forEach((cl) => el.appendChild(cl));
      if (isFragmentHref(originalHref)) return { unresolvedLinks: 0 };
      if (isNodeHref(originalHref)) {
        el.setAttribute('href', convertNodeHrefToFrench(originalHref));
        return { unresolvedLinks: 0 };
      }
      const frLink = (frSpans || []).find((s) => s.type === 'a');
      if (frLink && frLink.href) {
        el.setAttribute('href', formatFrenchRootRelativeLink(frLink.href));
        return { unresolvedLinks: 0 };
      }
      return { unresolvedLinks: 1 };
    }
    el.replaceChildren();
    appendTextWithLineBreaks(el, newText);
    childLists.forEach((cl) => el.appendChild(cl));
    return { unresolvedLinks: 0 };
  }

  const oldSpans = extractBlockSpans(el);

  // If the whole English block was wrapped in a single <strong>, <b>, <em>, or <i>
  // Use getBlockContent(el) to ignore child sub-lists when checking if whole block was wrapped
  const originalText = getBlockContent(el);
  if (oldSpans.length === 1 && blockFootnotes.length === 0) {
    const span = oldSpans[0];
    if (span.type === 'a' && originalText === span.text) {
      const origAnchor = el.querySelector('a');
      const originalHref = span.href || origAnchor?.getAttribute('href') || '';
      const aElem = document.createElement('a');
      // Preserve the original anchor's presentation attributes (e.g. gc-stp-stp
      // cards rely on class="list-group-item eqht-trgt active").
      if (origAnchor) {
        const origClass = origAnchor.getAttribute('class');
        if (origClass) aElem.setAttribute('class', origClass);
        for (const attr of ['target', 'rel', 'title', 'lang', 'hreflang']) {
          const v = origAnchor.getAttribute(attr);
          if (v !== null && v !== undefined && v !== '') aElem.setAttribute(attr, v);
        }
      }
      appendTextWithLineBreaks(aElem, newText);
      if (isFragmentHref(originalHref)) {
        aElem.setAttribute('href', originalHref);
        el.replaceChildren(aElem);
        childLists.forEach((cl) => el.appendChild(cl));
        return { unresolvedLinks: 0 };
      }
      if (isNodeHref(originalHref)) {
        aElem.setAttribute('href', convertNodeHrefToFrench(originalHref));
        el.replaceChildren(aElem);
        childLists.forEach((cl) => el.appendChild(cl));
        return { unresolvedLinks: 0 };
      }
      const frLink = (frSpans || []).find((s) => s.type === 'a');
      if (frLink && frLink.href) {
        aElem.setAttribute('href', formatFrenchRootRelativeLink(frLink.href));
        el.replaceChildren(aElem);
        childLists.forEach((cl) => el.appendChild(cl));
        return { unresolvedLinks: 0 };
      }
      // French Word text carries no hyperlink: keep the English link as a
      // placeholder (converted to root-relative) so the card keeps its
      // classes and href instead of degrading to plain text.
      if (originalHref) {
        aElem.setAttribute('href', formatFrenchRootRelativeLink(originalHref));
      }
      el.replaceChildren(aElem);
      childLists.forEach((cl) => el.appendChild(cl));
      return { unresolvedLinks: 1 };
    }

    // The entire English block is styled with <strong>, <b>, <em>, or <i>
    // For <th> headers, headings, and <caption>s, do not output <strong> tags as they are already inherently emphasized
    if ((isTh || isHeading || isCaption) && span.type === 'strong') {
      el.replaceChildren();
      appendTextWithLineBreaks(el, newText);
      childLists.forEach((cl) => el.appendChild(cl));
      return { unresolvedLinks: 0 };
    }

    // Replicate the exact English container emphasis so the entire French paragraph is bolded/italicized
    if (originalText === span.text && ['strong', 'em'].includes(span.type)) {
      const tagElem = document.createElement(span.type === 'strong' ? 'strong' : 'em');
      const frLinks = (frSpans || []).filter((s) => s.type === 'a' && s.href);
      if (frLinks.length > 0) {
        replaceBlockTextPreservingLinks(tagElem, newText, 'text', frSpans);
      } else {
        appendTextWithLineBreaks(tagElem, newText);
      }
      el.replaceChildren(tagElem);
      childLists.forEach((cl) => el.appendChild(cl));
      return { unresolvedLinks: 0 };
    }
  }

  // Determine spans to apply:
  // Preference 1: Explicit spans from French Word document (frSpans)
  let activeSpans = [];
  let unresolvedLinks = 0;

  if (frSpans && frSpans.length > 0) {
    const enLinks = oldSpans.filter((s) => s.type === 'a');
    let enLinkIdx = 0;

    frSpans.forEach((fs) => {
      if (!fs.text) return;
      let href = fs.href || '';
      let isFragment = isFragmentHref(href);
      let isNode = isNodeHref(href);

      if (fs.type === 'a') {
        if (!href && enLinks[enLinkIdx]) {
          const enHref = enLinks[enLinkIdx].href || '';
          if (isFragmentHref(enHref)) {
            href = enHref;
            isFragment = true;
          } else if (isNodeHref(enHref)) {
            href = convertNodeHrefToFrench(enHref);
            isNode = true;
          } else {
            href = enHref;
          }
          enLinkIdx++;
        }
      }

      activeSpans.push({
        type: fs.type,
        text: fs.text,
        href,
        isFragment,
        isNodeLink: isNode,
        start: typeof fs.start === 'number' ? fs.start : null,
      });
    });
  } else if (oldSpans && oldSpans.length > 0) {
    // When the Word document provides plain text without explicit hyperlinks/spans,
    // only wrap the entire French text in the link if the link IS the entire
    // English block content (e.g. Table of Contents list items like <li><a href="#a1">Purpose</a></li>)
    // — not when a link was just a partial sentence or fragment.
    const enLinks = oldSpans.filter((s) => s.type === 'a');
    if (enLinks.length === 1 && oldSpans.length === 1 && originalText === enLinks[0].text) {
      const enLink = enLinks[0];
      const enHref = enLink.href || '';
      let frHref = enHref;
      let isFragment = isFragmentHref(enHref);
      let isNode = isNodeHref(enHref);
      if (isNode) {
        frHref = convertNodeHrefToFrench(enHref);
      } else if (!isFragment && enHref) {
        frHref = formatFrenchRootRelativeLink(enHref);
      }
      activeSpans.push({
        type: 'a',
        text: newText,
        href: frHref,
        isFragment,
        isNodeLink: isNode,
      });
    } else if (enLinks.length > 0) {
      // If English contained specific links (e.g. email mailto: or specific URL phrases) and French text contains that target
      enLinks.forEach((enLink) => {
        const enHref = enLink.href || '';
        const enLinkText = (enLink.text || '').trim();
        if (enHref.startsWith('mailto:')) {
          const email = enHref.replace(/^mailto:/i, '').trim();
          if (email && newText.includes(email) && !activeSpans.some((s) => s.type === 'a' && s.href === enHref)) {
            activeSpans.push({
              type: 'a',
              text: email,
              href: enHref,
              isFragment: false,
              isNodeLink: false,
            });
          }
        } else if (enLinkText && newText.includes(enLinkText) && !activeSpans.some((s) => s.type === 'a' && s.text === enLinkText)) {
          let frHref = enHref;
          let isFragment = isFragmentHref(enHref);
          let isNode = isNodeHref(enHref);
          if (isNode) {
            frHref = convertNodeHrefToFrench(enHref);
          } else if (!isFragment && enHref) {
            frHref = formatFrenchRootRelativeLink(enHref);
          }
          activeSpans.push({
            type: 'a',
            text: enLinkText,
            href: frHref,
            isFragment,
            isNodeLink: isNode,
          });
        }
      });
    }
  }

  // Disallow bold (<strong>) spans inside <th> cells, headings, and <caption>s
  if (isTh || isHeading || isCaption) {
    activeSpans = activeSpans.filter((s) => s.type !== 'strong');
  }

  // Carry over leading bold prefix if English starts with bold label (e.g. <strong>Note:</strong> or <strong>Important:</strong>)
  // and the French translation begins with a corresponding label (e.g. "Remarque :", "Note :", "Avertissement :")
  if (!isTh && !isHeading && !isCaption) {
    const isFigcaption = el && el.tagName && el.tagName.toLowerCase() === 'figcaption';
    const isEntirelyStrong = oldSpans.some(
      (s) => s.type === 'strong' && (s.text === originalText || s.text.trim() === originalText.trim())
    );
    const hasAnyFrStrong = activeSpans.some((s) => s.type === 'strong');

    if ((isEntirelyStrong || (isFigcaption && oldSpans.some((s) => s.type === 'strong'))) && !hasAnyFrStrong) {
      activeSpans.push({
        type: 'strong',
        text: newText,
      });
    } else {
      const leadingEnStrong = oldSpans.find(
        (s) =>
          s.type === 'strong' &&
          (originalText.startsWith(s.text) ||
            originalText.startsWith(s.text + ':') ||
            originalText.startsWith(s.text + ' :') ||
            /^[A-Za-z\s]{1,30}:/.test(s.text))
      );
      if (leadingEnStrong) {
        const hasLeadingFrSpan = activeSpans.some((s) => newText.startsWith(s.text));
        if (!hasLeadingFrSpan) {
          const frPrefixMatch = newText.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\s'’()\-–—]{1,40}\s*[:：])/);
          if (frPrefixMatch && frPrefixMatch[1]) {
            activeSpans.unshift({
              type: 'strong',
              text: frPrefixMatch[1].trim(),
            });
          }
        }
      }
    }
  }

  // Count unresolved links if English had more links than French Word document provided
  const enLinksCount = oldSpans.filter((s) => s.type === 'a').length;
  const frLinksCount = (frSpans || []).filter((s) => s.type === 'a').length;
  if (enLinksCount > frLinksCount) {
    unresolvedLinks += (enLinksCount - frLinksCount);
  }

  // Rebuild text with footnote placeholders if footnotes exist
  let rebuilt = newText;
  if (blockFootnotes.length > 0) {
    const toSuperscript = toUnicodeSuperscript;
    // Which citations have already been given a marker. Every placement pass
    // below adds to it, so a note is never marked twice.
    const placedIndexes = new Set();

    // A citation with no anchor left in the translated text still belongs before
    // the closing punctuation, not glued on after the final period.
    const insertMarker = (text, marker) => {
      const tail = text.match(/[\s ]*[.;:!?»]+[\s ]*$/);
      if (!tail) return text + marker;
      const cut = text.length - tail[0].length;
      return text.slice(0, cut).replace(/[\s ]+$/, '') + marker + text.slice(cut);
    };

    // Last resort before the end of the paragraph: drop the marker at the
    // proportional position the English citation occupies, snapped to the
    // nearest word boundary — with clause punctuation placed before the marker,
    // so it follows the clause it supports. Sentence-final punctuation is
    // deliberately not jumped over, which would move the marker into the next
    // sentence. Returns null when there is no boundary left to snap to.
    //
    // nearestWordBoundary is the shared implementation, not a second copy: this
    // one previously treated a zero-length forward match as a boundary, so it
    // won every comparison and landed mid-word, splitting "isole" into
    // "is<marker>ole".
    const insertAtPosition = (text, marker, relPos) => {
      if (typeof relPos !== 'number' || !(relPos > 0 && relPos < 1)) return null;
      const cut = nearestWordBoundary(text, Math.floor(text.length * relPos));
      if (cut === null || cut <= 0 || cut >= text.length) return null;
      // Only the gap before the seam is closed. Trimming the one after it too
      // produced "ete1isole" instead of "ete1 isole".
      return text.slice(0, cut).replace(/[\s\u00A0]+$/, '') + marker + text.slice(cut);
    };

    // 0. A run of digits with no separator at all: "789101112", "141516".
    //
    // This is what a French document looks like when the translator kept the
    // callouts as separate <sup> elements. Stripped to flat text they run
    // together, and then no per-citation rule can see them: every digit but the
    // last is followed by another digit, so the very guard that keeps "1,3 mg"
    // and "F1" out rejects the whole run. All ten notes then missed, and the
    // fallback placed a second set of markers at the English offsets while the
    // digits stayed in the sentence — the duplicate-badge-plus-raw-digit
    // symptom, now that a bare space-separated run is handled.
    //
    // It is consumed only when all three hold, and every one of them is
    // evidence rather than a guess:
    //   - the French block's own <sup> elements cover the run exactly. That
    //     markup is the translator saying "these digits are raised, they are
    //     callouts", and it is the only reason to trust a run of bare digits.
    //     Without it the run is left alone: this rule never guesses.
    //   - the run writes itself in exactly ONE way as notes this block has left
    //     to place. "789101112" is 7,8,9,10,11,12 and nothing else. A run with
    //     two readings is a number, and numbers are left alone.
    //   - that reading uses two notes or more, so a lone digit keeps going
    //     through the guarded per-citation path rather than this one.
    const supRanges = (frSpans || [])
      .filter((s) => s && s.type === 'sup' && typeof s.start === 'number' && /^\d{1,3}$/.test(s.text || ''))
      .map((s) => [s.start, s.start + s.text.length])
      .sort((a, b) => a[0] - b[0]);
    const coveredBySup = (from, to) => {
      if (!supRanges.length) return false;
      let at = from;
      for (const [a, b] of supRanges) {
        if (b <= at) continue;
        if (a > at) return false;
        at = b;
        if (at >= to) return true;
      }
      return at >= to;
    };
    // The single way to write `run` as notes, or null when there is none or more
    // than one. Memoised on (position, notes still available) and pruned on the
    // digits that remain, so a long run cannot blow up.
    const soleNoteSequence = (run, available) => {
      const found = [];
      const seen = new Set();
      const walk = (pos, left, acc) => {
        if (found.length > 1) return;
        if (pos === run.length) { found.push(acc); return; }
        const key = `${pos}|${left.join(',')}`;
        if (seen.has(key)) return;
        seen.add(key);
        let leftDigits = 0;
        for (const n of left) leftDigits += n.length;
        if (leftDigits < run.length - pos) return; // cannot fill the rest
        for (let i = 0; i < left.length; i++) {
          const num = left[i];
          if (!run.startsWith(num, pos)) continue;
          walk(pos + num.length, left.filter((_, k) => k !== i), acc.concat(num));
        }
      };
      walk(0, available.slice(), []);
      return found.length === 1 ? found[0] : null;
    };
    const outstandingNums = () => blockFootnotes
      .map((fn, i) => ({ i, num: String(fn.fnNum || '').replace(/^fn[-_]?/i, '') }))
      .filter(({ i, num }) => /^\d{1,3}$/.test(num)
        && !placedIndexes.has(i)
        && !rebuilt.includes(`___GC_FN_${i}___`))
      .map(({ num }) => num);
    const indexByNum = new Map();
    blockFootnotes.forEach((fn, i) => {
      const num = String(fn.fnNum || '').replace(/^fn[-_]?/i, '');
      if (/^\d{1,3}$/.test(num) && !indexByNum.has(num)) indexByNum.set(num, i);
    });
    rebuilt = rebuilt.replace(/\d{3,}/g, (run, offset) => {
      if (!coveredBySup(offset, offset + run.length)) return run;
      const seq = soleNoteSequence(run, outstandingNums());
      if (!seq || seq.length < 2) return run;
      seq.forEach((num) => placedIndexes.add(indexByNum.get(num)));
      return seq.map((num) => `___GC_FN_${indexByNum.get(num)}___`).join('');
    });

    // 1. Expand a bracketed range in the translated text where it stands.
    //    "[7-12]" is the inaccessible shorthand for notes 7 through 12: read
    //    aloud it is one run, "7 dash 12", not six notes. Expanding in place is
    //    also the only precise anchor available — a translated sentence rarely
    //    repeats the bare digits, so without this the six markers have nowhere
    //    to go and pile up at the end of the paragraph.
    //    A bracket is only consumed when EVERY number in it is a citation this
    //    block really carries, so a stray "[3-5]" in prose is left untouched.
    //    Consecutiveness is deliberately NOT required: a non-consecutive list
    //    whose every member is cited ("[36, 37, 39]") is the same evidence as a
    //    range, and refusing it left the typed numbers in the sentence while
    //    the fallback placed a second set of markers at proportional offsets.
    //    This mirrors the post-process bracket pass, which never required it.
    //    Each number maps to the citation occurrence nearest the bracket's own
    //    position (not simply the first): a note cited four times in one
    //    paragraph must resolve "[36, 40]" at 60% of the text to its third
    //    occurrence, not re-consume the first. Falls back to first-unplaced
    //    when positions are unavailable.
    if (blockFootnotes.length > 1) {
      rebuilt = rebuilt.replace(/\[\s*([\d\s,;–—-]+?)\s*\]/g, (match, inner, offset) => {
        const nums = expandCitationRefList(inner);
        if (nums.length < 2) return match;
        const relPos = rebuilt.length > 0 ? offset / rebuilt.length : null;
        const pickIdx = (n, taken) => {
          let first = -1;
          let best = -1;
          let bestDist = Infinity;
          blockFootnotes.forEach((fn, i) => {
            const pure = String(fn.fnNum || '').replace(/^fn[-_]?/i, '');
            if (pure !== n || placedIndexes.has(i) || taken.has(i)) return;
            if (first < 0) first = i;
            const p = typeof fn.pos === 'number' ? fn.pos : null;
            if (relPos === null || p === null) return;
            const d = Math.abs(p - relPos);
            if (d < bestDist) { bestDist = d; best = i; }
          });
          return best >= 0 ? best : first;
        };
        const taken = new Set();
        const idxs = [];
        for (const n of nums) {
          const chosen = pickIdx(n, taken);
          if (chosen < 0 || idxs.includes(chosen)) return match;
          taken.add(chosen);
          idxs.push(chosen);
        }
        idxs.forEach((i) => placedIndexes.add(i));
        return idxs.map((i) => `___GC_FN_${i}___`).join('');
      });
    }


    // 1. Check if multiple footnotes appear together as a cluster in the text
    // E.g. "¹ ²", "¹²", "¹,²", "¹, ²", "1 2", "1, 2", "1,2", "[1, 2]", "[1][2]", "(1, 2)", "(1)(2)", "Notes 1 et 2", "Notes 1, 2"
    if (blockFootnotes.length > 1) {
      const allNums = blockFootnotes.map((fn, idx) => {
        const pure = fn.fnNum.replace(/^fn[-_]?/i, '');
        return {
          fnNum: fn.fnNum,
          pure: pure || String(idx + 1),
          super: toSuperscript(pure || String(idx + 1)),
          idx,
        };
      });

      // Check for clustered superscript sequence e.g. "¹ ²" or "¹²" or "¹, ²"
      const superClusterRegexStr = allNums
        .map((n) => escapeRegExp(n.super))
        .join('[\\s,;\\-–—]*');
      const superClusterRegex = new RegExp(`[\\s\u00A0]*(?:${superClusterRegexStr})`, 'g');
      if (superClusterRegex.test(rebuilt)) {
        const clusterRepl = allNums.map((n) => `___GC_FN_${n.idx}___`).join('');
        rebuilt = rebuilt.replace(superClusterRegex, clusterRepl);
      } else {
        // Check for clustered bracket/parenthesis/note e.g. "[1, 2]", "(1, 2)", "{1, 2}", "[1][2]"
        const numClusterRegexStr = allNums
          .map((n) => `(?:fn[-_]?|#fn[-_]?|Note(?:\\s+de\\s+bas\\s+de\\s+page)?\\s*)?(?:${escapeRegExp(n.pure)}|${escapeRegExp(n.fnNum)})`)
          .join('[\\s,;\\-–—/et]+');
        const bracketClusterRegex = new RegExp(
          `[\\s\u00A0]*(?:\\[\\s*${numClusterRegexStr}\\s*\\]|\\(\\s*${numClusterRegexStr}\\s*\\)|\\{\\s*${numClusterRegexStr}\\s*\\}|\\b(?:Notes?(?:\\s+de\\s+bas\\s+de\\s+page)?|Footnotes?)\\s+${numClusterRegexStr}\\b)`,
          'i'
        );
        if (bracketClusterRegex.test(rebuilt)) {
          const clusterRepl = allNums.map((n) => `___GC_FN_${n.idx}___`).join('');
          rebuilt = rebuilt.replace(bracketClusterRegex, clusterRepl);
        } else {
          // Check for trailing clustered numbers e.g. "Bundibugyo1 2", "Bundibugyo 1 2", "Bundibugyo1, 2"
          const trailingClusterRegexStr = allNums
            .map((n) => `(?:${escapeRegExp(n.pure)}|${escapeRegExp(n.fnNum)})`)
            .join('[\\s,;\\-–—]+');
          const trailingClusterRegex = new RegExp(
            `(?<=[a-zA-ZÀ-ÖØ-öø-ÿ.,;:!?'"»)])[\\s\u00A0]*(?:${trailingClusterRegexStr})(?=[\\s.,;:!?'"»)]|$)`,
            'i'
          );
          if (trailingClusterRegex.test(rebuilt)) {
            const clusterRepl = allNums.map((n) => `___GC_FN_${n.idx}___`).join('');
            rebuilt = rebuilt.replace(trailingClusterRegex, clusterRepl);
          }
        }
      }
    }

    // Does this block renumber its notes per paragraph? Decided once for the whole
    // block rather than per citation: a source that renumbers renumbers every note
    // in it, so "the citation's position in the block" is either the identity for
    // all of them or for none. Deciding per citation let footnote 13 offer both "13"
    // and "1", and the stray "1" then matched unrelated prose.
    const blockUsesPositionNumbers = blockFootnotes.length > 1 && blockFootnotes.every((fn) => {
      const n = String(fn.fnNum || '').replace(/^fn[-_]?/i, '');
      if (!/^\d{1,3}$/.test(n)) return false;
      return !new RegExp(`(?:^|[^0-9])0*${escapeRegExp(n)}(?:[^0-9]|$)`).test(rebuilt);
    });

    // 2. For any remaining footnotes not yet matched in rebuilt, match them individually
    //
    // The French text as it arrived, and the edits to make on it. Both are fixed
    // before the loop: every offset is measured against the same snapshot and the
    // edits are applied back to front at the end, so a marker never moves because
    // an earlier one changed the length of the string.
    const base = rebuilt;
    const pendingEdits = [];
    // Source ranges already claimed by an edit, in base coordinates. Every
    // matcher below measures against the same immutable snapshot, so without
    // this two citations for the same note (36 cited four times in one
    // paragraph) each match the FIRST occurrence and pile all their markers
    // on it — the 40×4 symptom. A hit intersecting a claimed range is skipped
    // and matching continues past it, so later occurrences fall through to
    // their own sites. Ranges claimed by the pre-snapshot direct replaces
    // (bracket expansion, clusters) cannot be mapped here — their coordinates
    // predate the snapshot — but their output is placeholder tokens whose
    // shape every matcher is already guarded against, plus the slicesToken
    // backstop at application time.
    const consumedRanges = [];
    const rangeConsumed = (start, end) =>
      end > start && consumedRanges.some((c) => start < c.end && c.start < end);
    const claimRange = (start, end) => {
      if (end > start) consumedRanges.push({ start, end });
    };
    // First hit at or after `from` whose range is unclaimed. Resuming past a
    // claimed hit is safe: a partially-overlapping alternative would slice a
    // neighbour's placeholder, so skipping to the next clean hit is the
    // correct behaviour, not just an optimization.
    const findUnconsumed = (re, from) => {
      re.lastIndex = from;
      let m;
      let guard = 0;
      while ((m = re.exec(base)) !== null) {
        if (++guard > 10000) return null;
        if (!m[0].length) {
          re.lastIndex = m.index + 1;
          if (re.lastIndex >= base.length) return null;
          continue;
        }
        if (!rangeConsumed(m.index, m.index + m[0].length)) return m;
      }
      return null;
    };
    // Insertions only ever move forward. On a short French sentence several
    // citations' proportional points round to the same offset, and without this
    // an earlier citation could land after a later one — the notes came out as
    // 10,11,12,9,13,14,15,16,7,8. Citations are handled in document order, so
    // holding their offsets monotonic is enough to hold the markers in order.
    let lastInsertAt = 0;

    // A run of consecutive notes is one citation point, not six. The English
    // reads "lung tumours 7 8 9 10 11 12" as a single cluster, and giving each
    // note its own proportional point stretched that cluster across the whole
    // sentence — the note the author wrote next to "tumours" ended up beside
    // "2004", and the ones for 14-16 drifted to the end.
    //
    // "Consecutive" has to mean close together in the TEXT, not just consecutive
    // numbers: notes 12, 13 and 14 follow each other numerically but sit 24%, 65%
    // and 97% along the paragraph, and treating them as one cluster piled all ten
    // markers on a single word. So a run breaks whenever the gap between two
    // adjacent citations exceeds CLUSTER_GAP of the block — roughly a word.
    // CLUSTER_GAP * (end - start) is how many characters a run may span, so a long
    // paragraph does not split a genuine cluster.
    const CLUSTER_GAP = 0.02;
    const numericOf = (fn) => {
      const n = String(fn.fnNum || '').replace(/^fn[-_]?/i, '');
      return /^\d{1,3}$/.test(n) ? parseInt(n, 10) : null;
    };
    const posOf = (fn) => (typeof fn.pos === 'number' && fn.pos > 0 && fn.pos < 1 ? fn.pos : null);
    const runAnchorPos = new Map();
    {
      let start = 0;
      while (start < blockFootnotes.length) {
        let end = start;
        for (let k = start + 1; k < blockFootnotes.length; k++) {
          const prev = numericOf(blockFootnotes[k - 1]);
          const cur = numericOf(blockFootnotes[k]);
          if (prev === null || cur === null || cur !== prev + 1) break;
          const span = posOf(blockFootnotes[end]) !== null && posOf(blockFootnotes[k]) !== null
            ? posOf(blockFootnotes[k]) - posOf(blockFootnotes[end])
            : 0;
          if (span > CLUSTER_GAP * (k - start + 1)) break;
          end = k;
        }
        // The run's anchor is the position of its first note, which is where
        // the English attaches the cluster.
        const anchor = posOf(blockFootnotes[start]);
        if (anchor !== null) for (let k = start; k <= end; k++) runAnchorPos.set(k, anchor);
        start = end + 1;
      }
    }

    // A run with no separator at all — "789101112" for notes 7-12. Every cluster
    // shape above requires a separator, and the per-citation pass below cannot
    // match one either, so without this the six notes are each given their own
    // proportional point — which put them before "malignes" rather than on the
    // citation — and the typed digits stay in the sentence.
    //
    // Grouped by numeric consecutiveness only, NOT by the CLUSTER_GAP test above.
    // That test measures how far apart two citations sit along the ENGLISH text,
    // and a French sentence is routinely longer than the English it came from, so
    // the same cluster spreads past the gap: on a 22-character English block the
    // six notes sat 13% apart and every one of them became its own cluster, which
    // left nothing here to pair up. Whether these notes are one citation point is
    // settled by the text itself — the concatenation either appears as one token
    // or it does not — so the positional heuristic is not consulted to decide it,
    // only to break a tie when the same run appears twice.
    //
    // Sub-ranges are tried longest-first because a block can cite 7-16 while the
    // translator typed "789101112" and "141516" as two separate clusters.
    {
      const groups = [];
      for (let i = 0; i < blockFootnotes.length;) {
        let j = i;
        for (let k = i + 1; k < blockFootnotes.length; k++) {
          const prev = numericOf(blockFootnotes[k - 1]);
          const cur = numericOf(blockFootnotes[k]);
          if (prev === null || cur === null || cur !== prev + 1) break;
          j = k;
        }
        groups.push([i, j]);
        i = j + 1;
      }

      for (const [gi, gj] of groups) {
        for (let i = gi; i < gj;) {
          let taken = null;
          for (let k = gj; k > i; k--) {
            let free = true;
            for (let q = i; q <= k; q++) if (placedIndexes.has(q)) { free = false; break; }
            if (!free) continue;
            const members = blockFootnotes.slice(i, k + 1);
            const nums = members.map((fn) => String(fn.fnNum || '').replace(/^fn[-_]?/i, ''));
            const anchor = runAnchorPos.has(i) ? runAnchorPos.get(i) : null;
            const rawHit = findJoinedCitationRun(base, nums, { anchorPos: anchor });
            // A run sitting inside an already-claimed range belongs to an
            // earlier citation — consuming it again would slice that marker.
            const hit = rawHit && !rangeConsumed(rawHit.start, rawHit.end) ? rawHit : null;
            if (hit) { taken = { k, hit, members, nums }; break; }
          }
          if (!taken) { i++; continue; }
          const { k, hit, members, nums } = taken;
          claimRange(hit.start, hit.end);
          pendingEdits.push({
            start: hit.start,
            end: hit.end,
            text: members.map((_, q) => `___GC_FN_${i + q}___`).join(''),
            nums,
          });
          for (let q = i; q <= k; q++) placedIndexes.add(q);
          recordPlacementGuess(
            nums[0],
            `matched the unseparated run "${hit.digits}" where the cluster is cited and replaced it`
          );
          i = k + 1;
        }
      }
    }

    blockFootnotes.forEach((fn, fIdx) => {
      if (placedIndexes.has(fIdx)) return;
      if (rebuilt.includes(`___GC_FN_${fIdx}___`)) return;

      const fnNum = fn.fnNum;
      const pureNum = fnNum.replace(/^fn[-_]?/i, '');
      const posNum = String(fIdx + 1);
      const superNum = toSuperscript(pureNum || posNum);

      // The citation's own number, plus its position in the block only when the
      // whole block renumbers and the real number is absent — see
      // buildFootnoteAnchorAlternation.
      const patternOr = buildFootnoteAnchorAlternation(fnNum, fIdx, rebuilt, blockUsesPositionNumbers);
      const superEscaped = escapeRegExp(superNum);
      const optLabel = '(?:fn[-_]?|#fn[-_]?|Note(?:\\s+de\\s+bas\\s+de\\s+page)?\\s*)?';

      // EVIDENCE — an explicit marker shape: a bracketed or labelled number, or
      // a Unicode superscript. Tried over the WHOLE block, ahead of every bare
      // number, because a shape is a decision the translator made and a bare
      // digit is not. With one alternation for both, whichever came first in the
      // text won: a paragraph ending "(1, 24, 48 and 72 hours) [1]" put the
      // marker on the 1 inside the list and left the real [1] as plain text.
      //
      // Both patterns are `g` and are matched against the WHOLE string with
      // lastIndex moved, never against a sliced window: a lookbehind at index 0
      // of a slice cannot see the character before it, so slicing quietly
      // disabled the very guard that keeps a digit run ("789101112") intact.
      const explicitRe = new RegExp(
        `[\\s\u00A0]*(?:` +
        `${superEscaped}+|` +
        `\\{\\s*${optLabel}(?:${patternOr})\\s*\\}|` +
        `\\[\\s*${optLabel}(?:${patternOr})\\s*\\]|` +
        `\\(\\s*${optLabel}(?:${patternOr})\\s*\\)|` +
        `\\b(?:Note(?:\\s+de\\s+bas\\s+de\\s+page)?|Footnote)\\s*(?:${patternOr})\\b(?:\\s*[.:])?|` +
        // Number following a previous footnote placeholder: ___GC_FN_0___ 2 or ___GC_FN_0___, 2
        `(?<=___GC_FN_\\d+___)[\\s\u00A0,;\\-–—]*(?:${patternOr})(?=[\\s.,;:!?'"»)]|$)` +
        `)`,
        'gi'
      );

      // GUESS — a bare number. Only reached when no explicit shape exists
      // anywhere in the block, and then only from the point where the English
      // citation stood, which is what keeps it away from the figures that share
      // its shape.
      const bareRe = new RegExp(
        `[\\s\u00A0]*(?:` +
        // Number directly attached to a preceding word: "Bundibugyo1", "virus1",
        // "mot1". Commas and semicolons are deliberately NOT in the lookbehind:
        // a digit after one is a list element ("[36, 37,39]", "1,3 mg"), and
        // eating it here is what pulled single markers out of multi-number
        // brackets, leaving "[36, 37,, 40]" behind. The standalone branch
        // below already refuses those shapes for the same reason.
        `(?<=[a-zA-ZÀ-ÖØ-öø-ÿ.:!?'"»])(?:${patternOr})(?=[\\s.,;:!?'"»)]|$)|` +
        // Number standing on its own between spaces: "... bénignes et malignes 7 8 9 10 11 12".
        // This is how a translator types a run of notes, and it used to match
        // nothing at all — no other branch accepts a space-separated number, so
        // every note in the run missed and was placed a second time at the
        // English offset while the typed digits stayed in the sentence. The
        // guard is what keeps "F1", "mg/m3", "1,3" and "(1, 24, 48)" out; see
        // standaloneCitationRe.
        `${standaloneCitationRe(patternOr)}|` +
        // Number at the very end of the text: "Bundibugyo 1"
        `[\\s\u00A0]+(?:${patternOr})$` +
        `)`,
        'gi'
      );

      const marker = `___GC_FN_${fIdx}___`;

      // Where in the block the English citation sits. A citation that closes its
      // sentence must be looked for near the end of the French text: "mg/m³"
      // carries a 3 and so does a footnote 3, and a search over the whole string
      // will happily replace the exponent. The French text is a flat string
      // with no markup left, so this position is the only thing that
      // distinguishes them — guessing from the number alone cannot.
      const relPos = typeof fn.pos === 'number' ? fn.pos : null;
      // A match that is nothing but digits came from one of the bare-number
      // branches (glued to a word, or standing on its own). Those are guesses,
      // not evidence: in a flat French string "mg/m3", "1,3 mg" and "3 mg/kg"
      // have exactly the shape of a callout the translator typed, and nothing
      // in the string says which one it is. Recorded so the QA panel can show
      // it rather than leaving a wrong answer to be discovered by a reader.
      let bareNumberGuess = null;

      // Attempt 1 — an explicit marker shape anywhere in the block. Wins outright
      // when one exists, and needs no window: "[1]" is a decision, not a guess.
      //
      // Every offset below is measured against `base` — the French text as it
      // arrived — and nothing is written until the whole loop has finished. The
      // loop used to splice each marker in as it went, so each citation measured
      // its position against a string the previous sixteen had already made
      // longer, and on a short French sentence the markers came out in the wrong
      // order: 8,10,11,12,13,14,15,16,7,9. Measuring once and applying back to
      // front is what keeps them in document order, the same way
      // convertFrenchBlockFootnotes does it.
      const edit = (start, end, text) => {
        if (start === end) {
          const at = Math.max(start, lastInsertAt);
          lastInsertAt = at;
          pendingEdits.push({ start: at, end: at, text, nums: [pureNum] });
          return;
        }
        claimRange(start, end);
        pendingEdits.push({ start, end, text, nums: [pureNum] });
      };
      // Like findFrom, but skips ranges claimed by earlier citations (see
      // consumedRanges): repeated numbers each advance to their own
      // occurrence instead of re-eating the first one.
      const findFrom = (re, from) => findUnconsumed(re, from);
      const explicitHit = findFrom(explicitRe, 0);
      if (explicitHit) {
        edit(explicitHit.index, explicitHit.index + explicitHit[0].length, marker);
      } else if (relPos !== null) {
        // Attempt 2 — a bare number, but only from the point where the English
        // citation stood. "mg/m³" carries a 3 and so does a footnote 3, and a
        // search over the whole string will happily take the exponent. The French
        // text is a flat string with no markup left, so this position is the only
        // thing that distinguishes them.
        const searchFrom = Math.max(0, Math.floor(base.length * (relPos - 0.2)));
        const hit = findFrom(bareRe, searchFrom);
        if (hit) {
          if (/^\s*\d{1,3}$/.test(hit[0])) bareNumberGuess = hit[0].trim();
          edit(hit.index, hit.index + hit[0].length, marker);
        } else {
          // Nothing to anchor to: the marker goes at the English proportion, or
          // before the closing punctuation. Both are the loosest thing this
          // pipeline does, so both are recorded — a document whose notes were
          // all dropped by the translator should not come back looking clean.
          // A run of consecutive notes shares one point, so the markers stay
          // together instead of being spread evenly along the sentence.
          const anchorPos = runAnchorPos.get(fIdx);
          const placeAt = typeof anchorPos === 'number' && anchorPos > 0 && anchorPos < 1 ? anchorPos : relPos;
          const cut = nearestWordBoundary(base, Math.floor(base.length * placeAt));
          if (cut !== null && cut > 0 && cut < base.length) {
            edit(cut, cut, marker);
            recordPlacementGuess(
              pureNum || posNum,
              anchorPos === relPos
                ? `no marker in the French text; placed at ${Math.round((cut / Math.max(1, base.length)) * 100)}% of the block, where the English citation stands`
                : `no marker in the French text; placed with the rest of its run at ${Math.round((cut / Math.max(1, base.length)) * 100)}% of the block, where the English cluster stands`
            );
          } else {
            const tail = base.match(/[\s\u00A0]*[.;:!?»]+[\s\u00A0]*$/);
            const at = tail && tail[0].length ? base.length - tail[0].length : base.length;
            edit(at, at, marker);
            recordPlacementGuess(
              pureNum || posNum,
              'no marker and no usable position in the English source; placed before the closing punctuation'
            );
          }
        }
      } else {
        const hit = findFrom(bareRe, 0);
        if (hit) {
          if (/^\s*\d{1,3}$/.test(hit[0])) bareNumberGuess = hit[0].trim();
          edit(hit.index, hit.index + hit[0].length, marker);
        } else {
          const tail = base.match(/[\s\u00A0]*[.;:!?»]+[\s\u00A0]*$/);
          const at = tail && tail[0].length ? base.length - tail[0].length : base.length;
          edit(at, at, marker);
          recordPlacementGuess(
            pureNum || posNum,
            'no marker in the French text and no position to anchor to; placed before the closing punctuation'
          );
        }
      }
      if (bareNumberGuess) {
        recordPlacementGuess(
          pureNum || posNum,
          `matched a bare number "${bareNumberGuess}" in the French text rather than an explicit marker shape — confirm it is a callout and not a figure`
        );
      }
    });

    // Apply the placements back to front, so every offset stays valid and the
    // markers come out in the order the citations appear. Two edits landing on
    // the same offset keep citation order, so a run of notes stays a run: they
    // are applied latest-first, because each insertion pushes what is already
    // there to the right.
    //
    // Two consuming edits whose ranges intersect must never both cut: the
    // later-applied (lower-offset) one would slice through the placeholder
    // text the earlier one inserted, fragmenting ___GC_FN_ tokens into
    // literal debris (the _FN_7_ symptom). Consumed base ranges are tracked
    // and any edit cutting through one is downgraded to an adjacent pure
    // insertion, so its citation is still placed rather than lost or
    // corrupting its neighbour. Insertions are additionally kept out of live
    // placeholder spans in the current string.
    pendingEdits.forEach((e, k) => { e.seq = k; });
    const coveredRanges = [];
    const tokenSpanAt = (text, at) => {
      const re = /___GC_(?:FN|SPAN)_\d+___/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (at > m.index && at < m.index + m[0].length) return m;
      }
      return null;
    };
    const nudgeInsert = (at) => {
      let pos = Math.max(0, Math.min(at, rebuilt.length));
      for (let guard = 0; guard < 10; guard++) {
        let moved = false;
        for (let c = 0; c < coveredRanges.length; c++) {
          const cov = coveredRanges[c];
          if (pos > cov.start && pos < cov.start + cov.outLen) {
            pos = cov.start + cov.outLen;
            moved = true;
          }
        }
        const tok = tokenSpanAt(rebuilt, pos);
        if (tok) {
          pos = tok.index + tok[0].length;
          moved = true;
        }
        if (!moved) break;
      }
      return Math.max(0, Math.min(pos, rebuilt.length));
    };
    const downgradedEdits = [];
    pendingEdits
      .slice()
      .sort((a, b) => b.start - a.start || b.seq - a.seq)
      .forEach((e) => {
        if (e.end === e.start) {
          const at = nudgeInsert(e.start);
          rebuilt = rebuilt.slice(0, at) + e.text + rebuilt.slice(at);
          // Zero-width, so it never triggers the overlap guard itself — but a
          // later (lower-offset) consuming edit spanning this point would
          // silently swallow the just-placed marker. Registering it turns that
          // into a downgrade instead.
          coveredRanges.push({ start: at, end: at, outLen: 0 });
          return;
        }
        const overlap = coveredRanges.some((c) => {
          if (e.start < c.end && c.start < e.end) return true;
          // A zero-width entry is a placed marker: a consume starting on it
          // and extending right would slice it away with the consumed text.
          if (c.start === c.end && e.start <= c.start && c.start < e.end) return true;
          return false;
        });
        const slicesToken = (() => {
          const re = /___GC_(?:FN|SPAN)_\d+___/g;
          let m;
          while ((m = re.exec(base)) !== null) {
            if (e.start < m.index + m[0].length && m.index < e.end
              && (e.start > m.index || e.end < m.index + m[0].length)) return true;
          }
          return false;
        })();
        if (overlap || slicesToken) {
          downgradedEdits.push(e);
          return;
        }
        rebuilt = rebuilt.slice(0, e.start) + e.text + rebuilt.slice(e.end);
        coveredRanges.push({ start: e.start, end: e.end, outLen: e.text.length });
      });
    // Downgraded edits: place their markers adjacently (back to front, citation
    // order preserved) rather than consuming text. Logged so the QA panel can
    // show the guess instead of silently dropping or duplicating a citation.
    // Same-point inserts spread forward so repeated downgrades do not stack
    // all their markers on one word.
    const usedInsertPoints = new Set();
    downgradedEdits
      .sort((a, b) => b.start - a.start || (b.seq || 0) - (a.seq || 0))
      .forEach((e) => {
        let at = nudgeInsert(e.start);
        let guard = 0;
        while (usedInsertPoints.has(at) && guard++ < 50) {
          at = nudgeInsert(at + 1);
        }
        usedInsertPoints.add(at);
        rebuilt = rebuilt.slice(0, at) + e.text + rebuilt.slice(at);
        recordPlacementGuess(
          (e.nums && e.nums[0]) || '?',
          'overlapping citation matches in the French text; placed adjacent markers instead of consuming text — confirm each marker sits with its callout'
        );
      });

    // A re-harvested block still carries the bare number of a marker rendered
    // last time. Consume it here, or the number is printed twice. Runs after the
    // edits, so a marker is already in place for it to sit in front of.
    blockFootnotes.forEach((fn, i) => {
      rebuilt = absorbCitationResidue(rebuilt, fn.fnNum, `___GC_FN_${i}___`);
    });

    // 3. Clean any leftover stray superscript characters or redundant digits immediately
    //    adjacent to footnote placeholders.
    //
    //    "Immediately" means glued: the digit must touch the word in front of it
    //    and the marker in front of that. Allowing a space on the left turned
    //    this into "delete any number that ends a word and is followed by a
    //    marker", which ate the year in "…en 2004." as soon as a note was placed
    //    before the closing punctuation. The general case — a typed number left
    //    beside its marker — is absorbCitationResidue's job, not this one's.
    rebuilt = rebuilt.replace(/(?<=[a-zA-ZÀ-ÖØ-öø-ÿ])[¹²³⁴⁵⁶⁷⁸⁹⁰]+(?=___GC_FN_\d+___)/g, '');
    rebuilt = rebuilt.replace(/(?<=[a-zA-ZÀ-ÖØ-öø-ÿ])\d{1,3}(?=___GC_FN_\d+___)/g, '');
  }

  // If no active spans and no footnotes to apply, simply set textContent
  if (activeSpans.length === 0 && blockFootnotes.length === 0) {
    el.replaceChildren();
    appendTextWithLineBreaks(el, newText);
    childLists.forEach((cl) => el.appendChild(cl));
    if (isTh) cleanThTags(el);
    if (isCaption) cleanCaptionTags(el);
    return { unresolvedLinks };
  }

  // Replace activeSpans inside rebuilt using placeholders.
  // Spans carrying a `start` offset (recorded at extraction) are pinned to
  // the occurrence nearest that offset, so a repeated word ("ou … ou")
  // keeps its styling on the right occurrence instead of always the first.
  // Spans without offsets (constructed entries, legacy data) — or text that
  // drifted after live edits — fall back to first-match. Processed in
  // descending offset order so earlier positions stay valid as placeholders
  // (fixed-length markers) replace variable-length text after them.
  const spanPlaceholders = activeSpans.map((_, i) => `___GC_SPAN_${i}___`);
  const matchedSpanIndexes = [];

  const findSpanPos = (haystack, needle, prefOffset) => {
    if (!needle) return null;
    const escaped = escapeRegExp(needle);
    // Placeholders embed their own index digits — "___GC_FN_10___" contains a
    // 1 and a 0. A span whose text is a bare digit (a superscript exponent, now
    // that <sup> is a span type) must not match inside one, or the marker itself
    // gets wrapped in a <sup>. Digits flanked by the placeholder's underscores
    // are rejected; prose is unaffected.
    const src = /^\d+$/.test(needle) ? `(?<!_)${escaped}(?!_)` : escaped;
    if (prefOffset === null || prefOffset === undefined) {
      const m = new RegExp(src, 'i').exec(haystack);
      return m ? { index: m.index, length: m[0].length } : null;
    }
    const re = new RegExp(src, 'gi');
    let best = null;
    let bestDist = Infinity;
    let m;
    while ((m = re.exec(haystack)) !== null) {
      const d = Math.abs(m.index - prefOffset);
      if (d < bestDist) {
        bestDist = d;
        best = { index: m.index, length: m[0].length };
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return best;
  };

  // Sort by length descending to match longest phrases first
  const sortedIndices = activeSpans
    .map((_, i) => i)
    .sort((a, b) => {
      const oa = typeof activeSpans[a].start === 'number' ? activeSpans[a].start : -1;
      const ob = typeof activeSpans[b].start === 'number' ? activeSpans[b].start : -1;
      if (oa !== ob) return ob - oa;
      return activeSpans[b].text.length - activeSpans[a].text.length;
    });

  sortedIndices.forEach((i) => {
    const span = activeSpans[i];
    const found = findSpanPos(rebuilt, span.text, span.start);
    if (found) {
      rebuilt = rebuilt.slice(0, found.index) + spanPlaceholders[i] + rebuilt.slice(found.index + found.length);
      matchedSpanIndexes.push(i);
    }
  });

  // When the whole block was a single link, keep the original anchor's classes
  // on the rebuilt link so card/TOC styling survives.
  let wholeBlockAnchorClass = null;
  let wholeBlockAnchorAttrs = null;
  {
    const enLinksOnly = (oldSpans || []).filter((s) => s.type === 'a');
    if (oldSpans && oldSpans.length === 1 && enLinksOnly.length === 1 && originalText === enLinksOnly[0].text) {
      const origA = el.querySelector('a');
      if (origA) {
        wholeBlockAnchorClass = origA.getAttribute('class');
        wholeBlockAnchorAttrs = {};
        for (const attr of ['target', 'rel', 'title', 'lang', 'hreflang']) {
          const v = origA.getAttribute(attr);
          if (v !== null && v !== undefined && v !== '') wholeBlockAnchorAttrs[attr] = v;
        }
      }
    }
  }

  if (matchedSpanIndexes.length > 0 || blockFootnotes.length > 0) {
    el.replaceChildren();
    const parts = rebuilt.split(/(___GC_SPAN_\d+___|___GC_FN_\d+___)/g);
    parts.forEach((part) => {
      const spanMatch = part.match(/^___GC_SPAN_(\d+)___$/);
      const fnMatch = part.match(/^___GC_FN_(\d+)___$/);
      if (spanMatch) {
        const spanIndex = parseInt(spanMatch[1], 10);
        const span = activeSpans[spanIndex];
        const spanEl = document.createElement(
          span.type === 'a' ? 'a'
            : span.type === 'strong' ? 'strong'
              : span.type === 'sup' ? 'sup'
                : span.type === 'sub' ? 'sub'
                  : span.type === 'span' ? 'span' : 'em'
        );
        if (span.type === 'a' && wholeBlockAnchorClass) {
          spanEl.setAttribute('class', wholeBlockAnchorClass);
          if (wholeBlockAnchorAttrs) {
            for (const [k, v] of Object.entries(wholeBlockAnchorAttrs)) spanEl.setAttribute(k, v);
          }
        }
        appendTextWithLineBreaks(spanEl, span.text);
        if (span.lang) {
          spanEl.setAttribute('lang', span.lang);
        }
        if (span.type === 'a') {
          if (span.isFragment) {
            spanEl.setAttribute('href', span.href || '#');
          } else if (span.isNodeLink) {
            spanEl.setAttribute('href', convertNodeHrefToFrench(span.href));
          } else if (span.href) {
            spanEl.setAttribute('href', formatFrenchRootRelativeLink(span.href));
          }
        }
        el.appendChild(spanEl);
      } else if (fnMatch) {
        const fnIndex = parseInt(fnMatch[1], 10);
        const fn = blockFootnotes[fnIndex];
        if (fn) {
          el.appendChild(createFrenchFootnoteNode(fn));
        }
      } else if (part) {
        appendTextWithLineBreaks(el, part);
      }
    });
    childLists.forEach((cl) => el.appendChild(cl));
    if (isTh) cleanThTags(el);
    if (isCaption) cleanCaptionTags(el);
    return { unresolvedLinks };
  }

  // Fallback: render clean text without appending any stray English spans
  el.replaceChildren();
  appendTextWithLineBreaks(el, newText);
  childLists.forEach((cl) => el.appendChild(cl));
  if (isTh) cleanThTags(el);
  if (isCaption) cleanCaptionTags(el);
  return { unresolvedLinks };
}

export {
  insertExtraFrenchElement,
  replaceBlockTextPreservingLinks,
};
