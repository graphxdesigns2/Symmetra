import mammoth from 'mammoth';

// Sample data
const SAMPLE_EN_HTML = `<section>
  <h2>Employment insurance benefits and leave</h2>
  <p>Find information on Employment Insurance (EI) benefits, including sickness, maternity, and parental leave.</p>
  
  <h3>Eligibility requirements</h3>
  <p>To qualify for regular benefits, you must meet the following criteria:</p>
  <ul>
    <li>You were employed in insurable employment.</li>
    <li>You lost your job through no fault of your own.</li>
    <li>You have been without work and pay for at least 7 consecutive days.</li>
  </ul>

  <h3>How to apply</h3>
  <p>Submit your application online through the official portal. You should apply as soon as possible after you stop working.</p>
  
  <p>For more details, consult the <a href="https://www.canada.ca/en/services/benefits/ei.html">Employment Insurance overview</a>.</p>

  <div class="alert alert-info">
    <h4>Important notice</h4>
    <p>Always have your <strong>Social Insurance Number (SIN)</strong> ready before starting.</p>
  </div>
</section>`;

const SAMPLE_FR_DOCX_HTML = `<h2>Prestations d'assurance-emploi et congés</h2>
<p>Trouvez des renseignements sur les prestations d'assurance-emploi (AE), y compris les congés de maladie, de maternité et parentaux.</p>
<h3>Critères d'admissibilité</h3>
<p>Pour être admissible aux prestations régulières, vous devez répondre aux critères suivants :</p>
<ul>
  <li>Vous occupiez un emploi assurable.</li>
  <li>Vous avez perdu votre emploi sans en être responsable.</li>
  <li>Vous avez été sans travail et sans rémunération pendant au moins 7 jours consécutifs.</li>
</ul>
<h3>Comment présenter une demande</h3>
<p>Présentez votre demande en ligne par l'intermédiaire du portail officiel. Vous devez présenter votre demande dès que possible après avoir cessé de travailler.</p>
<p>Pour en savoir plus, consultez <a href="https://www.canada.ca/fr/services/prestations/ae.html">l'aperçu de l'assurance-emploi</a>.</p>
<h4>Avis important</h4>
<p>Ayez toujours votre <strong>numéro d'assurance sociale (NAS)</strong> à portée de main avant de commencer.</p>`;

// Symmetra Core Constants & Logic
const BLOCK_SELECTOR =
  'h2,h3,h4,h5,h6,p,li,dt,dd,td,th,figcaption,blockquote,caption,summary,img[alt],input[placeholder],input[aria-label],textarea[placeholder],button[aria-label]';

const SPAN_TAGS = ['a', 'strong', 'b', 'em', 'i'];

function spanType(tag) {
  if (tag === 'a') return 'a';
  if (tag === 'strong' || tag === 'b') return 'strong';
  return 'em';
}

function isLeafBlock(el) {
  const tagName = el.tagName.toLowerCase();
  if (['img', 'input', 'textarea', 'button'].includes(tagName)) return true;
  return !el.querySelector(BLOCK_SELECTOR);
}

function isClassificationMarking(text) {
  const words = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || words.length > 6) return false;
  const allowed = new Set([
    'unclassified', 'non', 'classifie', 'classifiee', 'protected',
    'protege', 'a', 'b', 'c', 'secret', 'top', 'confidential', 'confidentiel'
  ]);
  const core = [
    'unclassified', 'classifie', 'classifiee', 'protected',
    'protege', 'secret', 'confidential', 'confidentiel'
  ];
  return words.every((w) => allowed.has(w)) && words.some((w) => core.includes(w));
}

function isPlainUrlText(text) {
  const t = text.trim().replace(/[.,;:)\]\u00bb]+$/, '');
  if (!t) return false;
  return /^(https?:\/\/\S+|www\.\S+)$/i.test(t);
}

function getBlockContent(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'img') return el.getAttribute('alt') || '';
  if (['input', 'textarea'].includes(tag) && el.hasAttribute('placeholder'))
    return el.getAttribute('placeholder') || '';
  if (['input', 'button'].includes(tag) && el.hasAttribute('aria-label'))
    return el.getAttribute('aria-label') || '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function applyFrenchTypographyRules(text) {
  if (!text) return text;
  return text
    .replace(/(\s*)([:?!;])/g, '\u00A0$2')
    .replace(/«\s*/g, '«\u00A0')
    .replace(/\s*»/g, '\u00A0»');
}

function extractBlockSpans(el) {
  const tag = el.tagName.toLowerCase();
  if (SPAN_TAGS.includes(tag)) {
    const type = spanType(tag);
    return [
      {
        type,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        href: type === 'a' ? el.getAttribute('href') || '' : undefined,
      },
    ];
  }
  const found = Array.from(el.querySelectorAll(SPAN_TAGS.join(', ')));
  const foundSet = new Set(found);
  const topLevel = found.filter((n) => {
    let p = n.parentElement;
    while (p && p !== el) {
      if (foundSet.has(p)) return false;
      p = p.parentElement;
    }
    return true;
  });
  return topLevel
    .map((n) => {
      const type = spanType(n.tagName.toLowerCase());
      return {
        type,
        text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
        href: type === 'a' ? n.getAttribute('href') || '' : undefined,
      };
    })
    .filter((s) => s.text.length > 0);
}

function extractBlocks(rootEl) {
  const all = Array.from(rootEl.querySelectorAll(BLOCK_SELECTOR));
  return all
    .filter((el) => isLeafBlock(el))
    .map((el) => {
      const tag = el.tagName.toLowerCase();
      let attrTarget = 'text';
      if (tag === 'img') attrTarget = 'alt';
      else if (['input', 'textarea'].includes(tag) && el.hasAttribute('placeholder'))
        attrTarget = 'placeholder';
      else if (el.hasAttribute('aria-label')) attrTarget = 'aria-label';
      return {
        el,
        tag,
        attrTarget,
        text: getBlockContent(el),
        spans: extractBlockSpans(el),
      };
    })
    .filter((b) => b.text.length > 0)
    .filter((b) => !isClassificationMarking(b.text))
    .filter((b) => !isPlainUrlText(b.text));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isFragmentHref(href) {
  return typeof href === 'string' && href.trim().startsWith('#');
}

function replaceBlockTextPreservingLinks(
  el,
  newText,
  attrTarget = 'text',
  frSpans = []
) {
  newText = applyFrenchTypographyRules(newText);
  if (attrTarget !== 'text') {
    el.setAttribute(attrTarget, newText);
    return { unresolvedLinks: 0 };
  }
  const blockTag = el.tagName.toLowerCase();
  if (SPAN_TAGS.includes(blockTag)) {
    if (blockTag === 'a') {
      const originalHref = el.getAttribute('href') || '';
      el.textContent = newText;
      if (isFragmentHref(originalHref)) return { unresolvedLinks: 0 };
      const frLink = frSpans.find((s) => s.type === 'a');
      if (frLink && frLink.href) {
        el.setAttribute('href', frLink.href);
        return { unresolvedLinks: 0 };
      }
      return { unresolvedLinks: 1 };
    }
    el.textContent = newText;
    return { unresolvedLinks: 0 };
  }
  const oldSpans = extractBlockSpans(el);
  if (!oldSpans.length) {
    el.textContent = newText;
    return { unresolvedLinks: 0 };
  }
  const originalText = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (oldSpans.length === 1 && originalText === oldSpans[0].text) {
    const span = oldSpans[0];
    if (span.type === 'a') {
      const originalHref = el.querySelector('a')?.getAttribute('href') || '';
      const aElem = document.createElement('a');
      aElem.textContent = newText;
      if (isFragmentHref(originalHref)) {
        aElem.setAttribute('href', originalHref);
        el.replaceChildren(aElem);
        return { unresolvedLinks: 0 };
      }
      const frLink = frSpans.find((s) => s.type === 'a');
      if (frLink && frLink.href) {
        aElem.setAttribute('href', frLink.href);
        el.replaceChildren(aElem);
        return { unresolvedLinks: 0 };
      }
      el.replaceChildren(document.createTextNode(newText));
      return { unresolvedLinks: 1 };
    }
    const tagElem = document.createElement(span.type === 'strong' ? 'strong' : 'em');
    tagElem.textContent = newText;
    el.replaceChildren(tagElem);
    return { unresolvedLinks: 0 };
  }

  const typeCounters = {};
  const spansMeta = oldSpans.map((span) => {
    const n = typeCounters[span.type] || 0;
    const sameTypeFr = frSpans.filter((s) => s.type === span.type);
    const frMatch = sameTypeFr[n] || null;
    typeCounters[span.type] = n + 1;
    const origA = el.querySelector(`a`);
    const isFrag = span.type === 'a' && isFragmentHref(origA?.getAttribute('href') || '');
    return {
      ...span,
      frMatch,
      isFragment: isFrag,
      matchedText: '',
    };
  });

  const placeholders = spansMeta.map((_, i) => `___GC_SPAN_${i}___`);
  let rebuilt = newText;
  spansMeta.forEach((span, i) => {
    const candidates = [span.frMatch && span.frMatch.text, span.text].filter(Boolean);
    for (const candidate of candidates) {
      const escaped = escapeRegExp(candidate);
      const regex = new RegExp(escaped, 'i');
      if (regex.test(rebuilt)) {
        rebuilt = rebuilt.replace(regex, placeholders[i]);
        span.matchedText = candidate;
        break;
      }
    }
  });

  if (spansMeta.every((_, i) => rebuilt.includes(placeholders[i]))) {
    el.replaceChildren();
    const parts = rebuilt.split(/(___GC_SPAN_\d+___)/g);
    let unresolved = 0;
    parts.forEach((part) => {
      const match = part.match(/^___GC_SPAN_(\d+)___$/);
      if (match) {
        const span = spansMeta[parseInt(match[1], 10)];
        const spanEl = document.createElement(
          span.type === 'a' ? 'a' : span.type === 'strong' ? 'strong' : 'em'
        );
        spanEl.textContent = span.matchedText || span.text;
        if (span.type === 'a') {
          if (span.isFragment) {
            spanEl.setAttribute('href', span.href || '#');
          } else if (span.frMatch && span.frMatch.href) {
            spanEl.setAttribute('href', span.frMatch.href);
          } else {
            unresolved++;
          }
        }
        el.appendChild(spanEl);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
    return { unresolvedLinks: unresolved };
  }

  el.replaceChildren(document.createTextNode(newText));
  let unresolved = 0;
  spansMeta.forEach((span) => {
    if (span.type === 'a' && !span.isFragment && !(span.frMatch && span.frMatch.href)) {
      unresolved++;
      return;
    }
    const label = span.matchedText || (span.frMatch && span.frMatch.text) || span.text;
    const spanEl = document.createElement(
      span.type === 'a' ? 'a' : span.type === 'strong' ? 'strong' : 'em'
    );
    if (label) spanEl.textContent = label;
    if (span.type === 'a' && !span.isFragment && span.frMatch && span.frMatch.href) {
      spanEl.setAttribute('href', span.frMatch.href);
    }
    el.appendChild(document.createTextNode(' '));
    el.appendChild(spanEl);
  });
  return { unresolvedLinks: unresolved };
}

function alignByTag(enTags, frTags) {
  const n = enTags.length;
  const m = frTags.length;
  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  if (n * m > 4000000) {
    const len = Math.max(n, m);
    const pairs = [];
    for (let i = 0; i < len; i++) {
      pairs.push({ enIndex: i < n ? i : null, frIndex: i < m ? i : null, skip: false });
    }
    return pairs;
  }

  const score = new Array(n + 1);
  for (let i = 0; i <= n; i++) score[i] = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) score[i][0] = score[i - 1][0] + GAP;
  for (let j = 1; j <= m; j++) score[0][j] = score[0][j - 1] + GAP;

  for (let i = 1; i <= n; i++) {
    const rowCur = score[i];
    const rowPrev = score[i - 1];
    for (let j = 1; j <= m; j++) {
      const diag = rowPrev[j - 1] + (enTags[i - 1] === frTags[j - 1] ? MATCH : MISMATCH);
      const up = rowPrev[j] + GAP;
      const left = rowCur[j - 1] + GAP;
      rowCur[j] = Math.max(diag, up, left);
    }
  }

  let i = n;
  let j = m;
  const pairs = [];

  while (i > 0 && j > 0) {
    const cur = score[i][j];
    const diagVal = score[i - 1][j - 1] + (enTags[i - 1] === frTags[j - 1] ? MATCH : MISMATCH);
    if (cur === diagVal) {
      pairs.push({ enIndex: i - 1, frIndex: j - 1, skip: false });
      i--;
      j--;
    } else if (cur === score[i - 1][j] + GAP) {
      pairs.push({ enIndex: i - 1, frIndex: null, skip: false });
      i--;
    } else {
      pairs.push({ enIndex: null, frIndex: j - 1, skip: false });
      j--;
    }
  }

  while (i > 0) {
    pairs.push({ enIndex: --i, frIndex: null, skip: false });
  }
  while (j > 0) {
    pairs.push({ enIndex: null, frIndex: --j, skip: false });
  }
  pairs.reverse();
  return pairs;
}

function isHeadingTag(tag) {
  return /^h[1-6]$/.test(tag);
}

function describeStyleMismatch(enTag, frTag) {
  const enHeading = isHeadingTag(enTag);
  const frHeading = isHeadingTag(frTag);
  if (enHeading && !frHeading) {
    return (
      'The English HTML has this as a heading (<' +
      enTag +
      '>), but the matching paragraph in the French Word document isn\'t styled as a heading — it came through as plain text (<' +
      frTag +
      '>). In Word, apply the Heading ' +
      enTag.slice(1) +
      ' style to this paragraph so it matches.'
    );
  }
  if (!enHeading && frHeading) {
    return (
      'The matching paragraph in the French Word document is styled as a heading (<' +
      frTag +
      '>), but the English HTML has this as plain text (<' +
      enTag +
      '>). Double-check whether the Word paragraph should be a heading, or if the style was applied by mistake.'
    );
  }
  if (enHeading && frHeading) {
    return (
      'Heading level mismatch: the English HTML uses <' +
      enTag +
      '> but the French Word paragraph is styled as <' +
      frTag +
      '>. Apply the same heading level in Word.'
    );
  }
  return (
    'The English HTML has this as <' +
    enTag +
    '>, but the matching French Word paragraph came through as <' +
    frTag +
    '>. Check the paragraph style applied in Word.'
  );
}

function issueSnippet(text, max = 80) {
  if (!text) return '(empty)';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '(empty)';
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function computeIssues(
  alignRows,
  enBlocks,
  frBlocks,
  linkIssueRows = []
) {
  const groups = {
    mismatch: [],
    missing: [],
    extra: [],
    links: [],
  };

  alignRows.forEach((row) => {
    const en = row.enIndex !== null ? enBlocks[row.enIndex] : null;
    const fr = row.frIndex !== null ? frBlocks[row.frIndex] : null;
    const mismatched = !!(en && fr && fr.tag !== en.tag);
    const noFr = row.frIndex === null;

    if (mismatched && row.enIndex !== null && en && fr) {
      groups.mismatch.push({
        category: 'mismatch',
        kind: 'jump-en',
        enIndex: row.enIndex,
        title: 'Style mismatch — block #' + (row.enIndex + 1),
        detail:
          describeStyleMismatch(en.tag, fr.tag) +
          ' — "' +
          issueSnippet(en.text) +
          '"',
      });
    }
    if (noFr && row.enIndex !== null && !row.skip && en) {
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
          '" has no matching French content in document.',
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
          kind: 'none',
          frIndex: row.frIndex,
          title: 'Extra French content — Word block #' + (row.frIndex + 1),
          detail:
            '<' +
            (fr ? fr.tag : '?') +
            '> "' +
            issueSnippet(fr ? fr.text : '') +
            '" was not used — no matching English block in HTML structure.',
        });
      }
    });

  linkIssueRows.forEach((row) => {
    const en = enBlocks[row.enIndex];
    groups.links.push({
      category: 'links',
      kind: 'jump-en',
      enIndex: row.enIndex,
      title: 'Link needs review — block #' + (row.enIndex + 1),
      detail:
        row.count +
        ' link(s) in this block have no matching French URL, so the link was dropped (plain text kept). Add the correct French URL, or hyperlink the term in the .docx and re-upload.' +
        (en ? ' — "' + issueSnippet(en.text) + '"' : ''),
    });
  });

  return groups;
}

function parseEnHtml(raw) {
  raw = raw.trim();
  if (!raw) return { ok: false, msg: 'Paste or provide HTML source first.' };
  const hasHtmlTag = /<html[\s>]/i.test(raw);
  const parser = new DOMParser();
  let doc;
  let root;
  let isFullDoc = false;

  if (hasHtmlTag) {
    doc = parser.parseFromString(raw, 'text/html');
    root = doc.body;
    isFullDoc = true;
  } else {
    doc = parser.parseFromString('<html><body></body></html>', 'text/html');
    doc.body.innerHTML = raw;
    root = doc.body;
    isFullDoc = false;
  }

  const parseErr = doc.querySelector('parsererror');
  const blocks = extractBlocks(root);
  if (blocks.length === 0) {
    return {
      ok: false,
      msg: 'No headings, paragraphs, list items, or table cells found in HTML.',
    };
  }

  return {
    ok: true,
    count: blocks.length,
    warn: !!parseErr,
    blocks,
    isFullDoc,
    rawHtml: raw,
  };
}

const HIGHLIGHT_CSS = `
:root {
  --gc-bg: #121316;
  --gc-text: #f3f4f6;
  --gc-text-muted: #9ca3af;
  --gc-heading: #ffffff;
  --gc-link: #60a5fa;
  --gc-link-hover: #93c5fd;
  --gc-border: #2e3440;
  --gc-card-bg: #1a1d24;
}

body.gc-light-mode {
  --gc-bg: #ffffff;
  --gc-text: #333333;
  --gc-text-muted: #555555;
  --gc-heading: #333333;
  --gc-link: #284162;
  --gc-link-hover: #0535d2;
  --gc-border: #dcdcdc;
  --gc-card-bg: #f9f9f9;
}

html, body {
  background: var(--gc-bg) !important;
  color: var(--gc-text) !important;
}

body {
  padding: 34px !important;
  padding-top: 28vh !important;
  padding-bottom: 28vh !important;
  font-family: "Noto Sans", "Helvetica Neue", Arial, sans-serif !important;
  font-size: 16px !important;
  line-height: 1.5 !important;
  margin: 0;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}

body * {
  font-family: inherit !important;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700 !important;
  line-height: 1.2 !important;
  color: var(--gc-heading) !important;
}

a {
  color: var(--gc-link) !important;
  text-decoration: underline !important;
}
a:visited {
  color: var(--gc-link) !important;
}
a:hover, a:focus {
  color: var(--gc-link-hover) !important;
}

.alert, section.alert, div.alert {
  padding: 15px 20px !important;
  margin-bottom: 23px !important;
  margin-top: 1em !important;
  border: 1px solid transparent !important;
  border-left: 6px solid #269abc !important;
  border-radius: 4px !important;
  background-color: transparent !important;
  background: transparent !important;
  color: var(--gc-text, #f3f4f6) !important;
}

.alert h1, .alert h2, .alert h3, .alert h4, .alert h5, .alert h6,
.alert > h1, .alert > h2, .alert > h3, .alert > h4, .alert > h5, .alert > h6 {
  margin-top: 0 !important;
  margin-bottom: 0.5em !important;
  font-weight: 700 !important;
  color: #ffffff !important;
}

.alert p, .alert li, .alert span, .alert div {
  color: var(--gc-text, #e2e8f0) !important;
}

.alert-info, section.alert-info, div.alert-info {
  background-color: transparent !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-left: 6px solid #269abc !important;
  color: var(--gc-text, #f3f4f6) !important;
}
.alert-info h1, .alert-info h2, .alert-info h3, .alert-info h4, .alert-info h5, .alert-info h6,
.alert-info > h1, .alert-info > h2, .alert-info > h3, .alert-info > h4, .alert-info > h5, .alert-info > h6 {
  margin-top: 0 !important;
  margin-bottom: 0.5em !important;
  font-weight: 700 !important;
  color: #ffffff !important;
}
.alert-info p, .alert-info li, .alert-info span, .alert-info div {
  color: var(--gc-text, #e2e8f0) !important;
}

.alert-warning, section.alert-warning, div.alert-warning {
  background-color: rgba(245, 158, 11, 0.14) !important;
  border: 1px solid rgba(245, 158, 11, 0.28) !important;
  border-left: 6px solid #f59e0b !important;
  color: #fefce8 !important;
}
.alert-warning h1, .alert-warning h2, .alert-warning h3, .alert-warning h4, .alert-warning h5, .alert-warning h6,
.alert-warning > h1, .alert-warning > h2, .alert-warning > h3, .alert-warning > h4, .alert-warning > h5, .alert-warning > h6 {
  color: #fbbf24 !important;
}

.alert-danger, section.alert-danger, div.alert-danger {
  background-color: rgba(239, 68, 68, 0.14) !important;
  border: 1px solid rgba(239, 68, 68, 0.28) !important;
  border-left: 6px solid #ef4444 !important;
  color: #fef2f2 !important;
}
.alert-danger h1, .alert-danger h2, .alert-danger h3, .alert-danger h4, .alert-danger h5, .alert-danger h6,
.alert-danger > h1, .alert-danger > h2, .alert-danger > h3, .alert-danger > h4, .alert-danger > h5, .alert-danger > h6 {
  color: #f87171 !important;
}

.alert-success, section.alert-success, div.alert-success {
  background-color: rgba(34, 197, 94, 0.14) !important;
  border: 1px solid rgba(34, 197, 94, 0.28) !important;
  border-left: 6px solid #22c55e !important;
  color: #f0fdf4 !important;
}
.alert-success h1, .alert-success h2, .alert-success h3, .alert-success h4, .alert-success h5, .alert-success h6,
.alert-success > h1, .alert-success > h2, .alert-success > h3, .alert-success > h4, .alert-success > h5, .alert-success > h6 {
  color: #4ade80 !important;
}

body.gc-light-mode .alert,
body.gc-light-mode section.alert,
body.gc-light-mode div.alert {
  background-color: transparent !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-left: 6px solid #269abc !important;
  color: #333333 !important;
}
body.gc-light-mode .alert h1, body.gc-light-mode .alert h2, body.gc-light-mode .alert h3, body.gc-light-mode .alert h4, body.gc-light-mode .alert h5, body.gc-light-mode .alert h6,
body.gc-light-mode .alert > h1, body.gc-light-mode .alert > h2, body.gc-light-mode .alert > h3, body.gc-light-mode .alert > h4, body.gc-light-mode .alert > h5, body.gc-light-mode .alert > h6 {
  color: #000000 !important;
}
body.gc-light-mode .alert p, body.gc-light-mode .alert li, body.gc-light-mode .alert span, body.gc-light-mode .alert div {
  color: #333333 !important;
}

body.gc-light-mode .alert-info,
body.gc-light-mode section.alert-info,
body.gc-light-mode div.alert-info {
  background-color: transparent !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-left: 6px solid #269abc !important;
  color: #333333 !important;
}
body.gc-light-mode .alert-info h1, body.gc-light-mode .alert-info h2, body.gc-light-mode .alert-info h3, body.gc-light-mode .alert-info h4, body.gc-light-mode .alert-info h5, body.gc-light-mode .alert-info h6,
body.gc-light-mode .alert-info > h1, body.gc-light-mode .alert-info > h2, body.gc-light-mode .alert-info > h3, body.gc-light-mode .alert-info > h4, body.gc-light-mode .alert-info > h5, body.gc-light-mode .alert-info > h6 {
  color: #000000 !important;
}
body.gc-light-mode .alert-info p, body.gc-light-mode .alert-info li, body.gc-light-mode .alert-info span, body.gc-light-mode .alert-info div {
  color: #333333 !important;
}

body.gc-light-mode .alert-warning {
  background-color: #fcf8e3 !important;
  border: 1px solid #faebcc !important;
  border-left: 6px solid #ee7100 !important;
  color: #8a6d3b !important;
}
body.gc-light-mode .alert-warning h1, body.gc-light-mode .alert-warning h2, body.gc-light-mode .alert-warning h3, body.gc-light-mode .alert-warning h4, body.gc-light-mode .alert-warning h5, body.gc-light-mode .alert-warning h6,
body.gc-light-mode .alert-warning p, body.gc-light-mode .alert-warning li, body.gc-light-mode .alert-warning span {
  color: #8a6d3b !important;
}

body.gc-light-mode .alert-danger {
  background-color: #f2dede !important;
  border: 1px solid #ebccd1 !important;
  border-left: 6px solid #d3080c !important;
  color: #a94442 !important;
}
body.gc-light-mode .alert-danger h1, body.gc-light-mode .alert-danger h2, body.gc-light-mode .alert-danger h3, body.gc-light-mode .alert-danger h4, body.gc-light-mode .alert-danger h5, body.gc-light-mode .alert-danger h6,
body.gc-light-mode .alert-danger p, body.gc-light-mode .alert-danger li, body.gc-light-mode .alert-danger span {
  color: #a94442 !important;
}

body.gc-light-mode .alert-success {
  background-color: #dff0d8 !important;
  border: 1px solid #d6e9c6 !important;
  border-left: 6px solid #278400 !important;
  color: #3c763d !important;
}
body.gc-light-mode .alert-success h1, body.gc-light-mode .alert-success h2, body.gc-light-mode .alert-success h3, body.gc-light-mode .alert-success h4, body.gc-light-mode .alert-success h5, body.gc-light-mode .alert-success h6,
body.gc-light-mode .alert-success p, body.gc-light-mode .alert-success li, body.gc-light-mode .alert-success span {
  color: #3c763d !important;
}

.panel {
  margin-bottom: 23px !important;
  background-color: #1e2430 !important;
  border: 1px solid #334155 !important;
  border-radius: 4px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
}
body.gc-light-mode .panel {
  background-color: #ffffff !important;
  border: 1px solid #dddddd !important;
  box-shadow: 0 1px 1px rgba(0,0,0,.05) !important;
}

.panel-heading {
  padding: 10px 15px !important;
  border-bottom: 1px solid #334155 !important;
  border-top-right-radius: 3px !important;
  border-top-left-radius: 3px !important;
  background-color: #161a22 !important;
  color: #ffffff !important;
}
body.gc-light-mode .panel-heading {
  background-color: #f5f5f5 !important;
  border-bottom-color: #dddddd !important;
  color: #333333 !important;
}

.panel-title {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  color: inherit !important;
}

.panel-body {
  padding: 15px !important;
  color: var(--gc-text) !important;
}

.panel-footer {
  padding: 10px 15px !important;
  background-color: #161a22 !important;
  border-top: 1px solid #334155 !important;
  border-bottom-right-radius: 3px !important;
  border-bottom-left-radius: 3px !important;
  color: #94a3b8 !important;
}
body.gc-light-mode .panel-footer {
  background-color: #f5f5f5 !important;
  border-top-color: #dddddd !important;
  color: #555555 !important;
}

.panel-primary { border-color: #26374a !important; }
.panel-primary > .panel-heading { background-color: #26374a !important; color: #ffffff !important; border-color: #26374a !important; }

.panel-info { border-color: #269abc !important; }
.panel-info > .panel-heading { background-color: rgba(0, 180, 216, 0.2) !important; color: #38bdf8 !important; border-color: #269abc !important; }

.panel-warning { border-color: #ee7100 !important; }
.panel-warning > .panel-heading { background-color: rgba(245, 158, 11, 0.2) !important; color: #fbbf24 !important; border-color: #ee7100 !important; }

.panel-danger { border-color: #d3080c !important; }
.panel-danger > .panel-heading { background-color: rgba(239, 68, 68, 0.2) !important; color: #f87171 !important; border-color: #d3080c !important; }

.panel-success { border-color: #278400 !important; }
.panel-success > .panel-heading { background-color: rgba(34, 197, 94, 0.2) !important; color: #4ade80 !important; border-color: #278400 !important; }

.well {
  min-height: 20px !important;
  padding: 19px !important;
  margin-bottom: 20px !important;
  background-color: #1e2430 !important;
  border: 1px solid #334155 !important;
  border-radius: 4px !important;
  box-shadow: inset 0 1px 1px rgba(0,0,0,.05) !important;
  color: var(--gc-text) !important;
}
body.gc-light-mode .well {
  background-color: #f5f5f5 !important;
  border: 1px solid #e3e3e3 !important;
  color: #333333 !important;
}
.well-sm { padding: 9px !important; border-radius: 3px !important; }
.well-lg { padding: 24px !important; border-radius: 6px !important; }
.well-header { border-left: 6px solid #26374a !important; }

table, .table {
  width: 100% !important;
  max-width: 100% !important;
  margin-bottom: 23px !important;
  border-collapse: collapse !important;
  border-color: #334155 !important;
  color: var(--gc-text) !important;
}
body.gc-light-mode table, body.gc-light-mode .table {
  border-color: #dddddd !important;
}

th, td, .table th, .table td {
  padding: 8px 12px !important;
  line-height: 1.45 !important;
  vertical-align: top !important;
  border-top: 1px solid #334155 !important;
}
body.gc-light-mode th, body.gc-light-mode td, body.gc-light-mode .table th, body.gc-light-mode .table td {
  border-top: 1px solid #dddddd !important;
}

th, .table th {
  vertical-align: bottom !important;
  border-bottom: 2px solid #475569 !important;
  font-weight: 700 !important;
  background-color: #1a202c !important;
  color: #ffffff !important;
}
body.gc-light-mode th, body.gc-light-mode .table th {
  border-bottom: 2px solid #dddddd !important;
  background-color: #f5f5f5 !important;
  color: #333333 !important;
}

.table-striped tbody tr:nth-of-type(odd) {
  background-color: rgba(255, 255, 255, 0.03) !important;
}
body.gc-light-mode .table-striped tbody tr:nth-of-type(odd) {
  background-color: #f9f9f9 !important;
}

.table-bordered, .table-bordered th, .table-bordered td {
  border: 1px solid #334155 !important;
}
body.gc-light-mode .table-bordered, body.gc-light-mode .table-bordered th, body.gc-light-mode .table-bordered td {
  border: 1px solid #dddddd !important;
}

.table-hover tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.06) !important;
}
body.gc-light-mode .table-hover tbody tr:hover {
  background-color: #f5f5f5 !important;
}

.btn {
  display: inline-block !important;
  margin-bottom: 0 !important;
  font-weight: 700 !important;
  text-align: center !important;
  vertical-align: middle !important;
  cursor: pointer !important;
  border: 1px solid transparent !important;
  white-space: nowrap !important;
  padding: 6px 14px !important;
  font-size: 16px !important;
  line-height: 1.45 !important;
  border-radius: 4px !important;
  text-decoration: none !important;
  transition: all 0.15s ease-in-out !important;
}

.btn-default {
  color: #f1f5f9 !important;
  background-color: #334155 !important;
  border-color: #475569 !important;
}
body.gc-light-mode .btn-default {
  color: #333333 !important;
  background-color: #eaebed !important;
  border-color: #dcdee1 !important;
}

.btn-primary {
  color: #ffffff !important;
  background-color: #26374a !important;
  border-color: #26374a !important;
}

.btn-call-to-action, .btn-success {
  color: #ffffff !important;
  background-color: #318000 !important;
  border-color: #318000 !important;
}

.btn-info {
  color: #ffffff !important;
  background-color: #269abc !important;
  border-color: #269abc !important;
}

.btn-warning {
  color: #ffffff !important;
  background-color: #ee7100 !important;
  border-color: #ee7100 !important;
}

.btn-danger {
  color: #ffffff !important;
  background-color: #d3080c !important;
  border-color: #d3080c !important;
}

.label {
  display: inline !important;
  padding: .2em .6em .3em !important;
  font-size: 75% !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  color: #ffffff !important;
  text-align: center !important;
  white-space: nowrap !important;
  vertical-align: baseline !important;
  border-radius: .25em !important;
}
.label-default { background-color: #64748b !important; }
.label-primary { background-color: #26374a !important; }
.label-success { background-color: #278400 !important; }
.label-info { background-color: #269abc !important; }
.label-warning { background-color: #ee7100 !important; }
.label-danger { background-color: #d3080c !important; }

.badge {
  display: inline-block !important;
  min-width: 10px !important;
  padding: 3px 8px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  color: #ffffff !important;
  text-align: center !important;
  white-space: nowrap !important;
  vertical-align: middle !important;
  background-color: #64748b !important;
  border-radius: 10px !important;
}

blockquote {
  padding: 10px 20px !important;
  margin: 0 0 20px !important;
  font-size: 17.5px !important;
  border-left: 5px solid #6366f1 !important;
  background: rgba(99, 102, 241, 0.08) !important;
  color: var(--gc-text) !important;
  font-style: italic !important;
}
body.gc-light-mode blockquote {
  border-left: 5px solid #eeeeee !important;
  background: #f9f9f9 !important;
}

code, kbd, pre, samp {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace !important;
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #38bdf8 !important;
  border-radius: 3px !important;
}
body.gc-light-mode code, body.gc-light-mode kbd, body.gc-light-mode samp {
  background-color: #f5f5f5 !important;
  color: #c7254e !important;
}
code { padding: 2px 5px !important; }
pre { padding: 12px !important; margin-bottom: 15px !important; overflow-x: auto !important; }

details {
  border: 1px solid #334155 !important;
  background-color: rgba(255, 255, 255, 0.03) !important;
  border-radius: 4px !important;
  padding: 10px 14px !important;
  margin-bottom: 15px !important;
}
body.gc-light-mode details {
  border: 1px solid #cccccc !important;
  background-color: #ffffff !important;
}
summary {
  font-weight: 700 !important;
  color: var(--gc-link) !important;
  cursor: pointer !important;
  outline: none !important;
}
summary:hover {
  text-decoration: underline !important;
}

.mrgn-tp-0 { margin-top: 0 !important; }
.mrgn-tp-sm { margin-top: 5px !important; }
.mrgn-tp-md { margin-top: 15px !important; }
.mrgn-tp-lg { margin-top: 30px !important; }
.mrgn-tp-xl { margin-top: 50px !important; }
.mrgn-bttm-0 { margin-bottom: 0 !important; }
.mrgn-bttm-sm { margin-bottom: 5px !important; }
.mrgn-bttm-md { margin-bottom: 15px !important; }
.mrgn-bttm-lg { margin-bottom: 30px !important; }
.mrgn-bttm-xl { margin-bottom: 50px !important; }
.mrgn-lft-0 { margin-left: 0 !important; }
.mrgn-rght-0 { margin-right: 0 !important; }

.pagedetails {
  font-size: 14px !important;
  color: var(--gc-text-muted) !important;
  margin-top: 30px !important;
  border-top: 1px solid var(--gc-border) !important;
  padding-top: 10px !important;
}
.gc-subway {
  border-left: 4px solid #26374a !important;
  padding-left: 15px !important;
  margin-bottom: 20px !important;
}

[data-swap-index] {
  transition: opacity .2s ease, filter .2s ease, outline .15s ease;
  position: relative;
}

.gc-swap-editable:hover {
  cursor: text;
}
.gc-swap-editable:focus {
  outline: 2px solid #8b5cf6 !important;
  background: transparent !important;
}

.gc-swap-active {
  outline: 1px solid #8b5cf6 !important;
  outline-offset: 3px;
  background: transparent !important;
}

body.mode-focus [data-swap-index] {
  opacity: .3;
}
body.mode-focus .gc-swap-active {
  opacity: 1 !important;
}

body.mode-blur [data-swap-index] {
  filter: blur(3px);
}
body.mode-blur .gc-swap-active {
  filter: none !important;
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: #191919; }
::-webkit-scrollbar-thumb { background: #6258d9; border-radius: 8px; border: 2px solid #191919; }
::-webkit-scrollbar-thumb:hover { background: #8278ee; }
* { scrollbar-width: thin; scrollbar-color: #6258d9 #191919; }
`;

// App State
const state = {
  theme: 'light',
  enHtml: '',
  enBlocks: [],
  enParsed: null,
  frDocxName: '',
  frBlocks: [],
  alignRows: [],
  alignPairs: [],
  issueGroups: { mismatch: [], missing: [], extra: [], links: [] },
  activeCategory: 'mismatch',
  drawerOpen: false,
  activePreviewBlock: 0,
  syncOffset: 0,
  autoSync: true,
  syncPaused: false,
  focusMode: false,
  blurMode: false,
  outputHtml: '',
  outputTab: 'preview', // 'preview' | 'code'
};

// DOM Element References
const themeToggle = document.getElementById('themeToggle');
const themeThumbIcon = document.getElementById('themeThumbIcon');
const htmlInput = document.getElementById('htmlInput');
const clearHtmlBtn = document.getElementById('clearHtmlBtn');
const parseHtmlBtn = document.getElementById('parseHtmlBtn');
const loadSampleEnBtn = document.getElementById('loadSampleEnBtn');
const htmlStat = document.getElementById('htmlStat');

const dropzone = document.getElementById('dropzone');
const dropzoneMain = document.getElementById('dropzoneMain');
const docxFile = document.getElementById('docxFile');
const docxStatWrap = document.getElementById('docxStatWrap');
const loadSampleFrBtn = document.getElementById('loadSampleFrBtn');

const alignBtn = document.getElementById('alignBtn');
const previewSection = document.getElementById('previewSection');
const toggleFocusMode = document.getElementById('toggleFocusMode');
const toggleBlurMode = document.getElementById('toggleBlurMode');
const toggleAutoSync = document.getElementById('toggleAutoSync');
const rightBack = document.getElementById('rightBack');
const rightForward = document.getElementById('rightForward');
const resetSyncOffset = document.getElementById('resetSyncOffset');
const exportFromViewBtn = document.getElementById('exportFromViewBtn');

const enBlockCountBadge = document.getElementById('enBlockCountBadge');
const frBlockCountBadge = document.getElementById('frBlockCountBadge');
const enSyncStatus = document.getElementById('enSyncStatus');
const frSyncStatus = document.getElementById('frSyncStatus');
const enPreviewFrame = document.getElementById('enPreviewFrame');
const frPreviewFrame = document.getElementById('frPreviewFrame');

const statDetailPanel = document.getElementById('statDetailPanel');
const drawerBody = document.getElementById('drawerBody');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');

const healthPill = document.getElementById('healthPill');
const healthPillText = document.getElementById('healthPillText');
const cEn = document.getElementById('cEn');
const cFr = document.getElementById('cFr');
const cMismatch = document.getElementById('cMismatch');
const cMissing = document.getElementById('cMissing');
const cExtra = document.getElementById('cExtra');
const cSkip = document.getElementById('cSkip');

const activeBlockHudText = document.getElementById('activeBlockHudText');
const activeBlockHudTag = document.getElementById('activeBlockHudTag');
const blockJumpToggleBtn = document.getElementById('blockJumpToggleBtn');
const prevBlockBtn = document.getElementById('prevBlockBtn');
const nextBlockBtn = document.getElementById('nextBlockBtn');
const jumpForm = document.getElementById('jumpForm');
const jumpInput = document.getElementById('jumpInput');
const syncOffsetBadge = document.getElementById('syncOffsetBadge');

const generateBtn = document.getElementById('generateBtn');
const outputSection = document.getElementById('outputSection');
const tabPreview = document.getElementById('tabPreview');
const tabCode = document.getElementById('tabCode');
const previewFrame = document.getElementById('previewFrame');
const codeOut = document.getElementById('codeOut');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
const toast = document.getElementById('toast');

// Toast helper
let toastTimer = null;
function showToast(msg, duration = 3000) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('symmetra-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  state.theme = saved ? saved : prefersDark ? 'dark' : 'light';
  applyTheme(state.theme);
}

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('symmetra-theme', theme);
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  
  if (themeToggle) {
    themeToggle.classList.toggle('is-dark', isDark);
    themeToggle.classList.toggle('is-light', !isDark);
    themeToggle.setAttribute('aria-checked', isDark ? 'true' : 'false');
    themeToggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  if (themeThumbIcon) {
    if (isDark) {
      themeThumbIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
      themeThumbIcon.className = 'w-3 h-3 text-purple-400';
    } else {
      themeThumbIcon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
      themeThumbIcon.className = 'w-3 h-3 text-amber-500';
    }
  }

  // Update preview iframes theme
  updateIframesTheme();
}

function updateIframesTheme() {
  [enPreviewFrame, frPreviewFrame].forEach((frame) => {
    if (frame && frame.contentDocument && frame.contentDocument.body) {
      if (state.theme === 'light') {
        frame.contentDocument.body.classList.add('gc-light-mode');
      } else {
        frame.contentDocument.body.classList.remove('gc-light-mode');
      }
    }
  });
}

// English HTML Input handlers
function updateHtmlState() {
  const val = htmlInput.value.trim();
  state.enHtml = val;
  clearHtmlBtn.disabled = !val;
  parseHtmlBtn.disabled = !val;
  checkAlignReady();
}

function analyzeEnglishHtml() {
  const val = htmlInput.value.trim();
  if (!val) {
    htmlStat.textContent = '';
    state.enBlocks = [];
    state.enParsed = null;
    checkAlignReady();
    return;
  }

  const res = parseEnHtml(val);
  if (!res.ok) {
    htmlStat.innerHTML = `<span class="text-rose-500 font-semibold">${res.msg}</span>`;
    state.enBlocks = [];
    state.enParsed = null;
  } else {
    state.enBlocks = res.blocks;
    state.enParsed = res;
    htmlStat.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">${res.count} text block(s) found</span>`;
  }
  checkAlignReady();
}

// French Word Document parsing
function parseFrDocxHtml(rawDocxHtml, filename = 'Uploaded Document.docx') {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<html><body></body></html>', 'text/html');
  doc.body.innerHTML = rawDocxHtml;
  const blocks = extractBlocks(doc.body);

  state.frDocxName = filename;
  state.frBlocks = blocks;

  renderDocxStat(blocks.length, filename);
  checkAlignReady();
}

function renderDocxStat(count, filename) {
  if (!count) {
    docxStatWrap.innerHTML = `
      <div class="filestat err">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" x2="12" y2="12"/><line x1="12" x2="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>No headings, paragraphs, or lists detected in ${filename}</span>
        <button type="button" class="clr" id="clearDocxBtn">✕</button>
      </div>`;
  } else {
    docxStatWrap.innerHTML = `
      <div class="filestat">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <span>${filename} — ${count} block(s) detected</span>
        <button type="button" class="clr" id="clearDocxBtn" title="Clear uploaded document">✕</button>
      </div>`;
  }

  const clr = document.getElementById('clearDocxBtn');
  if (clr) {
    clr.addEventListener('click', () => {
      state.frBlocks = [];
      state.frDocxName = '';
      docxStatWrap.innerHTML = '';
      if (docxFile) docxFile.value = '';
      checkAlignReady();
    });
  }
}

async function handleDocxFile(file) {
  if (!file) return;
  dropzoneMain.textContent = `Reading ${file.name}...`;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    dropzoneMain.textContent = 'Drop .docx here or click to browse';
    parseFrDocxHtml(result.value, file.name);
    showToast(`Loaded ${file.name}`);
  } catch (err) {
    console.error('Error parsing docx:', err);
    dropzoneMain.textContent = 'Drop .docx here or click to browse';
    docxStatWrap.innerHTML = `
      <div class="filestat err">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" x2="12" y2="12"/><line x1="12" x2="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Failed to read Word document. Ensure it is a valid .docx file.</span>
      </div>`;
    showToast('Failed to read .docx file', 4000);
  }
}

function checkAlignReady() {
  const ready = state.enBlocks.length > 0 && state.frBlocks.length > 0;
  alignBtn.disabled = !ready;
}

// Alignment and Dual Pane Rendering
function computeAlignment() {
  const enTags = state.enBlocks.map((b) => b.tag);
  const frTags = state.frBlocks.map((b) => b.tag);
  const rows = alignByTag(enTags, frTags);
  const pairs = rows.filter((r) => r.enIndex !== null && r.frIndex !== null && !r.skip);
  const issues = computeIssues(rows, state.enBlocks, state.frBlocks, []);

  state.alignRows = rows;
  state.alignPairs = pairs;
  state.issueGroups = issues;

  renderStatsBar();
  buildDualIframePreviews();

  previewSection.classList.add('show');
  previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildDualIframePreviews() {
  // Update block badges
  enBlockCountBadge.textContent = `${state.enBlocks.length} blocks`;
  frBlockCountBadge.textContent = `${state.frBlocks.length} blocks`;

  // English Frame Document
  const enDocHtml = buildFrameSource(state.enHtml, state.enBlocks, 'en');
  // French Frame Document
  const frInnerHtml = state.frBlocks
    .map((b) => `<${b.tag}>${b.text}</${b.tag}>`)
    .join('\n');
  const frDocHtml = buildFrameSource(frInnerHtml, state.frBlocks, 'fr');

  enPreviewFrame.srcdoc = enDocHtml;
  frPreviewFrame.srcdoc = frDocHtml;

  setupIframeEventListeners();
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
    b.el.setAttribute('data-swap-index', String(idx));
    if (lang === 'fr') {
      b.el.setAttribute('contenteditable', 'true');
      b.el.classList.add('gc-swap-editable');
    }
  });

  const isLight = state.theme === 'light';
  const bodyClass = isLight ? 'gc-light-mode' : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${HIGHLIGHT_CSS}</style>
</head>
<body class="${bodyClass}">
  ${doc.body.innerHTML}
  <script>
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-swap-index]');
      if (target) {
        const idx = parseInt(target.getAttribute('data-swap-index'), 10);
        window.parent.postMessage({ type: 'symmetra-jump', side: '${lang}', index: idx }, '*');
      }
    });

    document.addEventListener('input', (e) => {
      const target = e.target.closest('[data-swap-index]');
      if (target && '${lang}' === 'fr') {
        const idx = parseInt(target.getAttribute('data-swap-index'), 10);
        window.parent.postMessage({ type: 'frEdit', index: idx, text: target.innerText }, '*');
      }
    });
  </script>
</body>
</html>`;
}

function setupIframeEventListeners() {
  let isSyncing = false;

  const handleFrameScroll = (sourceFrame, targetFrame, isEnSource) => {
    if (!state.autoSync || state.syncPaused || isSyncing) return;
    isSyncing = true;

    try {
      const sWin = sourceFrame.contentWindow;
      const tWin = targetFrame.contentWindow;
      if (!sWin || !tWin) {
        isSyncing = false;
        return;
      }

      const sDoc = sWin.document;
      const tDoc = tWin.document;

      const sScrollTop = sWin.scrollY || sDoc.documentElement.scrollTop;
      const sScrollHeight = sDoc.documentElement.scrollHeight - sWin.innerHeight;

      if (sScrollHeight <= 0) {
        isSyncing = false;
        return;
      }

      const ratio = sScrollTop / sScrollHeight;
      const tScrollHeight = tDoc.documentElement.scrollHeight - tWin.innerHeight;
      let targetScroll = ratio * tScrollHeight;

      if (state.syncOffset !== 0) {
        targetScroll += state.syncOffset * 50;
      }

      tWin.scrollTo({ top: targetScroll, behavior: 'auto' });
    } catch (e) {
      console.warn('Sync error:', e);
    }

    setTimeout(() => {
      isSyncing = false;
    }, 40);
  };

  const attachScroll = (frame, target, isEn) => {
    frame.addEventListener('load', () => {
      updateIframesTheme();
      try {
        const win = frame.contentWindow;
        if (!win) return;
        win.addEventListener('scroll', () => handleFrameScroll(frame, target, isEn), { passive: true });
        
        // Attach keydown for keyboard navigation from inside frame
        win.addEventListener('keydown', (e) => {
          handleKeyNavigation(e);
        });
      } catch (e) {
        console.warn('Iframe attach error', e);
      }
    });
  };

  attachScroll(enPreviewFrame, frPreviewFrame, true);
  attachScroll(frPreviewFrame, enPreviewFrame, false);
}

// Global PostMessage receiver for iframe clicks and edits
window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'object') return;

  if (e.data.type === 'symmetra-jump') {
    const { side, index } = e.data;
    if (side === 'en') {
      jumpToBlock(index);
    } else {
      const matchPair = state.alignPairs.find((p) => p.frIndex === index);
      if (matchPair && matchPair.enIndex !== null) {
        jumpToBlock(matchPair.enIndex);
      } else {
        highlightBlockInFrames(null, index);
      }
    }
  } else if (e.data.type === 'frEdit') {
    const { index, text } = e.data;
    if (state.frBlocks[index]) {
      state.frBlocks[index].text = text;
      // Re-extract inline spans if needed
    }
  }
});

function jumpToBlock(enIdx) {
  if (enIdx < 0 || enIdx >= state.enBlocks.length) return;
  state.activePreviewBlock = enIdx;

  const pair = state.alignPairs.find((p) => p.enIndex === enIdx);
  const frIdx = pair && pair.frIndex !== null ? pair.frIndex : null;

  highlightBlockInFrames(enIdx, frIdx);
  updateActiveBlockHud(enIdx);
}

function highlightBlockInFrames(enIdx, frIdx) {
  try {
    const enDoc = enPreviewFrame.contentDocument;
    const frDoc = frPreviewFrame.contentDocument;

    if (enDoc) {
      enDoc.querySelectorAll('.gc-swap-active').forEach((el) => el.classList.remove('gc-swap-active'));
      if (enIdx !== null) {
        const target = enDoc.querySelector(`[data-swap-index="${enIdx}"]`);
        if (target) {
          target.classList.add('gc-swap-active');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    if (frDoc) {
      frDoc.querySelectorAll('.gc-swap-active').forEach((el) => el.classList.remove('gc-swap-active'));
      if (frIdx !== null) {
        const target = frDoc.querySelector(`[data-swap-index="${frIdx}"]`);
        if (target) {
          target.classList.add('gc-swap-active');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  } catch (e) {
    console.warn('Highlight block error', e);
  }
}

function updateActiveBlockHud(enIdx) {
  const total = state.enBlocks.length;
  const currentBlock = state.enBlocks[enIdx];
  const tag = currentBlock ? `<${currentBlock.tag}>` : '';
  activeBlockHudText.textContent = `Block ${enIdx + 1}/${total}`;
  activeBlockHudTag.textContent = tag;
}

// Bottom Stats HUD and Inspector Drawer
function renderStatsBar() {
  const nEn = state.enBlocks.length;
  const nFr = state.frBlocks.length;
  const nMis = state.issueGroups.mismatch.length;
  const nMiss = state.issueGroups.missing.length;
  const nExt = state.issueGroups.extra.length;
  const nSkip = state.alignRows.filter((r) => r.skip).length;
  const nMatched = state.alignPairs.length;

  cEn.textContent = String(nEn);
  cFr.textContent = String(nFr);
  cMismatch.textContent = String(nMis);
  cMissing.textContent = String(nMiss);
  cExtra.textContent = String(nExt);
  cSkip.textContent = String(nSkip);

  // Style tabs based on issue counts
  const tabMis = document.getElementById('tabMismatch');
  const tabMiss = document.getElementById('tabMissing');
  const tabExt = document.getElementById('tabExtra');

  if (tabMis) tabMis.classList.toggle('has-issues', nMis > 0);
  if (tabMiss) tabMiss.classList.toggle('has-danger', nMiss > 0);
  if (tabExt) tabExt.classList.toggle('has-issues', nExt > 0);

  // Update Drawer Tab counters
  const dMis = document.getElementById('drawerTabMismatch');
  const dMiss = document.getElementById('drawerTabMissing');
  const dExt = document.getElementById('drawerTabExtra');
  const dEn = document.getElementById('drawerTabEnTags');
  const dFr = document.getElementById('drawerTabFrTags');
  const dSkip = document.getElementById('drawerTabSkipped');

  if (dMis) dMis.textContent = `Mismatches (${nMis})`;
  if (dMiss) dMiss.textContent = `Missing FR (${nMiss})`;
  if (dExt) dExt.textContent = `Extra FR (${nExt})`;
  if (dEn) dEn.textContent = `EN Tags (${nEn})`;
  if (dFr) dFr.textContent = `FR Tags (${nFr})`;
  if (dSkip) dSkip.textContent = `Skipped (${nSkip})`;

  // Overall Alignment Health Pill
  const hasErrors = nMiss > 0;
  const hasWarnings = nMis > 0 || nExt > 0;

  healthPill.className = 'preview-status-pill ' + (hasErrors ? 'status-danger' : hasWarnings ? 'status-warn' : 'status-clean');
  
  if (hasErrors) {
    healthPill.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-rose-500"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" x2="12" y2="12"/><line x1="12" x2="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${nMiss} missing block(s) • ${nMatched}/${nEn} matched</span>`;
  } else if (hasWarnings) {
    healthPill.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" x2="13"/><line x1="12" x2="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>${nMis} style mismatch(es) • ${nMatched}/${nEn} matched</span>`;
  } else {
    healthPill.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-emerald-500"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
      <span>100% Aligned • ${nMatched} blocks matched</span>`;
  }

  updateActiveBlockHud(state.activePreviewBlock);
}

function openDrawer(category) {
  state.activeCategory = category;
  state.drawerOpen = true;
  statDetailPanel.classList.add('show');

  // Update active state on segmented tabs
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.getAttribute('data-category') === category);
  });

  // Update active state on drawer header tabs
  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    const isActive = tab.getAttribute('data-category') === category;
    tab.className = `drawer-tab px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
      isActive ? 'bg-accent text-white shadow-sm' : 'bg-surface hover:bg-surface-hover text-text-secondary'
    }`;
  });

  renderDrawerBody(category);
}

function closeDrawer() {
  state.drawerOpen = false;
  statDetailPanel.classList.remove('show');
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.classList.remove('is-active');
  });
}

function renderDrawerBody(category) {
  drawerBody.innerHTML = '';

  if (category === 'en-tags' || category === 'fr-tags') {
    const blocks = category === 'en-tags' ? state.enBlocks : state.frBlocks;
    const title = category === 'en-tags' ? 'English Source HTML Tag Breakdown' : 'French Word Document Tag Breakdown';
    const counts = {};
    blocks.forEach((b) => {
      counts[b.tag] = (counts[b.tag] || 0) + 1;
    });

    let badgesHtml = Object.entries(counts)
      .map(
        ([tag, cnt]) => `
      <div class="tag-breakdown-badge">
        <span class="tag-name">&lt;${tag}&gt;</span>
        <span class="tag-count">${cnt}</span>
      </div>`
      )
      .join('');

    let listHtml = blocks
      .map(
        (b, i) => `
      <div class="issue-row issue-row-clickable" data-jump-en="${category === 'en-tags' ? i : ''}" data-jump-fr="${category === 'fr-tags' ? i : ''}">
        <div class="issue-side info">&lt;${b.tag}&gt;</div>
        <div>
          <div class="issue-title">#${i + 1} &lt;${b.tag}&gt;</div>
          <div class="issue-detail">${escapeHtml(issueSnippet(b.text, 120))}</div>
        </div>
        <div class="issue-status">${b.spans.length ? `${b.spans.length} inline span(s)` : 'plain block'}</div>
        <div>
          <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
        </div>
      </div>`
      )
      .join('');

    drawerBody.innerHTML = `
      <div class="p-4 bg-surface-soft border-b border-border">
        <div class="text-xs font-semibold text-text mb-2">${title}</div>
        <div class="flex items-center gap-2 flex-wrap">${badgesHtml}</div>
      </div>
      <div>${listHtml}</div>`;
  } else if (category === 'mismatch') {
    const issues = state.issueGroups.mismatch;
    if (!issues.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">No tag or style mismatches found! Perfect structural symmetry.</div>`;
    } else {
      drawerBody.innerHTML = issues
        .map(
          (iss) => `
        <div class="issue-row issue-row-clickable" data-jump-en="${iss.enIndex}">
          <div class="issue-side warn">Mismatch</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">Needs style sync</div>
          <div>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`
        )
        .join('');
    }
  } else if (category === 'missing') {
    const issues = state.issueGroups.missing;
    if (!issues.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">All English blocks have corresponding French translations.</div>`;
    } else {
      drawerBody.innerHTML = issues
        .map(
          (iss) => `
        <div class="issue-row issue-row-clickable" data-jump-en="${iss.enIndex}">
          <div class="issue-side danger">Missing FR</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">Unmatched in docx</div>
          <div>
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1">Jump →</button>
          </div>
        </div>`
        )
        .join('');
    }
  } else if (category === 'extra') {
    const issues = state.issueGroups.extra;
    if (!issues.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">No extra unaligned French paragraphs in the document.</div>`;
    } else {
      drawerBody.innerHTML = issues
        .map(
          (iss) => `
        <div class="issue-row">
          <div class="issue-side info">Extra FR</div>
          <div>
            <div class="issue-title">${escapeHtml(iss.title)}</div>
            <div class="issue-detail">${escapeHtml(iss.detail)}</div>
          </div>
          <div class="issue-status">Ignored on export</div>
          <div></div>
        </div>`
        )
        .join('');
    }
  } else if (category === 'skipped') {
    const skippedRows = state.alignRows.filter((r) => r.skip);
    if (!skippedRows.length) {
      drawerBody.innerHTML = `<div class="p-6 text-center text-text-secondary text-xs">No blocks have been skipped.</div>`;
    } else {
      drawerBody.innerHTML = skippedRows
        .map(
          (row) => `
        <div class="issue-row">
          <div class="issue-side info">Skipped</div>
          <div>
            <div class="issue-title">English block #${row.enIndex !== null ? row.enIndex + 1 : '—'}</div>
            <div class="issue-detail">This block alignment was manually excluded from export.</div>
          </div>
          <div class="issue-status">Skipped</div>
          <div></div>
        </div>`
        )
        .join('');
    }
  }

  // Attach jump click listeners inside drawer
  drawerBody.querySelectorAll('.issue-row-clickable').forEach((row) => {
    row.addEventListener('click', () => {
      const en = row.getAttribute('data-jump-en');
      const fr = row.getAttribute('data-jump-fr');
      if (en !== null && en !== '') {
        jumpToBlock(parseInt(en, 10));
      } else if (fr !== null && fr !== '') {
        const frIdx = parseInt(fr, 10);
        const match = state.alignPairs.find((p) => p.frIndex === frIdx);
        if (match && match.enIndex !== null) jumpToBlock(match.enIndex);
        else highlightBlockInFrames(null, frIdx);
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate Output Step 3
function handleGenerateOutput() {
  const parser = new DOMParser();
  let doc;
  const hasHtmlTag = /<html[\s>]/i.test(state.enHtml);

  if (hasHtmlTag) {
    doc = parser.parseFromString(state.enHtml, 'text/html');
  } else {
    doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');
    doc.body.innerHTML = state.enHtml;
  }

  // Update lang attribute to fr
  if (doc.documentElement) {
    doc.documentElement.setAttribute('lang', 'fr');
  }

  const enDocBlocks = extractBlocks(doc.body);

  state.alignPairs.forEach((pair) => {
    if (pair.enIndex !== null && pair.frIndex !== null && !pair.skip) {
      const enTarget = enDocBlocks[pair.enIndex];
      const frBlock = state.frBlocks[pair.frIndex];
      if (enTarget && frBlock) {
        replaceBlockTextPreservingLinks(
          enTarget.el,
          frBlock.text,
          enTarget.attrTarget,
          frBlock.spans
        );
      }
    }
  });

  const finalHtml = hasHtmlTag ? doc.documentElement.outerHTML : doc.body.innerHTML;
  state.outputHtml = finalHtml;

  // Render Canada.ca theme preview
  const wetThemeHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prévisualisation Thème Canada.ca (WET-BOEW)</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap">
  <link rel="stylesheet" href="https://wet-boew.github.io/themes-dist/GCWeb/GCWeb/css/theme.min.css">
  <style>
    body { padding: 24px; font-family: "Noto Sans", sans-serif; }
    .alert-info, section.alert-info, div.alert-info,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) {
      background-color: transparent !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      border-left: 6px solid #269abc !important;
      color: #333333 !important;
    }
    .alert-info h1, .alert-info h2, .alert-info h3, .alert-info h4, .alert-info h5, .alert-info h6,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h1,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h2,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h3,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h4,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h5,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) h6 {
      color: #000000 !important;
      margin-top: 0 !important;
      font-weight: 700 !important;
    }
    .alert-info p, .alert-info li, .alert-info span,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) p,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) li,
    .alert:not(.alert-warning):not(.alert-danger):not(.alert-success) span {
      color: #333333 !important;
    }
  </style>
</head>
<body class="container">
  <main role="main" property="mainContentOfPage" class="container">
    ${finalHtml}
  </main>
</body>
</html>`;

  previewFrame.srcdoc = wetThemeHtml;
  codeOut.value = finalHtml;

  outputSection.classList.add('show');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('French HTML generated successfully');
}

// Keyboard Navigation & Shortcuts
function handleKeyNavigation(e) {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (state.activePreviewBlock > 0) {
      jumpToBlock(state.activePreviewBlock - 1);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (state.activePreviewBlock < state.enBlocks.length - 1) {
      jumpToBlock(state.activePreviewBlock + 1);
    }
  } else if (e.key === '[') {
    e.preventDefault();
    state.syncOffset -= 1;
    updateSyncOffsetBadge();
  } else if (e.key === ']') {
    e.preventDefault();
    state.syncOffset += 1;
    updateSyncOffsetBadge();
  } else if (e.key === 'Escape') {
    if (state.drawerOpen) closeDrawer();
  }
}

function updateSyncOffsetBadge() {
  if (state.syncOffset !== 0) {
    syncOffsetBadge.style.display = 'inline-flex';
    syncOffsetBadge.textContent = `Offset: ${state.syncOffset > 0 ? '+' : ''}${state.syncOffset}`;
  } else {
    syncOffsetBadge.style.display = 'none';
  }
}

// Event Listeners Initialization
function initEventListeners() {
  // Theme Toggle Button
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  // HTML Source Input
  htmlInput.addEventListener('input', updateHtmlState);
  clearHtmlBtn.addEventListener('click', () => {
    htmlInput.value = '';
    htmlStat.textContent = '';
    state.enBlocks = [];
    state.enParsed = null;
    updateHtmlState();
  });
  parseHtmlBtn.addEventListener('click', analyzeEnglishHtml);
  loadSampleEnBtn.addEventListener('click', () => {
    htmlInput.value = SAMPLE_EN_HTML;
    updateHtmlState();
    analyzeEnglishHtml();
    showToast('Loaded English sample template');
  });

  // DOCX Dropzone & Upload
  loadSampleFrBtn.addEventListener('click', () => {
    parseFrDocxHtml(SAMPLE_FR_DOCX_HTML, 'sample-french-translation.docx');
    showToast('Loaded French sample translation');
  });

  dropzone.addEventListener('click', () => {
    docxFile.click();
  });

  docxFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleDocxFile(file);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleDocxFile(file);
  });

  // Align Button
  alignBtn.addEventListener('click', computeAlignment);

  // View Toolbar
  toggleFocusMode.addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    toggleFocusMode.classList.toggle('is-active', state.focusMode);
    [enPreviewFrame, frPreviewFrame].forEach((frame) => {
      if (frame && frame.contentDocument && frame.contentDocument.body) {
        frame.contentDocument.body.classList.toggle('mode-focus', state.focusMode);
      }
    });
  });

  toggleBlurMode.addEventListener('click', () => {
    state.blurMode = !state.blurMode;
    toggleBlurMode.classList.toggle('is-active', state.blurMode);
    [enPreviewFrame, frPreviewFrame].forEach((frame) => {
      if (frame && frame.contentDocument && frame.contentDocument.body) {
        frame.contentDocument.body.classList.toggle('mode-blur', state.blurMode);
      }
    });
  });

  toggleAutoSync.addEventListener('click', () => {
    state.autoSync = !state.autoSync;
    toggleAutoSync.classList.toggle('is-active', state.autoSync);
    toggleAutoSync.querySelector('span').textContent = state.autoSync ? 'Auto-sync on' : 'Auto-sync off';
    enSyncStatus.textContent = state.autoSync ? '● synced' : '○ un-synced';
    frSyncStatus.textContent = state.autoSync ? '● synced' : '○ un-synced';
    enSyncStatus.style.color = state.autoSync ? '#10b981' : '#94a3b8';
    frSyncStatus.style.color = state.autoSync ? '#10b981' : '#94a3b8';
  });

  rightBack.addEventListener('click', () => {
    state.syncOffset -= 1;
    updateSyncOffsetBadge();
  });

  rightForward.addEventListener('click', () => {
    state.syncOffset += 1;
    updateSyncOffsetBadge();
  });

  resetSyncOffset.addEventListener('click', () => {
    state.syncOffset = 0;
    updateSyncOffsetBadge();
    showToast('Sync offset reset');
  });

  exportFromViewBtn.addEventListener('click', handleGenerateOutput);
  generateBtn.addEventListener('click', handleGenerateOutput);

  // Segmented Bar Tabs (EN Tags, FR Tags, Mismatches, Missing, Extra, Skipped)
  document.querySelectorAll('.preview-segment-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-category');
      if (state.drawerOpen && state.activeCategory === cat) {
        closeDrawer();
      } else {
        openDrawer(cat);
      }
    });
  });

  // Drawer Header Category Buttons
  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-category');
      openDrawer(cat);
    });
  });

  closeDrawerBtn.addEventListener('click', closeDrawer);

  // Active Block Stepper & Popover Jump
  prevBlockBtn.addEventListener('click', () => {
    if (state.activePreviewBlock > 0) {
      jumpToBlock(state.activePreviewBlock - 1);
    }
  });

  nextBlockBtn.addEventListener('click', () => {
    if (state.activePreviewBlock < state.enBlocks.length - 1) {
      jumpToBlock(state.activePreviewBlock + 1);
    }
  });

  blockJumpToggleBtn.addEventListener('click', () => {
    const isShown = jumpForm.style.display !== 'none';
    jumpForm.style.display = isShown ? 'none' : 'flex';
    if (!isShown) {
      jumpInput.value = String(state.activePreviewBlock + 1);
      jumpInput.focus();
      jumpInput.select();
    }
  });

  jumpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = parseInt(jumpInput.value, 10);
    if (!isNaN(val) && val >= 1 && val <= state.enBlocks.length) {
      jumpToBlock(val - 1);
      jumpForm.style.display = 'none';
    }
  });

  // Global Alt key detection to pause sync
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') state.syncPaused = true;
    handleKeyNavigation(e);
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') state.syncPaused = false;
  });

  // Output Section Tabs
  tabPreview.addEventListener('click', () => {
    state.outputTab = 'preview';
    tabPreview.classList.add('active');
    tabCode.classList.remove('active');
    previewFrame.style.display = 'block';
    codeOut.style.display = 'none';
  });

  tabCode.addEventListener('click', () => {
    state.outputTab = 'code';
    tabCode.classList.add('active');
    tabPreview.classList.remove('active');
    previewFrame.style.display = 'none';
    codeOut.style.display = 'block';
  });

  // Copy Code
  copyCodeBtn.addEventListener('click', async () => {
    if (!state.outputHtml) return;
    try {
      await navigator.clipboard.writeText(state.outputHtml);
      showToast('HTML copied to clipboard');
    } catch (err) {
      codeOut.select();
      document.execCommand('copy');
      showToast('HTML copied to clipboard');
    }
  });

  // Download Code
  downloadHtmlBtn.addEventListener('click', () => {
    if (!state.outputHtml) return;
    const blob = new Blob([state.outputHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.frDocxName.replace(/\.docx$/i, '') || 'translated') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started');
  });
}

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
});
