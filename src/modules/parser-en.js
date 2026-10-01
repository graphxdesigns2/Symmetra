// Auto-generated imports
import {
  extractBlocks,
} from './block-utils.js';


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

  const processedHtml = raw;

  return {
    ok: true,
    count: blocks.length,
    warn: !!parseErr,
    blocks,
    isFullDoc,
    rawHtml: raw,
    processedHtml,
  };
}

export {
  parseEnHtml,
};
