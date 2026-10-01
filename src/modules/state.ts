// Central application state, fully typed. This is the first TypeScript
// module in the codebase: keep new shared types here (or next to the logic
// that owns them) and convert consumers one file at a time. JS importers are
// not type-checked yet (checkJs is off), so this file is the source of truth
// that future .ts conversions will be checked against.

export type FrViewMode = 'visual' | 'code' | 'split';

export type ThemeName = 'light' | 'dark';

export type OutputTab = 'preview' | 'code';

export interface TextSpan {
  type: string;
  text: string;
  href?: string;
  lang?: string;
  /** Character offset within the block text; null when it couldn't be measured. */
  start: number | null;
}

export interface ContentBlock {
  tag: string;
  attrTarget: string;
  text: string;
  spans: TextSpan[];
  inTable?: boolean;
  el?: Element | null;
  hasBr?: boolean;
  brCount?: number;
  isBrLine?: boolean;
}

export interface AlignPair {
  enIndex: number | null;
  frIndex: number | null;
  groupedFrIndices: number[];
  mergedFrText?: string;
  mergedFrSpans?: TextSpan[];
  skip: boolean;
}

export interface AlignRow {
  enIndex: number | null;
  frIndex: number | null;
  groupedFrIndices?: number[];
  mergedFrText?: string;
  mergedFrSpans?: TextSpan[];
  skip?: boolean;
}

/**
 * One entry in the footnote placement log.
 *
 * `kind` is the whole point of the record. "recognition" is a binary,
 * evidence-based finding: a note the English source cites and the French
 * document does not, a bracketed list that could not be resolved. It is
 * reliable and needs no reading. "placement" is inference on a French
 * sentence — the marker was inserted at a position derived from where the
 * English citation stood, and a human has to confirm it supports the right
 * claim. Only the second kind can be wrong in a way a reader would notice.
 */
export interface FootnoteReportEntry {
  kind: 'recognition' | 'placement';
  num: string;
  detail: string;
  enIndex: number | null;
  frIndex: number | null;
}

export interface IssueItem {
  category: string;
  kind: string;
  enIndex?: number;
  frIndex?: number;
  resolved?: boolean;
  // Conversion report fields (informational rows in the Conversion tab).
  outcome?: string;
  badge?: string;
  tone?: string;
  lossy?: boolean;
  note?: string;
  title: string;
  detail: string;
}

export interface IssueGroups {
  mismatch: IssueItem[];
  missing: IssueItem[];
  extra: IssueItem[];
}

export type EnParseResult =
  | { ok: false; msg: string }
  | {
      ok: true;
      count: number;
      warn: boolean;
      blocks: ContentBlock[];
      isFullDoc: boolean;
      rawHtml: string;
      processedHtml: string;
    };

export interface AppState {
  theme: ThemeName;
  enHtml: string;
  enBlocks: ContentBlock[];
  enParsed: EnParseResult | null;
  frDocxName: string;
  frRawDocxHtml: string;
  frBlocks: ContentBlock[];
  alignRows: AlignRow[];
  alignPairs: AlignPair[];
  issueGroups: IssueGroups;
  /** Shape owned by footnotes.js; pin down when that module is converted. */
  footnoteInventory: unknown;
  /** Recognition findings: binary, evidence-based, no interpretation needed. */
  footnoteProblems: string[];
  /** Flat warning strings, kept for anything that wants the plain text. */
  footnoteWarnings: string[];
  /** Placement log: one entry per marker the pipeline had to guess at. */
  footnoteReport: FootnoteReportEntry[];
  /**
   * Placement guesses made during generation, before the report exists.
   * The generation pass matches note numbers inside a flat French string, so a
   * bare digit there is a guess ("mg/m3" and "3 mg/kg" have exactly the shape of
   * a typed callout). It is parked here and folded into footnoteReport by the
   * post-process, which is the only place that publishes the log.
   */
  footnotePlacementDraft: FootnoteReportEntry[];
  activeCategory: string;
  drawerOpen: boolean;
  controlsModalOpen: boolean;
  /** English preview pane collapsed via the header button. */
  enPaneCollapsed: boolean;
  activePreviewBlock: number;
  /** Block focused when the code view was entered; fallback for view restores. */
  savedVisualActiveBlock: number;
  /** Last valid EN focus; kept in sync with activePreviewBlock. */
  lastKnownEnIndex: number;
  issueNavIndex: number;
  qaDockExpanded: boolean;
  sourcesCondensed: boolean;
  syncOffset: number;
  autoSync: boolean;
  syncPaused: boolean;
  focusMode: boolean;
  blurMode: boolean;
  showHighlightBox: boolean;
  showWordDocView: boolean;
  outputHtml: string;
  outputTab: OutputTab;
  frViewMode: FrViewMode;
  frCustomHtml: string | null;
  frGeneratedCode: string | null;
  frCodeModified: boolean;
  rawEnHtml: string;
  rawFrDocxHtml: string;
  /** FR block index targeted by the split-block modal; null when closed. */
  splitBlockIndex: number | null;
  /** True while the tour's auto-glide owns the scroll position. Layout-
      mutating followers (spacers, details) stay quiet until it ends. */
  demoScrolling: boolean;
  previewZoom: number;
}

function loadPreviewZoom(): number {
  try {
    const saved = localStorage.getItem('symmetra_preview_zoom');
    const parsed = parseFloat(saved || '');
    if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
      return parsed;
    }
  } catch (_) {}
  return 1.0;
}

export const state: AppState = {
  theme: 'light',
  enHtml: '',
  enBlocks: [],
  enParsed: null,
  frDocxName: '',
  frRawDocxHtml: '',
  frBlocks: [],
  alignRows: [],
  alignPairs: [],
  issueGroups: { mismatch: [], missing: [], extra: [] },
  footnoteInventory: null,
  footnoteProblems: [],
  footnoteWarnings: [],
  footnoteReport: [],
  footnotePlacementDraft: [],
  activeCategory: 'mismatch',
  drawerOpen: false,
  controlsModalOpen: false,
  enPaneCollapsed: false,
  activePreviewBlock: 0,
  savedVisualActiveBlock: 0,
  lastKnownEnIndex: 0,
  issueNavIndex: -1,
  qaDockExpanded: false,
  sourcesCondensed: false,
  syncOffset: 0,
  autoSync: true,
  syncPaused: false,
  focusMode: false,
  blurMode: false,
  showHighlightBox: true,
  showWordDocView: false,
  outputHtml: '',
  outputTab: 'preview',
  frViewMode: 'visual',
  frCustomHtml: null,
  frGeneratedCode: null,
  frCodeModified: false,
  rawEnHtml: '',
  rawFrDocxHtml: '',
  splitBlockIndex: null,
  demoScrolling: false,
  previewZoom: loadPreviewZoom(),
};

if (typeof window !== 'undefined') {
  (window as unknown as { state: AppState }).state = state;
}
