// Auto-generated imports
import {
  isHeadingTag,
  isOmittedEnglishEquivalentBlock,
  isPdfSidePanelElement,
} from './alignment.js';
import {
  issueSnippet,
} from './alignment-ops.js';
import {
  wholeBlockAnchorHref,
} from './block-utils.js';


// This tab is a REPORT, not a task list. It answers one question: where does
// the Word document's structure disagree with the English HTML, and which one
// does the French output use? The answer is always the English HTML, so nothing
// here is a defect and nothing here is fixable inside Symmetra — it is
// structural information about the two source documents.
//
// It used to be called "Mismatches" and to count only the unresolved rows,
// which implied two things that were both wrong: that these rows were problems
// (they are not — the output is correct), and that the other rows had been
// "resolved" (they have not; they are permanent facts that must be re-read if
// the English HTML changes).
//
// A heading difference is split by direction because the consequences differ:
//   'downgraded' Word styled it as a heading, English is a paragraph -> the
//                output keeps the paragraph, so the heading does not survive.
//                The one case with a visible cost, hence `lossy`.
//   'restored'   English is a heading, Word came through as plain text -> the
//                output applies the heading, so nothing is lost.
//   'level'      both headings, different depth -> output uses the English level.
//   'adapted'    by-design normalization (Word has no <li>/<div> semantics).
function classifyStyleMismatch(enTag, frTag) {
  const enIsHeading = isHeadingTag(enTag);
  const frIsHeading = isHeadingTag(frTag);
  if (frIsHeading && !enIsHeading) return 'downgraded';
  if (enIsHeading && !frIsHeading) return 'restored';
  if (enIsHeading && frIsHeading) return 'level';
  return 'adapted';
}

const MISMATCH_COPY = {
  downgraded: {
    badge: 'DROPPED',
    tone: 'warn',
    title: 'Heading not carried over — block #',
    note: 'The Word document styles this as a heading, so the French text is probably meant to introduce a section.',
    detail: (enTag, frTag) =>
      'The English HTML uses <' + enTag + '> here, so the French output does too. ' +
      'A heading in the French text becomes a paragraph. ' +
      'Your English HTML takes precedence; change it there if the heading is intended.',
  },
  restored: {
    badge: 'RESTORED',
    tone: 'info',
    title: 'Heading added from English HTML — block #',
    note: 'The Word document lost this heading style; the French output keeps it.',
    detail: (enTag) =>
      'The English HTML uses <' + enTag + '> and the Word paragraph came through as plain text, ' +
      'so the French output is formatted with the proper <' + enTag + '> structure. No difference in the result.',
  },
  level: {
    badge: 'LEVEL',
    tone: 'info',
    title: 'Heading depth differs — block #',
    note: 'Both sources treat this as a heading, at different levels.',
    detail: (enTag, frTag) =>
      'The English HTML uses <' + enTag + '> and the Word document uses <' + frTag + '>. ' +
      'The French output keeps the English <' + enTag + '> depth.',
  },
  adapted: {
    badge: 'ADAPTED',
    tone: 'info',
    title: 'Structure auto-adapted — block #',
    note: 'Expected: Word has no equivalent for some HTML elements.',
    detail: (enTag, frTag) =>
      'The English HTML uses <' + enTag + '> and the Word document uses <' + frTag + '>. ' +
      'The French output follows the English HTML.',
  },
};

// Anchor-link rows live in computeIssues below, reusing the shared helper.

function computeIssues(
  alignRows,
  enBlocks,
  frBlocks
) {
  const groups = {
    mismatch: [],
    missing: [],
    extra: [],
  };

  alignRows.forEach((row) => {
    const en = row.enIndex !== null ? enBlocks[row.enIndex] : null;
    const fr = row.frIndex !== null ? frBlocks[row.frIndex] : null;
    const isExpectedSummaryWordMapping = !!(en && fr && ((en.tag === 'summary' && (isHeadingTag(fr.tag) || fr.tag === 'p')) || (fr.tag === 'summary' && (isHeadingTag(en.tag) || en.tag === 'p'))));
    const mismatched = !!(en && fr && fr.tag !== en.tag && !isExpectedSummaryWordMapping);
    const noFr = row.frIndex === null;

    if (mismatched && row.enIndex !== null && en && fr) {
      if (isPdfSidePanelElement(en.el) && isPdfSidePanelElement(fr.el)) {
        // Handled as part of PDF side panel layout structure
        return;
      }
      const outcome = classifyStyleMismatch(en.tag, fr.tag);
      const copy = MISMATCH_COPY[outcome];
      groups.mismatch.push({
        category: 'mismatch',
        kind: 'jump-en',
        enIndex: row.enIndex,
        outcome,
        badge: copy.badge,
        tone: copy.tone,
        // Only a heading that does not survive into the French output has a
        // visible cost. It still is not a defect and still is not fixable in
        // the app — it only earns a distinct marker, not a task.
        lossy: outcome === 'downgraded',
        title: copy.title + (row.enIndex + 1),
        note: copy.note,
        detail: copy.detail(en.tag, fr.tag) + ' — "' + issueSnippet(en.text) + '"',
      });
    }
    // Anchor links carried into the French output. The Word text carries no
    // hyperlink, so conversion reuses the whole-block English anchor (table of
    // contents items, jump lists). Recorded for review only.
    if (row.enIndex !== null && row.frIndex !== null && en && fr) {
      const href = wholeBlockAnchorHref(en);
      if (href) {
        groups.mismatch.push({
          category: 'mismatch',
          kind: 'jump-en',
          enIndex: row.enIndex,
          outcome: 'link',
          badge: 'LINK',
          tone: 'info',
          lossy: false,
          title: 'Anchor link carried into French — block #' + (row.enIndex + 1),
          note: 'Review only: nothing to change. The anchor target comes from the English HTML.',
          detail: '"' + issueSnippet(fr.text, 60) + '" links to ' + href + ' — the Word document carries no hyperlink, so the French output reuses the English anchor.',
        });
      }
    }
    if (noFr && row.enIndex !== null && !row.skip && en) {
      if (isPdfSidePanelElement(en.el)) {
        // PDF side panel elements are web-only templates auto-localized separately
        return;
      }
      if (isOmittedEnglishEquivalentBlock(en)) {
        // English-only departmental equivalent or <br> segment not present in French Word doc
        return;
      }
      groups.missing.push({
        category: 'missing',
        kind: 'jump-en',
        enIndex: row.enIndex,
        title: 'No French match — block #' + (row.enIndex + 1),
        detail:
          '<' +
          en.tag +
          '> "' +
          issueSnippet(en.text) +
          '" — Filled with placeholder [TRANSLATION MISSING : ...] to preserve layout.',
      });
    }
  });

  alignRows
    .filter((r) => r.enIndex === null && r.frIndex !== null)
    .forEach((row) => {
      const fr = row.frIndex !== null ? frBlocks[row.frIndex] : null;
      if (row.frIndex !== null) {
        groups.extra.push({
          category: 'extra',
          kind: 'jump-fr',
          frIndex: row.frIndex,
          title: 'Extra French content — Word block #' + (row.frIndex + 1),
          detail:
            '<' +
            (fr ? fr.tag : '?') +
            '> "' +
            issueSnippet(fr ? fr.text : '') +
            '" — Inserted with indicator [EXTRA FRENCH CONTENT : ...] so no French content is lost.',
        });
      }
    });

  return groups;
}

export {
  computeIssues,
};
