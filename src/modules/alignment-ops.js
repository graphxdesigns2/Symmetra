// Auto-generated imports
import {
  extractBlockTextFeatures,
  getBlockMatchScore,
  isHeadingTag,
} from './alignment.js';


function alignByTag(enTags, frTags, enBlocks = [], frBlocks = []) {
  const n = enTags.length;
  const m = frTags.length;
  const GAP = -1;

  if (n * m > 4000000) {
    const len = Math.max(n, m);
    const pairs = [];
    for (let i = 0; i < len; i++) {
      pairs.push({ enIndex: i < n ? i : null, frIndex: i < m ? i : null, skip: false });
    }
    return pairs;
  }

  // Precompute block linguistic features for high-performance sequence alignment
  const enFeatures = enBlocks.map((b) => extractBlockTextFeatures(b ? b.text : ''));
  const frFeatures = frBlocks.map((b) => extractBlockTextFeatures(b ? b.text : ''));

  const score = new Array(n + 1);
  for (let i = 0; i <= n; i++) score[i] = new Float64Array(m + 1);
  for (let i = 1; i <= n; i++) score[i][0] = score[i - 1][0] + GAP;
  for (let j = 1; j <= m; j++) score[0][j] = score[0][j - 1] + GAP;

  for (let i = 1; i <= n; i++) {
    const rowCur = score[i];
    const rowPrev = score[i - 1];
    const enFeat = enFeatures[i - 1];
    for (let j = 1; j <= m; j++) {
      const matchScore = getBlockMatchScore(
        enTags[i - 1],
        frTags[j - 1],
        enBlocks[i - 1],
        frBlocks[j - 1],
        enBlocks,
        frBlocks,
        i - 1,
        j - 1,
        enFeat,
        frFeatures[j - 1]
      );
      const diag = rowPrev[j - 1] + matchScore;
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
    const matchScore = getBlockMatchScore(
      enTags[i - 1],
      frTags[j - 1],
      enBlocks[i - 1],
      frBlocks[j - 1],
      enBlocks,
      frBlocks,
      i - 1,
      j - 1,
      enFeatures[i - 1],
      frFeatures[j - 1]
    );
    const diagVal = score[i - 1][j - 1] + matchScore;
    if (Math.abs(cur - diagVal) < 1e-6) {
      pairs.push({ enIndex: i - 1, frIndex: j - 1, skip: false });
      i--;
      j--;
    } else if (Math.abs(cur - (score[i - 1][j] + GAP)) < 1e-6) {
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

function issueSnippet(text, max = 80) {
  if (!text) return '(empty)';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '(empty)';
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

export {
  alignByTag,
  issueSnippet,
};
