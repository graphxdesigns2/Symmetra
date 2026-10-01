// Auto-generated imports
import {
  highlightHtmlCode,
} from './code-view.js';
import {
  buildFootnoteInventory,
} from './footnotes.js';
import {
  clearHtmlBtn,
  condensedEnStat,
  htmlInput,
  htmlInputGutter,
  htmlInputHighlight,
  htmlInputHighlightInner,
  htmlStat,
} from './dom-refs.js';
import {
  extractBlocks,
} from './block-utils.js';
import {
  parseEnHtml,
} from './parser-en.js';
import {
  checkAlignReady,
  formatBlockCount,
} from './sources.js';
import {
  state,
} from './state.ts';


let analyzeTimer = null;

function updateHtmlState() {
  const val = htmlInput.value.trim();
  state.enHtml = val;
  clearHtmlBtn.disabled = !val;
  checkAlignReady();
  updateHtmlInputHighlight();
  if (analyzeTimer) clearTimeout(analyzeTimer);
  analyzeTimer = setTimeout(() => {
    analyzeTimer = null;
    analyzeEnglishHtml();
  }, 600);
}

function syncHtmlInputGutterToEditor() {
  if (!htmlInput || !htmlInputGutter) return;
  try {
    const sourceTop = htmlInput.scrollTop || 0;
    const sourceMax = Math.max(0, (htmlInput.scrollHeight || 0) - (htmlInput.clientHeight || 0));
    const gutterMax = Math.max(0, (htmlInputGutter.scrollHeight || 0) - (htmlInputGutter.clientHeight || 0));
    if (!sourceMax || !gutterMax) {
      htmlInputGutter.scrollTop = sourceTop;
      return;
    }
    htmlInputGutter.scrollTop = Math.round((sourceTop / sourceMax) * gutterMax);
  } catch (_) {}
}

function syncHtmlInputHighlightScroll() {
  if (!htmlInput || !htmlInputHighlight) return;
  htmlInputHighlight.scrollTop = htmlInput.scrollTop;
  htmlInputHighlight.scrollLeft = htmlInput.scrollLeft;
  if (htmlInputGutter) syncHtmlInputGutterToEditor();
}

function updateHtmlInputGutter() {
  if (!htmlInput || !htmlInputGutter) return;
  const text = htmlInput.value || '';
  const lineCount = text ? text.split('\n').length : 1;
  let lineNumsStr = '';
  for (let i = 1; i <= lineCount; i++) {
    lineNumsStr += (i === 1 ? '1' : '\n' + i);
  }
  htmlInputGutter.textContent = lineNumsStr;
  syncHtmlInputGutterToEditor();
}

function updateHtmlInputHighlight() {
  if (!htmlInput || !htmlInputHighlightInner) return;
  const text = htmlInput.value || '';
  const trailing = text.endsWith('\n') ? '\n' : '';
  htmlInputHighlightInner.innerHTML = highlightHtmlCode(text) + trailing;
  updateHtmlInputGutter();
  syncHtmlInputHighlightScroll();
}

if (typeof window !== 'undefined') {
  window.updateHtmlInputHighlight = updateHtmlInputHighlight;
  window.syncHtmlInputHighlightScroll = syncHtmlInputHighlightScroll;
}

function analyzeEnglishHtml() {
  const val = htmlInput.value.trim();
  if (!val) {
    htmlStat.textContent = '0 blocks';
    state.enBlocks = [];
    state.enParsed = null;
    state.footnoteInventory = null;
    checkAlignReady();
    return;
  }

  const res = parseEnHtml(val);
  if (!res.ok) {
    htmlStat.innerHTML = `<span class="text-rose-500 font-semibold">${res.msg}</span>`;
    state.enBlocks = [];
    state.enParsed = null;
    state.footnoteInventory = null;
  } else {
    state.enBlocks = res.blocks;
    state.enParsed = res;
    state.enHtml = val;
    const parser = new DOMParser();
    const enDoc = parser.parseFromString(val.includes('<html') ? val : `<html><body>${val}</body></html>`, 'text/html');
    state.footnoteInventory = buildFootnoteInventory(enDoc, extractBlocks);
    htmlStat.textContent = formatBlockCount(res.count);
  }
  if (condensedEnStat) {
    condensedEnStat.textContent = formatBlockCount(state.enBlocks.length);
  }
  checkAlignReady();
}

export {
  analyzeEnglishHtml,
  syncHtmlInputHighlightScroll,
  updateHtmlInputGutter,
  updateHtmlInputHighlight,
  updateHtmlState,
};
