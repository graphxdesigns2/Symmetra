// Auto-generated imports
import {
  closePanelSearch,
  openPanelSearch,
} from './panelSearch.js';
import {
  wrapBrSegments,
} from './block-utils.js';
import {
  closeContextMenu,
  openContextMenu,
} from './context-menu.js';
import {
  syncDetailsToggle,
} from './details-sync.js';
import {
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
} from './dom-refs.js';
import {
  computeIssues,
} from './issues.js';
import {
  cancelSmoothFollowScroll,
  clearFnLandingPin,
  jumpToBlock,
  pinFnLanding,
  programmaticScrollEls,
} from './scroll-sync.js';
import {
  state,
} from './state.ts';
import {
  renderStatsBar,
} from './stats-bar.js';
import {
  recordInlineEditUndo,
  undoLastEdit,
} from './undo.js';


const BLOCK_SELECTOR =
  'h1,h2,h3,h4,h5,h6,p,li,dt,dd,td,th,figcaption,blockquote,caption,summary,img,img[alt],input[placeholder],input[aria-label],textarea[placeholder],button[aria-label],.alert,section.alert,div.alert,aside.alert,.well,.panel-body,.gc-br-line';

// `sup` and `sub` are span types so the raised and lowered runs a Word document
// carries survive into the French output: units and isotopes (mg/m3, 32P) and
// generation/species numerals (F1, H2O, CO2). Without them the text is flattened
// and the bare digit is indistinguishable from a citation number. Footnote
// citations are excluded before they get here, by isFootnoteElement.
const SPAN_TAGS = ['a', 'strong', 'b', 'em', 'i', 'span', 'sup', 'sub'];

const GC_DEPARTMENT_MAPPINGS = [
  {
    enName: 'Health Canada',
    frName: 'Santé Canada',
    enHref: '/content/canadasite/en/services/health.html',
    frHref: '/content/canadasite/fr/services/sante.html',
  },
  {
    enName: 'Public Health Agency of Canada',
    frName: 'Agence de la santé publique du Canada',
    enHref: '/content/canadasite/en/public-health.html',
    frHref: '/content/canadasite/fr/sante-publique.html',
  },
  {
    enName: 'Environment and Climate Change Canada',
    frName: 'Environnement et Changement climatique Canada',
    enHref: '/content/canadasite/en/environment-climate-change.html',
    frHref: '/content/canadasite/fr/environnement-changement-climatique.html',
  },
  {
    enName: 'Indigenous Services Canada',
    frName: 'Services aux Autochtones Canada',
    enHref: '/content/canadasite/en/indigenous-services-canada.html',
    frHref: '/content/canadasite/fr/services-autochtones-canada.html',
  },
  {
    enName: 'Crown-Indigenous Relations and Northern Affairs Canada',
    frName: 'Relations Couronne-Autochtones et Affaires du Nord Canada',
    enHref: '/content/canadasite/en/crown-indigenous-relations-northern-affairs.html',
    frHref: '/content/canadasite/fr/relations-couronne-autochtones-affaires-nord.html',
  },
  {
    enName: 'Transport Canada',
    frName: 'Transports Canada',
    enHref: '/content/canadasite/en/transport-canada.html',
    frHref: '/content/canadasite/fr/transports-canada.html',
  },
  {
    enName: 'Fisheries and Oceans Canada',
    frName: 'Pêches et Océans Canada',
    enHref: '/content/canadasite/en/fisheries-oceans.html',
    frHref: '/content/canadasite/fr/peches-oceans.html',
  },
  {
    enName: 'Natural Resources Canada',
    frName: 'Ressources naturelles Canada',
    enHref: '/content/canadasite/en/natural-resources-canada.html',
    frHref: '/content/canadasite/fr/ressources-naturelles-canada.html',
  },
  {
    enName: 'Agriculture and Agri-Food Canada',
    frName: 'Agriculture et Agroalimentaire Canada',
    enHref: '/content/canadasite/en/agriculture-agri-food.html',
    frHref: '/content/canadasite/fr/agriculture-agroalimentaire.html',
  },
  {
    enName: 'Canada Revenue Agency',
    frName: 'Agence du revenu du Canada',
    enHref: '/content/canadasite/en/revenue-agency.html',
    frHref: '/content/canadasite/fr/agence-revenu.html',
  },
  {
    enName: 'Employment and Social Development Canada',
    frName: 'Emploi et Développement social Canada',
    enHref: '/content/canadasite/en/employment-social-development.html',
    frHref: '/content/canadasite/fr/emploi-developpement-social.html',
  },
  {
    enName: 'Innovation, Science and Economic Development Canada',
    frName: 'Innovation, Sciences et Développement économique Canada',
    enHref: '/content/canadasite/en/innovation-science-economic-development.html',
    frHref: '/content/canadasite/fr/innovation-sciences-developpement-economique.html',
  },
  {
    enName: 'National Defence',
    frName: 'Défense nationale',
    enHref: '/content/canadasite/en/department-national-defence.html',
    frHref: '/content/canadasite/fr/ministere-defense-nationale.html',
  },
  {
    enName: 'Public Safety Canada',
    frName: 'Sécurité publique Canada',
    enHref: '/content/canadasite/en/public-safety-canada.html',
    frHref: '/content/canadasite/fr/securite-publique-canada.html',
  },
  {
    enName: 'Statistics Canada',
    frName: 'Statistique Canada',
    enHref: '/content/canadasite/en/statistics-canada.html',
    frHref: '/content/canadasite/fr/statistique-canada.html',
  },
  {
    enName: 'Department of Justice',
    frName: 'Ministère de la Justice',
    enHref: '/content/canadasite/en/department-justice.html',
    frHref: '/content/canadasite/fr/ministere-justice.html',
  },
  {
    enName: 'Global Affairs Canada',
    frName: 'Affaires mondiales Canada',
    enHref: '/content/canadasite/en/global-affairs.html',
    frHref: '/content/canadasite/fr/affaires-mondiales.html',
  },
  {
    enName: 'Canadian Food Inspection Agency',
    frName: "Agence canadienne d'inspection des aliments",
    enHref: '/content/canadasite/en/food-inspection-agency.html',
    frHref: '/content/canadasite/fr/agence-inspection-aliments.html',
  },
  {
    enName: 'Royal Canadian Mounted Police',
    frName: 'Gendarmerie royale du Canada',
    enHref: '/content/canadasite/en/rcmp.html',
    frHref: '/content/canadasite/fr/grc.html',
  },
  {
    enName: 'Canada Border Services Agency',
    frName: 'Agence des services frontaliers du Canada',
    enHref: '/content/canadasite/en/border-services-agency.html',
    frHref: '/content/canadasite/fr/agence-services-frontaliers.html',
  },
  {
    enName: 'Immigration, Refugees and Citizenship Canada',
    frName: 'Immigration, Réfugiés et Citoyenneté Canada',
    enHref: '/content/canadasite/en/immigration-refugees-citizenship.html',
    frHref: '/content/canadasite/fr/immigration-refugies-citoyennete.html',
  },
  {
    enName: 'Canadian Heritage',
    frName: 'Patrimoine canadien',
    enHref: '/content/canadasite/en/canadian-heritage.html',
    frHref: '/content/canadasite/fr/patrimoine-canadien.html',
  },
  {
    enName: 'Parks Canada',
    frName: 'Parcs Canada',
    enHref: '/content/canadasite/en/parks-canada.html',
    frHref: '/content/canadasite/fr/parcs-canada.html',
  }
];

const FRENCH_PDF_H1_CONJUNCTIONS = new Set([
  'et', 'ou', 'mais', 'ni', 'pour', 'donc', 'pourtant',
  'parce', 'quoique', 'bien', 'tandis', 'pendant', 'si', 'sauf', 'depuis', 'puisque', 'comme',
  'avec', 'sans', 'propos', 'contre', 'entre', 'dans', 'en', 'par', 'travers', 'durant',
  'avant', 'apres', 'après', 'dessus', 'dessous', 'a', 'à', 'vers', 'de', 'haut', 'bas', 'hors', 'sur', 'sous',
  'le', 'la', 'les', 'un', 'une', 'du', 'des'
]);

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
  --fn-bg: #dc2626;
  --fn-border: #ef4444;
  --fn-text: #ffffff;
  --fn-hover-bg: #ef4444;
  --fn-hover-text: #ffffff;
  --fn-hover-border: #f87171;
  --fn-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --fn-hover-shadow: 0 2px 8px rgba(239, 68, 68, 0.55);
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
  --fn-bg: #dc2626;
  --fn-border: #b91c1c;
  --fn-text: #ffffff;
  --fn-hover-bg: #b91c1c;
  --fn-hover-text: #ffffff;
  --fn-hover-border: #991b1b;
  --fn-shadow: 0 1px 3px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  --fn-hover-shadow: 0 2px 8px rgba(220, 38, 38, 0.5);
}

html, body {
  background: var(--gc-bg) !important;
  color: var(--gc-text) !important;
}

/* Floating overlay scrollbars (no reserved gutter): falls back to classic
   auto where overlay is unsupported. Note: Chromium may revert overlay to
   classic rendering while custom ::-webkit-scrollbar widths are set. */
html {
  overflow-y: auto;
  overflow-y: overlay;
  overflow-x: auto;
  overflow-x: overlay;
}

body {
  zoom: var(--gc-zoom, 1);
  padding: 24px 28px !important;
  padding-bottom: 30vh !important;
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

h1 {
  font-size: 34px !important;
  margin-top: 20px !important;
  margin-bottom: 24px !important;
  position: relative !important;
}

h1::after {
  content: "" !important;
  display: block !important;
  width: 70px !important;
  height: 6px !important;
  background-color: #af3c43 !important;
  margin-top: 10px !important;
}

h2 {
  font-size: 26px !important;
  margin-top: 24px !important;
  margin-bottom: 12px !important;
}

h3 {
  font-size: 20px !important;
  margin-top: 20px !important;
  margin-bottom: 10px !important;
}

h4 {
  font-size: 18px !important;
  margin-top: 16px !important;
  margin-bottom: 8px !important;
}

h5 {
  font-size: 16px !important;
  margin-top: 14px !important;
  margin-bottom: 6px !important;
}

h6 {
  font-size: 14px !important;
  margin-top: 12px !important;
  margin-bottom: 4px !important;
}

.alert h1::after, .alert > h1::after,
.panel-heading h1::after, .panel-title h1::after {
  display: none !important;
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

/* Lists & WET List Styles */
ul {
  list-style-type: disc !important;
  padding-left: 28px !important;
  margin-top: 0 !important;
  margin-bottom: 12px !important;
}
ul ul {
  list-style-type: circle !important;
  margin-top: 4px !important;
  margin-bottom: 6px !important;
}
ul ul ul {
  list-style-type: square !important;
}

ol {
  list-style-type: decimal !important;
  padding-left: 28px !important;
  margin-top: 0 !important;
  margin-bottom: 12px !important;
}
ol ol {
  list-style-type: lower-alpha !important;
  margin-top: 4px !important;
  margin-bottom: 6px !important;
}
ol ol ol {
  list-style-type: lower-roman !important;
}

li {
  margin-bottom: 6px !important;
}
li > p {
  margin-top: 0 !important;
  margin-bottom: 6px !important;
}
li > p:last-child {
  margin-bottom: 0 !important;
}

/* WET / GCWeb Ordered List Type Classes */
ol.lst-lwr-alph, .lst-lwr-alph, ol[type="a"],
ol.lst-lwr-alph > li, .lst-lwr-alph > li {
  list-style-type: lower-alpha !important;
}
ol.lst-upr-alph, .lst-upr-alph, ol[type="A"],
ol.lst-upr-alph > li, .lst-upr-alph > li {
  list-style-type: upper-alpha !important;
}
ol.lst-lwr-rmn, .lst-lwr-rmn, ol[type="i"],
ol.lst-lwr-rmn > li, .lst-lwr-rmn > li {
  list-style-type: lower-roman !important;
}
ol.lst-upr-rmn, .lst-upr-rmn, ol[type="I"],
ol.lst-upr-rmn > li, .lst-upr-rmn > li {
  list-style-type: upper-roman !important;
}
ol.lst-num, .lst-num, ol[type="1"],
ol.lst-num > li, .lst-num > li {
  list-style-type: decimal !important;
}
.lst-spcd > li, ul.lst-spcd > li, ol.lst-spcd > li {
  margin-top: 12px !important;
  margin-bottom: 12px !important;
}

/* Unstyled and Inline Lists */
ul.list-unstyled, ol.list-unstyled,
.list-unstyled,
ul.list-inline, ol.list-inline,
.list-inline {
  padding-left: 0 !important;
  list-style: none !important;
  list-style-type: none !important;
}

ul.list-unstyled > li, ol.list-unstyled > li,
.list-unstyled > li,
.list-unstyled li {
  list-style: none !important;
  list-style-type: none !important;
}

ul.list-inline > li, ol.list-inline > li,
.list-inline > li {
  display: inline-block !important;
  padding-right: 5px !important;
  padding-left: 5px !important;
  list-style: none !important;
  list-style-type: none !important;
}

/* GCWeb Steps cards (gc-stp-stp): each <li> as a container, .active highlighted */
.gc-stp-stp .row {
  display: flex !important;
  flex-wrap: wrap !important;
  margin-left: -10px !important;
  margin-right: -10px !important;
  align-items: stretch !important;
}
.gc-stp-stp ul.toc,
.gc-stp-stp ul.list-unstyled {
  display: flex !important;
  flex-wrap: wrap !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
.gc-stp-stp li.col-md-4,
.gc-stp-stp li.col-sm-6,
.gc-stp-stp ul.toc > li {
  flex: 0 0 calc(33.333% - 20px) !important;
  max-width: calc(33.333% - 20px) !important;
  margin: 0 10px 20px 10px !important;
  padding: 0 !important;
  display: flex !important;
  box-sizing: border-box !important;
}
@media (max-width: 991px) {
  .gc-stp-stp li.col-md-4,
  .gc-stp-stp li.col-sm-6,
  .gc-stp-stp ul.toc > li {
    flex: 0 0 calc(50% - 20px) !important;
    max-width: calc(50% - 20px) !important;
  }
}
@media (max-width: 575px) {
  .gc-stp-stp li.col-md-4,
  .gc-stp-stp li.col-sm-6,
  .gc-stp-stp ul.toc > li {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}
.gc-stp-stp a.list-group-item,
a.list-group-item.eqht-trgt {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  padding: 14px 18px !important;
  background: var(--gc-card-bg) !important;
  background-color: var(--gc-card-bg) !important;
  border: 1px solid var(--gc-border) !important;
  border-radius: 4px !important;
  color: var(--gc-text) !important;
  text-decoration: none !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.2) !important;
}
.gc-stp-stp a.list-group-item:hover,
a.list-group-item.eqht-trgt:hover {
  border-color: var(--gc-link) !important;
  text-decoration: underline !important;
}
.gc-stp-stp a.list-group-item.active,
.gc-stp-stp a.list-group-item.active:visited,
.gc-stp-stp a.list-group-item.active:hover,
.gc-stp-stp li.active > a.list-group-item,
a.list-group-item.active,
a.list-group-item.eqht-trgt.active {
  background: #2572b4 !important;
  background-color: #2572b4 !important;
  border-color: #2572b4 !important;
  color: #ffffff !important;
}
body.gc-light-mode .gc-stp-stp a.list-group-item {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-color: #dddddd !important;
  color: #333333 !important;
  box-shadow: 0 1px 1px rgba(0,0,0,.05) !important;
}
body.gc-light-mode .gc-stp-stp a.list-group-item.active,
body.gc-light-mode .gc-stp-stp a.list-group-item.active:visited,
body.gc-light-mode .gc-stp-stp a.list-group-item.active:hover,
body.gc-light-mode .gc-stp-stp li.active > a.list-group-item,
body.gc-light-mode a.list-group-item.active,
body.gc-light-mode a.list-group-item.eqht-trgt.active {
  background: #2572b4 !important;
  background-color: #2572b4 !important;
  border-color: #2572b4 !important;
  color: #ffffff !important;
}

.alert, section.alert, div.alert, aside.alert {
  position: relative !important;
  margin-top: 1.5em !important;
  margin-bottom: 1.5em !important;
  padding: 10px 0 8px 30px !important;
  border: none !important;
  border-left: 6px solid #269abc !important;
  border-radius: 0 !important;
  box-sizing: border-box !important;
  display: block !important;
  background: transparent !important;
  background-color: transparent !important;
  color: var(--gc-text, #f3f4f6) !important;
}

.alert::before {
  content: "" !important;
  position: absolute !important;
  left: -16px !important;
  top: 8px !important;
  width: 26px !important;
  height: 26px !important;
  border-radius: 50% !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  box-shadow: 0 0 0 3.5px var(--gc-bg, #18181b) !important;
  z-index: 2 !important;
}
body.gc-light-mode .alert::before {
  box-shadow: 0 0 0 3.5px #ffffff !important;
}

.alert h1, .alert h2, .alert h3, .alert h4, .alert h5, .alert h6,
.alert > h1, .alert > h2, .alert > h3, .alert > h4, .alert > h5, .alert > h6 {
  margin-top: 0 !important;
  margin-bottom: 8px !important;
  font-size: 1.35em !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  letter-spacing: normal !important;
  color: #ffffff !important;
}

.alert p, .alert > p {
  margin-top: 0 !important;
  margin-bottom: 10px !important;
  line-height: 1.5 !important;
  color: var(--gc-text, #f3f4f6) !important;
}

.alert ul, .alert ol {
  margin-top: 6px !important;
  margin-bottom: 10px !important;
  padding-left: 20px !important;
  color: var(--gc-text, #f3f4f6) !important;
}

.alert li {
  margin-bottom: 4px !important;
  color: var(--gc-text, #f3f4f6) !important;
}

.alert > :last-child,
.alert p:last-child,
.alert ul:last-child,
.alert ol:last-child {
  margin-bottom: 0 !important;
}

.alert a, .alert .alert-link {
  text-decoration: underline !important;
  font-weight: 600 !important;
  color: #93c5fd !important;
}

/* Info Alert (Default contextual alert on Canada.ca) */
.alert-info, section.alert-info, div.alert-info, aside.alert-info,
.alert:not(.alert-warning):not(.alert-danger):not(.alert-success) {
  border-left-color: #269abc !important;
}
.alert-info::before, section.alert-info::before, div.alert-info::before, aside.alert-info::before,
.alert:not(.alert-warning):not(.alert-danger):not(.alert-success)::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23269abc'/%3E%3Ccircle cx='12' cy='7' r='1.6' fill='%23ffffff'/%3E%3Crect x='10.4' y='10.5' width='3.2' height='7.5' rx='1' fill='%23ffffff'/%3E%3C/svg%3E") !important;
}

/* Warning Alert */
.alert-warning, section.alert-warning, div.alert-warning, aside.alert-warning {
  border-left-color: #ee7100 !important;
}
.alert-warning::before, section.alert-warning::before, div.alert-warning::before, aside.alert-warning::before {
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: drop-shadow(0 0 2.5px var(--gc-bg, #18181b)) drop-shadow(0 0 1.5px var(--gc-bg, #18181b)) !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' fill='%23ee7100'/%3E%3Crect x='10.75' y='9' width='2.5' height='5.5' rx='1' fill='%23ffffff'/%3E%3Ccircle cx='12' cy='17.2' r='1.35' fill='%23ffffff'/%3E%3C/svg%3E") !important;
}
body.gc-light-mode .alert-warning::before,
body.gc-light-mode section.alert-warning::before,
body.gc-light-mode div.alert-warning::before,
body.gc-light-mode aside.alert-warning::before {
  box-shadow: none !important;
  filter: drop-shadow(0 0 2.5px #ffffff) drop-shadow(0 0 1.5px #ffffff) !important;
}

/* Danger Alert */
.alert-danger, section.alert-danger, div.alert-danger, aside.alert-danger {
  border-left-color: #d3080c !important;
}
.alert-danger::before, section.alert-danger::before, div.alert-danger::before, aside.alert-danger::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23d3080c'/%3E%3Crect x='10.4' y='5.5' width='3.2' height='8.5' rx='1' fill='%23ffffff'/%3E%3Ccircle cx='12' cy='17.5' r='1.6' fill='%23ffffff'/%3E%3C/svg%3E") !important;
}

/* Success Alert */
.alert-success, section.alert-success, div.alert-success, aside.alert-success {
  border-left-color: #278400 !important;
}
.alert-success::before, section.alert-success::before, div.alert-success::before, aside.alert-success::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23278400'/%3E%3Cpolyline points='6.5 12 10.5 16 17.5 8.5' fill='none' stroke='%23ffffff' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
}

/* Light Mode Alert Overrides */
body.gc-light-mode .alert,
body.gc-light-mode section.alert,
body.gc-light-mode div.alert,
body.gc-light-mode aside.alert {
  color: #333333 !important;
}
body.gc-light-mode .alert h1, body.gc-light-mode .alert h2, body.gc-light-mode .alert h3, body.gc-light-mode .alert h4, body.gc-light-mode .alert h5, body.gc-light-mode .alert h6,
body.gc-light-mode .alert > h1, body.gc-light-mode .alert > h2, body.gc-light-mode .alert > h3, body.gc-light-mode .alert > h4, body.gc-light-mode .alert > h5, body.gc-light-mode .alert > h6 {
  color: #000000 !important;
}
body.gc-light-mode .alert p, body.gc-light-mode .alert li, body.gc-light-mode .alert span, body.gc-light-mode .alert div {
  color: #333333 !important;
}
body.gc-light-mode .alert a, body.gc-light-mode .alert .alert-link {
  color: #284162 !important;
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

/* Contextual Background Classes */
.bg-primary,
thead.bg-primary,
thead.bg-primary th,
thead.bg-primary td,
tr.bg-primary,
tr.bg-primary th,
tr.bg-primary td,
th.bg-primary,
td.bg-primary,
body.gc-light-mode thead.bg-primary th,
body.gc-light-mode thead.bg-primary td,
body.gc-light-mode tr.bg-primary th,
body.gc-light-mode tr.bg-primary td,
body.gc-light-mode th.bg-primary,
body.gc-light-mode td.bg-primary {
  background-color: #2572b4 !important;
  color: #ffffff !important;
  border-color: #1d5b90 !important;
}

.bg-primary a,
.bg-primary a:link,
.bg-primary a:visited,
thead.bg-primary a,
thead.bg-primary a:link,
thead.bg-primary a:visited,
tr.bg-primary a,
tr.bg-primary a:link,
tr.bg-primary a:visited,
th.bg-primary a,
th.bg-primary a:link,
th.bg-primary a:visited,
td.bg-primary a,
td.bg-primary a:link,
td.bg-primary a:visited {
  color: #ffffff !important;
  text-decoration: underline !important;
}

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

figure {
  margin: 0 0 24px 0 !important;
  display: block !important;
}

figcaption {
  font-size: 1.1em !important;
  margin-bottom: 10px !important;
  color: var(--gc-heading) !important;
  line-height: 1.4 !important;
}

img, .img-responsive {
  display: block !important;
  max-width: 100% !important;
  height: auto !important;
  margin-bottom: 15px !important;
}

img.gc-img-replaced {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}

/* Responsive Image Placeholder for missing, empty src, or root-relative images */
.gc-img-placeholder {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 140px !important;
  padding: 20px 16px !important;
  margin-bottom: 15px !important;
  background-color: #1e2430 !important;
  border: 1.5px dashed #475569 !important;
  border-radius: 6px !important;
  color: #94a3b8 !important;
  text-align: center !important;
  box-sizing: border-box !important;
  user-select: none !important;
}

body.gc-light-mode .gc-img-placeholder {
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
  color: #64748b !important;
}

.gc-img-placeholder-icon {
  width: 32px !important;
  height: 32px !important;
  margin-bottom: 8px !important;
  opacity: 0.8 !important;
  stroke: currentColor !important;
}

.gc-img-placeholder-title {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--gc-heading) !important;
  margin-bottom: 4px !important;
}

.gc-img-placeholder-sub {
  font-size: 12px !important;
  color: var(--gc-text-muted) !important;
  font-family: Menlo, Monaco, Consolas, monospace !important;
  word-break: break-all !important;
  max-width: 90% !important;
}

.gc-img-placeholder.gc-swap-active,
[data-swap-index].gc-img-placeholder.gc-swap-active {
  outline: 2.5px solid #8b5cf6 !important;
  outline-offset: 2px !important;
  border-color: #8b5cf6 !important;
  border-style: solid !important;
  background-color: rgba(139, 92, 246, 0.16) !important;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25) !important;
}

body.gc-light-mode .gc-img-placeholder.gc-swap-active,
body.gc-light-mode [data-swap-index].gc-img-placeholder.gc-swap-active {
  outline: 2.5px solid #7c3aed !important;
  outline-offset: 2px !important;
  border-color: #7c3aed !important;
  border-style: solid !important;
  background-color: rgba(124, 58, 237, 0.1) !important;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2) !important;
}

img.gc-swap-active {
  outline: 2.5px solid #8b5cf6 !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25) !important;
}

body.gc-light-mode img.gc-swap-active {
  outline: 2.5px solid #7c3aed !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2) !important;
}

details {
  border: 1px solid #334155 !important;
  background-color: rgba(255, 255, 255, 0.03) !important;
  border-radius: 4px !important;
  padding: 10px 14px !important;
  margin-bottom: 15px !important;
  transition: border-color 0.15s ease, background-color 0.15s ease !important;
}
details:hover {
  border-color: #334155 !important;
  background-color: rgba(255, 255, 255, 0.03) !important;
}
body.gc-light-mode details {
  border: 1px solid #cccccc !important;
  background-color: #ffffff !important;
}
body.gc-light-mode details:hover {
  border-color: #cccccc !important;
  background-color: #ffffff !important;
}
summary {
  font-weight: 700 !important;
  color: var(--gc-link) !important;
  cursor: pointer !important;
  outline: none !important;
  user-select: none !important;
}
summary.gc-swap-editable,
summary[contenteditable="true"],
.gc-swap-editable summary {
  user-select: text !important;
  cursor: text !important;
}
summary.gc-swap-editable:focus,
summary[contenteditable="true"]:focus,
.gc-swap-editable summary:focus {
  user-select: text !important;
  cursor: text !important;
  outline: 2px solid #2563eb !important;
  outline-offset: 2px !important;
}
summary:hover {
  text-decoration: none !important;
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

/* WET Accessibility Hidden Text */
.wb-inv,
.wb-invisible,
.wb-sr-only {
  clip: rect(1px, 1px, 1px, 1px) !important;
  clip-path: polygon(0px 0px, 0px 0px, 0px 0px) !important;
  height: 1px !important;
  margin: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  width: 1px !important;
  white-space: nowrap !important;
}

/* Footnotes Superscript & Square Button Design */
sup {
  font-size: 75% !important;
  line-height: 0 !important;
  position: relative !important;
  vertical-align: baseline !important;
  top: -0.45em !important;
}

sup:has(a.fn-lnk),
sup:has(.fn-lnk) {
  font-size: 100% !important;
  top: -0.42em !important;
  margin: 0 1.5px !important;
  display: inline-block !important;
  vertical-align: baseline !important;
  line-height: 0 !important;
}

a.fn-lnk,
sup a.fn-lnk,
a.fn-lnk:link,
a.fn-lnk:visited {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 20px !important;
  height: 20px !important;
  padding: 0 4px !important;
  margin: 0 1.5px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  text-align: center !important;
  text-decoration: none !important;
  border-radius: 4px !important;
  border: 1px solid var(--fn-border) !important;
  background: var(--fn-bg) !important;
  color: var(--fn-text) !important;
  box-shadow: var(--fn-shadow) !important;
  cursor: pointer !important;
  user-select: none !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

a.fn-lnk:not(sup a) {
  position: relative !important;
  top: -0.42em !important;
}

a.fn-lnk:hover,
a.fn-lnk:focus,
sup a.fn-lnk:hover,
sup a.fn-lnk:focus {
  background: var(--fn-hover-bg) !important;
  color: var(--fn-hover-text) !important;
  border-color: var(--fn-hover-border) !important;
  box-shadow: var(--fn-hover-shadow), 0 0 0 2px rgba(239, 68, 68, 0.35) !important;
  transform: translateY(-1.5px) !important;
  text-decoration: none !important;
  outline: none !important;
}

body.gc-light-mode a.fn-lnk:hover,
body.gc-light-mode a.fn-lnk:focus,
body.gc-light-mode sup a.fn-lnk:hover,
body.gc-light-mode sup a.fn-lnk:focus {
  box-shadow: var(--fn-hover-shadow), 0 0 0 2px rgba(220, 38, 38, 0.3) !important;
}

a.fn-lnk:active,
sup a.fn-lnk:active {
  transform: translateY(0.5px) scale(0.96) !important;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2) !important;
}

/* Footnote Return Links */
.fn-rtn {
  margin-top: 6px !important;
  margin-bottom: 8px !important;
}

.fn-rtn a,
a.fn-rtn,
a.fn-rtn:link,
a.fn-rtn:visited {
  display: inline !important;
  padding: 0 !important;
  font-size: inherit !important;
  font-weight: 400 !important;
  line-height: inherit !important;
  text-decoration: underline !important;
  border: 0 !important;
  background: transparent !important;
  color: #60a5fa !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: color 0.15s ease-in-out !important;
}

.fn-rtn a::before,
a.fn-rtn::before {
  content: none !important;
}

.fn-rtn a:hover,
.fn-rtn a:focus,
a.fn-rtn:hover,
a.fn-rtn:focus {
  background: transparent !important;
  color: #93c5fd !important;
  border: 0 !important;
  box-shadow: none !important;
  transform: none !important;
  text-decoration: underline !important;
}

body.gc-light-mode .fn-rtn a,
body.gc-light-mode a.fn-rtn {
  background: transparent !important;
  border: 0 !important;
  color: #2563eb !important;
  box-shadow: none !important;
}

body.gc-light-mode .fn-rtn a:hover,
body.gc-light-mode .fn-rtn a:focus,
body.gc-light-mode a.fn-rtn:hover,
body.gc-light-mode a.fn-rtn:focus {
  background: transparent !important;
  color: #1d4ed8 !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Footnotes Section & Lists */
aside.wb-fnote,
div.wb-fnote,
.wb-fnote {
  margin-top: 2.5rem !important;
  padding-top: 1.25rem !important;
  border-top: 1.5px solid var(--gc-border) !important;
}

.wb-fnote h2 {
  font-size: 20px !important;
  margin-top: 0 !important;
  margin-bottom: 16px !important;
  color: var(--gc-heading) !important;
}

.wb-fnote dl {
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr) !important;
  column-gap: 24px !important;
  align-items: start !important;
}

.wb-fnote dt {
  display: none !important;
}

.wb-fnote dd {
  grid-column: 1 / -1 !important;
  display: grid !important;
  grid-template-columns: 32px minmax(0, 1fr) !important;
  column-gap: 12px !important;
  align-items: start !important;
  margin-left: 0 !important;
  margin-bottom: 20px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
}

body.gc-light-mode .wb-fnote dd {
  background: transparent !important;
  border: 0 !important;
}

.wb-fnote dd p:not(.fn-rtn) {
  grid-column: 2 !important;
}

.wb-fnote dd p.fn-rtn {
  grid-column: 1 !important;
  grid-row: 1 !important;
  margin: 0 !important;
  padding-top: 0 !important;
}

@media (max-width: 700px) {
  .wb-fnote dl {
    display: block !important;
  }

  .wb-fnote dt {
    display: none !important;
  }

  .wb-fnote dd {
    display: grid !important;
    grid-template-columns: 32px minmax(0, 1fr) !important;
    margin-bottom: 14px !important;
  }
}

.wb-fnote dd p:last-child {
  margin-bottom: 0 !important;
}

/* Target Pulse Highlight on Jump */
:target {
  scroll-margin-top: 50px !important;
}

.wb-fnote dd:target,
.wb-fnote dt:target,
sup:target a.fn-lnk,
a.fn-lnk:target {
  animation: gc-footnote-pulse 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
}

@keyframes gc-footnote-pulse {
  0% {
    background-color: rgba(239, 68, 68, 0.35) !important;
    outline: 2px solid #ef4444 !important;
    outline-offset: 2px !important;
  }
  60% {
    background-color: rgba(239, 68, 68, 0.12) !important;
    outline: 2px solid rgba(239, 68, 68, 0.4) !important;
    outline-offset: 2px !important;
  }
  100% {
    outline: 2px solid transparent !important;
    outline-offset: 0 !important;
  }
}

[data-swap-index] {
  /* No outline transition: easing the outline interpolates its color from
     the block's (near-white) text color to purple, flashing white on every
     active-block move. The bar must snap on/off instantly. */
  transition: opacity .2s ease, filter .2s ease;
  position: relative;
}

.gc-li-content {
  display: block;
  border-radius: 2px;
  margin-bottom: 4px;
}

.gc-br-line {
  display: inline;
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
  outline: 2px solid #8b5cf6 !important;
  outline-offset: 3px;
}

/* Footnote landing flash: bottom-of-page targets can't scroll earlier notes
   out of view (maxScroll saturates), so the landed note pulses instead to
   unambiguously mark which one the jump was for. */
.gc-fn-landed {
  animation: gc-fn-land 1.6s ease-out 2 !important;
  border-radius: 4px;
}
@keyframes gc-fn-land {
  0%, 100% { background-color: transparent !important; }
  25% { background-color: rgba(139, 92, 246, 0.35) !important; }
}
.gc-swap-active:not(.gc-swap-missing):not(.gc-swap-extra) {
  background: transparent !important;
}

.gc-swap-missing {
  background: rgba(245, 158, 11, 0.14) !important;
  border-left: 3px solid #f59e0b !important;
  color: #fbbf24 !important;
  padding-left: 6px !important;
  border-radius: 2px;
}
.gc-swap-missing,
.gc-swap-missing > *,
.gc-swap-missing a,
.gc-swap-missing p,
.gc-swap-missing span,
.gc-swap-missing strong,
.gc-swap-missing em,
.gc-swap-missing h1,
.gc-swap-missing h2,
.gc-swap-missing h3,
.gc-swap-missing h4,
.gc-swap-missing h5,
.gc-swap-missing h6 {
  color: #fbbf24 !important;
}
body.gc-light-mode .gc-swap-missing {
  background: rgba(245, 158, 11, 0.14) !important;
  border-left: 3px solid #d97706 !important;
  color: #92400e !important;
}
body.gc-light-mode .gc-swap-missing,
body.gc-light-mode .gc-swap-missing > *,
body.gc-light-mode .gc-swap-missing a,
body.gc-light-mode .gc-swap-missing p,
body.gc-light-mode .gc-swap-missing span,
body.gc-light-mode .gc-swap-missing strong,
body.gc-light-mode .gc-swap-missing em,
body.gc-light-mode .gc-swap-missing h1,
body.gc-light-mode .gc-swap-missing h2,
body.gc-light-mode .gc-swap-missing h3,
body.gc-light-mode .gc-swap-missing h4,
body.gc-light-mode .gc-swap-missing h5,
body.gc-light-mode .gc-swap-missing h6 {
  color: #92400e !important;
}
.gc-swap-missing.gc-swap-active {
  background: rgba(245, 158, 11, 0.24) !important;
  outline: 2px solid #f59e0b !important;
  outline-offset: 3px;
}
body.gc-light-mode .gc-swap-missing.gc-swap-active {
  background: rgba(245, 158, 11, 0.24) !important;
  outline: 2px solid #d97706 !important;
  outline-offset: 3px;
}

.gc-swap-extra {
  background: rgba(59, 130, 246, 0.12) !important;
  border-left: 3px solid #3b82f6 !important;
  color: #60a5fa !important;
  padding-left: 6px !important;
  border-radius: 2px;
}
.gc-swap-extra,
.gc-swap-extra > *,
.gc-swap-extra a,
.gc-swap-extra p,
.gc-swap-extra span,
.gc-swap-extra strong,
.gc-swap-extra em,
.gc-swap-extra h1,
.gc-swap-extra h2,
.gc-swap-extra h3,
.gc-swap-extra h4,
.gc-swap-extra h5,
.gc-swap-extra h6 {
  color: #60a5fa !important;
}
body.gc-light-mode .gc-swap-extra {
  background: rgba(37, 99, 235, 0.1) !important;
  border-left: 3px solid #2563eb !important;
  color: #1e40af !important;
}
body.gc-light-mode .gc-swap-extra,
body.gc-light-mode .gc-swap-extra > *,
body.gc-light-mode .gc-swap-extra a,
body.gc-light-mode .gc-swap-extra p,
body.gc-light-mode .gc-swap-extra span,
body.gc-light-mode .gc-swap-extra strong,
body.gc-light-mode .gc-swap-extra em,
body.gc-light-mode .gc-swap-extra h1,
body.gc-light-mode .gc-swap-extra h2,
body.gc-light-mode .gc-swap-extra h3,
body.gc-light-mode .gc-swap-extra h4,
body.gc-light-mode .gc-swap-extra h5,
body.gc-light-mode .gc-swap-extra h6 {
  color: #1e40af !important;
}
.gc-swap-extra.gc-swap-active {
  background: rgba(59, 130, 246, 0.22) !important;
  outline: 2px solid #3b82f6 !important;
  outline-offset: 3px;
}
body.gc-light-mode .gc-swap-extra.gc-swap-active {
  background: rgba(37, 99, 235, 0.18) !important;
  outline: 2px solid #2563eb !important;
  outline-offset: 3px;
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

/* Parent list items keep their native marker on the <li> while the indexed
   text lives in the inner .gc-li-content span, so the dim/blur rules above
   miss the bullet. ::marker only accepts color (not opacity/filter), so fade
   it with color-mix instead: toward transparent to match focus dimming,
   toward the canvas background to approximate blur wash-out. */
body.mode-focus li:has(> .gc-li-content[data-swap-index]:not(.gc-swap-active))::marker {
  color: color-mix(in srgb, currentColor 30%, transparent) !important;
}
body.mode-blur li:has(> .gc-li-content[data-swap-index]:not(.gc-swap-active))::marker {
  color: color-mix(in srgb, currentColor 35%, var(--gc-bg, #121316)) !important;
}

body.hide-highlight .gc-swap-active,
body.hide-highlight .gc-swap-missing.gc-swap-active,
body.hide-highlight .gc-swap-extra.gc-swap-active,
body.hide-highlight img.gc-swap-active {
  outline: none !important;
  outline-offset: 0 !important;
  box-shadow: none !important;
}
body.hide-highlight .gc-img-placeholder.gc-swap-active,
body.hide-highlight [data-swap-index].gc-img-placeholder.gc-swap-active {
  outline: none !important;
  outline-offset: 0 !important;
  border-color: #475569 !important;
  border-style: dashed !important;
  background-color: #1e2430 !important;
  box-shadow: none !important;
}
body.hide-highlight.gc-light-mode .gc-img-placeholder.gc-swap-active,
body.hide-highlight.gc-light-mode [data-swap-index].gc-img-placeholder.gc-swap-active {
  border-color: #cbd5e1 !important;
  background-color: #f8fafc !important;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--gc-bg); border-radius: 9999px; }
::-webkit-scrollbar-thumb { background: #6258d9; border-radius: 9999px; border: none; }
::-webkit-scrollbar-thumb:hover { background: #8278ee; }
@supports not selector(::-webkit-scrollbar) {
  * { scrollbar-color: #6258d9 #191919; }
}

/* Symmetra In-Iframe Search Highlighting */
mark.symmetra-search-hit {
  background-color: rgba(245, 158, 11, 0.42) !important;
  color: inherit !important;
  border-radius: 2px !important;
  padding: 0 1px !important;
  outline: 1px solid rgba(245, 158, 11, 0.8) !important;
  display: inline !important;
}
mark.symmetra-search-hit.is-current {
  background-color: #f59e0b !important;
  color: #000000 !important;
  outline: 2px solid #d97706 !important;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.85) !important;
  font-weight: 700 !important;
}
`;

const MAX_UNDO_STACK = 40;

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];

const splitDocxBlocksOnBr = wrapBrSegments;

const IMAGE_PLACEHOLDER_SCRIPT = `
  function initImagePlaceholders() {
    const images = Array.from(document.querySelectorAll('img'));
    images.forEach((img) => {
      if (img.dataset.placeholderHandled) return;
      img.dataset.placeholderHandled = 'true';

      const src = (img.getAttribute('src') || '').trim();
      const alt = (img.getAttribute('alt') || '').trim();

      const showPlaceholder = () => {
        if (img.classList.contains('gc-img-replaced')) return;
        img.classList.add('gc-img-replaced');
        img.style.setProperty('display', 'none', 'important');

        if (img.nextElementSibling && img.nextElementSibling.classList.contains('gc-img-placeholder')) {
          return;
        }

        const placeholder = document.createElement('div');
        placeholder.className = 'gc-img-placeholder';
        const swapIdx = img.getAttribute('data-swap-index') || img.getAttribute('data-en-index') || img.getAttribute('data-fr-index') || img.getAttribute('data-docx-index');
        if (swapIdx) {
          placeholder.setAttribute('data-swap-index', swapIdx);
        }
        const enIdx = img.getAttribute('data-en-index');
        if (enIdx) placeholder.setAttribute('data-en-index', enIdx);
        const frIdx = img.getAttribute('data-fr-index');
        if (frIdx) placeholder.setAttribute('data-fr-index', frIdx);
        const docxIdx = img.getAttribute('data-docx-index');
        if (docxIdx) placeholder.setAttribute('data-docx-index', docxIdx);

        if (img.classList.contains('gc-swap-active')) {
          placeholder.classList.add('gc-swap-active');
        }
        img.removeAttribute('data-swap-index');

        const iconSvg = '<svg class="gc-img-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        const isFr = document.documentElement.lang === 'fr';
        const altLabel = isFr ? 'Texte alt' : 'Alt text';
        const altTextDisplay = alt ? (altLabel + ': ' + alt) : (altLabel + ': (None / Aucun)');
        const subText = src ? src : '(Image source: src="")';

        placeholder.innerHTML = iconSvg +
          '<div class="gc-img-placeholder-title">' + altTextDisplay + '</div>' +
          '<div class="gc-img-placeholder-sub">' + subText + '</div>';

        if (img.parentNode) {
          img.parentNode.insertBefore(placeholder, img.nextSibling);
        }
      };

      if (!src || src === '#' || (!src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://'))) {
        showPlaceholder();
      } else {
        img.addEventListener('error', showPlaceholder);
        if (img.complete && img.naturalWidth === 0) {
          showPlaceholder();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImagePlaceholders);
  } else {
    initImagePlaceholders();
  }
`;

const DETAILS_TOGGLE_SCRIPT = (lang) => `
  (function setupDetailsSync() {
    function initDetailsSync() {
      function sendDetailsMessage(msgType, details, isOpen) {
        const allDetails = Array.from(document.querySelectorAll('details'));
        const detailsIndex = allDetails.indexOf(details);
        const summary = details.querySelector('summary');
        const swapIndex = summary ? (summary.getAttribute('data-swap-index') || summary.getAttribute('data-en-index')) : null;
        const enIndex = summary ? summary.getAttribute('data-en-index') : null;
        const frIndex = summary ? summary.getAttribute('data-fr-index') : null;
        window.parent.postMessage({
          type: msgType,
          side: '${lang}',
          open: isOpen,
          detailsIndex: detailsIndex,
          swapIndex: swapIndex ? parseInt(swapIndex, 10) : null,
          enIndex: enIndex ? parseInt(enIndex, 10) : null,
          frIndex: frIndex ? parseInt(frIndex, 10) : null,
        }, '*');
      }

      document.addEventListener('toggle', (e) => {
        const details = e.target.closest('details');
        if (!details || details._programmatic) return;
        sendDetailsMessage('symmetra-toggle-details', details, details.open);
      }, true);

      document.addEventListener('click', (e) => {
        const summary = e.target.closest('summary');
        if (!summary) return;
        const details = summary.closest('details');
        if (!details) return;

        // If this summary is editable, clicking into the text to edit should not collapse the details
        if (summary.isContentEditable || summary.hasAttribute('contenteditable') || summary.classList.contains('gc-swap-editable')) {
          const rect = summary.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (details.open && clickX > 28) {
            e.preventDefault();
            summary.focus();
            return;
          }
        }

        if (details.open) {
          details._userClosed = true;
        } else {
          details._userClosed = false;
        }
      }, true);

      document.addEventListener('keydown', (e) => {
        const summary = e.target.closest('summary');
        if (!summary) return;
        if (summary.isContentEditable || summary.hasAttribute('contenteditable') || summary.classList.contains('gc-swap-editable')) {
          if (e.key === ' ' || e.code === 'Space') {
            e.stopPropagation();
          }
        }
      }, true);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDetailsSync);
    } else {
      initDetailsSync();
    }
  })();
`;

const CONTEXT_MENU_INJECTED_SCRIPT = (side) => `
  (function setupIframeContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target.closest('[data-swap-index], [data-fr-index], [data-en-index], .gc-swap-missing, .gc-swap-extra, [data-extra-fr], p, h1, h2, h3, h4, h5, h6, li, dd, dt, th, td, blockquote, figcaption, div, section, article, table, img, a') || e.target;
      const text = target ? (target.textContent || '').trim() : '';
      const lower = text.toLowerCase();

      const isMissing = Boolean(
        (target && target.classList && target.classList.contains('gc-swap-missing')) ||
        lower.includes('translation missing') ||
        lower.includes('traduction manquante') ||
        lower.includes('french content missing') ||
        (target && target.getAttribute && /missing/i.test(target.getAttribute('title') || ''))
      );

      const isExtra = Boolean(
        (target && ((target.classList && target.classList.contains('gc-swap-extra')) || (target.hasAttribute && target.hasAttribute('data-extra-fr')))) ||
        lower.includes('extra french content') ||
        lower.includes('contenu français supplémentaire') ||
        lower.includes('contenu francais supplementaire') ||
        (target && target.getAttribute && /extra/i.test(target.getAttribute('title') || ''))
      );

      let enIdx = null;
      let frIdx = null;
      if (target && target.getAttribute) {
        const rawEn = target.getAttribute('data-en-index') || target.getAttribute('data-swap-index') || target.closest('[data-swap-index]')?.getAttribute('data-swap-index');
        if (rawEn !== null && rawEn !== undefined && rawEn !== '') enIdx = parseInt(rawEn, 10);
        const rawFr = target.getAttribute('data-fr-index') || target.closest('[data-fr-index]')?.getAttribute('data-fr-index');
        if (rawFr !== null && rawFr !== undefined && rawFr !== '') frIdx = parseInt(rawFr, 10);
      }

      let selText = '';
      try {
        selText = (window.getSelection ? window.getSelection().toString() : '').trim();
      } catch (_) {}

      window.parent.postMessage({
        type: 'symmetra-context-menu',
        kind: isExtra ? 'extra' : (isMissing ? 'missing' : 'block'),
        enIndex: !isNaN(enIdx) && enIdx !== null ? enIdx : null,
        frIndex: !isNaN(frIdx) && frIdx !== null ? frIdx : null,
        text: text,
        selectedText: selText,
        clientX: e.clientX,
        clientY: e.clientY,
        side: '${side}'
      }, '*');
    }, true);

    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) {
        window.parent.postMessage({ type: 'symmetra-close-context-menu' }, '*');
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.isContentEditable) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({ type: 'symmetra-undo' }, '*');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({ type: 'symmetra-open-search', side: '${side}' }, '*');
        return;
      }
    }, true);
  })();
`;

const syncDetailsHover = syncDetailsToggle;

// Insert position for a newly-translated missing EN block: spliced between
// neighbouring aligned FR indices so frBlocks order keeps matching code
// order (see inline-edit.js). Appending at the end breaks code-view sync.
function getFrInsertIndexForEnMsg(enIndex) {
  const rows = state.alignRows || [];
  const rowPos = rows.findIndex((r) => r && r.enIndex === enIndex);
  if (rowPos === -1) return state.frBlocks.length;
  for (let i = rowPos - 1; i >= 0; i--) {
    const r = rows[i];
    if (r && r.frIndex !== null && r.frIndex !== undefined) {
      const vals = Array.isArray(r.groupedFrIndices) && r.groupedFrIndices.length
        ? r.groupedFrIndices
        : [r.frIndex];
      return Math.min(Math.max(...vals) + 1, state.frBlocks.length);
    }
  }
  for (let i = rowPos + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.frIndex !== null && r.frIndex !== undefined) {
      const vals = Array.isArray(r.groupedFrIndices) && r.groupedFrIndices.length
        ? r.groupedFrIndices
        : [r.frIndex];
      return Math.max(0, Math.min(Math.min(...vals), state.frBlocks.length));
    }
  }
  return state.frBlocks.length;
}

function shiftFrIndicesOnInsertMsg(insertIdx) {
  const bump = (v) => (typeof v === 'number' && v >= insertIdx ? v + 1 : v);
  (state.alignRows || []).forEach((r) => {
    if (!r) return;
    if (r.frIndex !== null && r.frIndex !== undefined && r.frIndex >= insertIdx) r.frIndex += 1;
    if (Array.isArray(r.groupedFrIndices)) r.groupedFrIndices = r.groupedFrIndices.map(bump);
  });
  (state.alignPairs || []).forEach((p) => {
    if (!p) return;
    if (p.frIndex !== null && p.frIndex !== undefined && p.frIndex >= insertIdx) p.frIndex += 1;
    if (Array.isArray(p.groupedFrIndices)) p.groupedFrIndices = p.groupedFrIndices.map(bump);
  });
}

window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'object') return;

  if (e.data.type === 'symmetra-fn-jump') {
    // Footnote citation/return jumps teleport instead of gliding: one
    // synchronous placement, then the exact element is centered in its own
    // frame. No easing loops, no settle timeouts, nothing to fight.
    // TEMP-DEBUG: remove after footnote landing is confirmed.
    try { console.log('[FNJ] recv side=' + e.data.side + ' index=' + e.data.index + ' frIndex=' + e.data.frIndex + ' targetId=' + e.data.targetId); } catch (_) {}
    const { side, index, frIndex, targetId } = e.data;
    let enIdx = (typeof index === 'number' && !isNaN(index)) ? index : null;
    if (enIdx === null && typeof frIndex === 'number' && !isNaN(frIndex)) {
      const pair = state.alignPairs.find((p) => !p.skip && (p.frIndex === frIndex || (p.groupedFrIndices && p.groupedFrIndices.includes(frIndex))));
      if (pair && typeof pair.enIndex === 'number') enIdx = pair.enIndex;
    }
    if (side === 'docx' && enIdx !== null) {
      const pair = state.alignPairs.find((p) => (p.frIndex === enIdx || (p.groupedFrIndices && p.groupedFrIndices.includes(enIdx))) && !p.skip);
      if (pair && typeof pair.enIndex === 'number') enIdx = pair.enIndex;
      else enIdx = Math.max(0, Math.min(enIdx - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
    }
    // Re-resolve the highlight index from the live target element so the
    // active box matches where we actually scroll. Posted indices come from
    // a different block extraction than state.enBlocks and can be one off
    // (e.g. footnote 1 return landing on the Table 1 caption instead of the
    // citation paragraph). The targetId element itself is authoritative.
    if (targetId) {
      try {
        const rFrame = side === 'docx' ? docxPreviewFrame : (side === 'en' ? enPreviewFrame : frPreviewFrame);
        const rDoc = rFrame && (rFrame.contentDocument || (rFrame.contentWindow && rFrame.contentWindow.document));
        let rEl = null;
        try { rEl = rDoc ? rDoc.getElementById(targetId) : null; } catch (_) { rEl = null; }
        if (rEl) {
          const scope = (rEl.closest && (rEl.closest('[data-swap-index], [data-fr-index]') || rEl.querySelector('[data-swap-index], [data-fr-index]'))) || rEl;
          const rawSwap = scope && scope.getAttribute ? scope.getAttribute('data-swap-index') : null;
          const rawFr = scope && scope.getAttribute ? scope.getAttribute('data-fr-index') : null;
          const swapIdx = rawSwap !== null && rawSwap !== undefined && rawSwap !== '' ? parseInt(rawSwap, 10) : NaN;
          const frIdx = rawFr !== null && rawFr !== undefined && rawFr !== '' ? parseInt(rawFr, 10) : NaN;
          if (side === 'docx') {
            if (!isNaN(swapIdx)) {
              const pair = state.alignPairs.find((p) => !p.skip && (p.frIndex === swapIdx || (p.groupedFrIndices && p.groupedFrIndices.includes(swapIdx))));
              if (pair && typeof pair.enIndex === 'number') enIdx = pair.enIndex;
              else if (state.enBlocks && state.enBlocks.length > 0) enIdx = Math.max(0, Math.min(swapIdx - (state.syncOffset || 0), state.enBlocks.length - 1));
              else enIdx = swapIdx;
            } else if (!isNaN(frIdx)) {
              const pair = state.alignPairs.find((p) => !p.skip && (p.frIndex === frIdx || (p.groupedFrIndices && p.groupedFrIndices.includes(frIdx))));
              if (pair && typeof pair.enIndex === 'number') enIdx = pair.enIndex;
            }
          } else if (side === 'fr') {
            if (!isNaN(swapIdx)) enIdx = swapIdx;
            else if (!isNaN(frIdx)) {
              const pair = state.alignPairs.find((p) => !p.skip && (p.frIndex === frIdx || (p.groupedFrIndices && p.groupedFrIndices.includes(frIdx))));
              if (pair && typeof pair.enIndex === 'number') enIdx = pair.enIndex;
            }
          } else {
            if (!isNaN(swapIdx)) enIdx = swapIdx;
          }
        }
      } catch (_) {}
    }
    // State sync needs a resolved block; the landing does not — footnote
    // definitions (DD) are containers, not leaf blocks, so they carry no
    // index. Center by element id whenever one is provided, even unindexed.
    let jumped = false;
    if (!(enIdx === null || enIdx < 0 || (state.enBlocks && state.enBlocks.length > 0 && enIdx >= state.enBlocks.length))) {
      jumpToBlock(enIdx, { instant: true });
      jumped = true;
    }
    // TEMP-DEBUG: remove after footnote landing is confirmed.
    try { console.log('[FNJ] resolved enIdx=' + enIdx); } catch (_) {}
    if (targetId) {
      try {
        const frame = side === 'docx' ? docxPreviewFrame : (side === 'en' ? enPreviewFrame : frPreviewFrame);
        const doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
        const el = doc ? doc.getElementById(targetId) : null;
        if (el) {
          const r = el.getBoundingClientRect();
          const sc = doc.scrollingElement || doc.documentElement;
          if (sc && sc.clientHeight > 0) {
            const max = Math.max(0, sc.scrollHeight - sc.clientHeight);
            const dest = Math.max(0, Math.min(r.top + sc.scrollTop - 40, max));
            // TEMP-DEBUG: remove after footnote landing is confirmed.
            try { console.log('[FNJ] adjust tag=' + el.tagName + '#' + el.id + ' rectTop=' + Math.round(r.top) + ' dest=' + Math.round(dest) + ' max=' + Math.round(max)); } catch (_) {}
            // Land the note near the top (not centered): the previous note
            // must scroll out of view, otherwise it gets read first.
            // Flagged programmatic: its scroll events must not retrigger
            // follower eases after the landing.
            cancelSmoothFollowScroll(sc);
            programmaticScrollEls.add(sc);
            clearFnLandingPin(sc);
            sc.scrollTop = Math.max(0, Math.min(r.top + sc.scrollTop - 40, max));
            let pinIdx = NaN;
            try {
              const pinScope = (el.closest && el.closest('[data-swap-index]')) ||
                (el.querySelector && el.querySelector('[data-swap-index]')) || null;
              const rawPin = pinScope && pinScope.getAttribute ? pinScope.getAttribute('data-swap-index') : null;
              if (rawPin !== null && rawPin !== undefined && rawPin !== '') pinIdx = parseInt(rawPin, 10);
            } catch (_) { pinIdx = NaN; }
            if (!isNaN(pinIdx)) pinFnLanding(sc, pinIdx);
            // Pin the sibling panes on the same block too. Otherwise their
            // scroll-sync re-derives the centre-line block (the one after the
            // citation) and immediately eases this pane back off target.
            if (!isNaN(enIdx)) {
              [[enPreviewFrame, enIdx], [frPreviewFrame, enIdx]].forEach((pair) => {
                const sibFrame = pair[0];
                const sibIdx = pair[1];
                if (!sibFrame || sibFrame === frame) return;
                try {
                  const sibDoc = sibFrame.contentDocument || (sibFrame.contentWindow && sibFrame.contentWindow.document);
                  const sibSc = sibDoc ? (sibDoc.scrollingElement || sibDoc.documentElement) : null;
                  if (sibSc) pinFnLanding(sibSc, sibIdx);
                } catch (_) {}
              });
            }
            setTimeout(() => {
              try { programmaticScrollEls.delete(sc); } catch (_) {}
            }, 80);
            if (!jumped) {
              // No index resolved (e.g. untagged footnote DD): move the bar
              // itself onto the target. Tracked with gc-fn-direct so only the
              // latest landing stays marked across all frames; indexed passes
              // and the next landing clear it.
              try {
                [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
                  try {
                    const dd = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
                    if (dd) {
                      dd.querySelectorAll('.gc-fn-direct').forEach((n) => {
                        try { n.classList.remove('gc-fn-direct'); n.classList.remove('gc-swap-active'); } catch (_) {}
                      });
                    }
                  } catch (_) {}
                });
                el.classList.add('gc-fn-direct');
                el.classList.add('gc-swap-active');
              } catch (_) {}
            }
            try {
              el.classList.remove('gc-fn-landed');
              void el.offsetWidth;
              el.classList.add('gc-fn-landed');
              setTimeout(() => {
                try { el.classList.remove('gc-fn-landed'); } catch (_) {}
              }, 3400);
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
  } else if (e.data.type === 'symmetra-jump') {
    const { side, index } = e.data;
    if (typeof index === 'number' && !isNaN(index)) {
      if (side === 'docx') {
        const pair = state.alignPairs.find(
          (p) => (p.frIndex === index || (p.groupedFrIndices && p.groupedFrIndices.includes(index))) && !p.skip
        );
        if (pair && typeof pair.enIndex === 'number') {
          jumpToBlock(pair.enIndex);
        } else {
          const fallbackEnIdx = Math.max(0, Math.min(index - (state.syncOffset || 0), (state.enBlocks ? state.enBlocks.length - 1 : 0)));
          jumpToBlock(fallbackEnIdx);
        }
      } else {
        jumpToBlock(index);
      }
    }
  } else if (e.data.type === 'symmetra-hover-details' || e.data.type === 'symmetra-toggle-details') {
    const { side, open, detailsIndex, swapIndex, enIndex, frIndex } = e.data;
    syncDetailsHover(side, { open, detailsIndex, swapIndex, enIndex, frIndex });
  } else if (e.data.type === 'frEdit') {
    const { enIndex, frIndex, text } = e.data;
    recordInlineEditUndo(enIndex, frIndex);
    if (frIndex !== null && state.frBlocks[frIndex]) {
      state.frBlocks[frIndex].text = text;
    } else if (enIndex !== null) {
      const pair = state.alignPairs.find((p) => p.enIndex === enIndex);
      if (pair && pair.frIndex !== null && state.frBlocks[pair.frIndex]) {
        state.frBlocks[pair.frIndex].text = text;
      } else if (pair && pair.frIndex === null) {
        const enB = state.enBlocks[enIndex];
        const newFrBlock = {
          tag: enB ? enB.tag : 'p',
          attrTarget: enB ? enB.attrTarget : 'text',
          text: text,
          spans: [],
        };
        const newFrIdx = getFrInsertIndexForEnMsg(enIndex);
        shiftFrIndicesOnInsertMsg(newFrIdx);
        state.frBlocks.splice(newFrIdx, 0, newFrBlock);
        pair.frIndex = newFrIdx;
        pair.groupedFrIndices = [newFrIdx];
        delete pair.mergedFrText;
        delete pair.mergedFrSpans;
        const row = state.alignRows.find((r) => r.enIndex === enIndex);
        if (row) {
          row.frIndex = newFrIdx;
          row.groupedFrIndices = [newFrIdx];
          delete row.mergedFrText;
          delete row.mergedFrSpans;
        }
      }
    }
    state.issueGroups = computeIssues(state.alignRows, state.enBlocks, state.frBlocks, []);
    renderStatsBar();
  } else if (e.data.type === 'symmetra-context-menu') {
    const { kind, enIndex, frIndex, text, selectedText, clientX, clientY, side } = e.data;
    // Custom menu only for EN / FR preview sides — ignore docx and anything else
    if (side !== 'en' && side !== 'fr') {
      closeContextMenu();
      return;
    }
    let targetFrame = frPreviewFrame;
    if (side === 'en') targetFrame = enPreviewFrame;
    else if (side === 'docx') targetFrame = docxPreviewFrame;

    let x = clientX || 0;
    let y = clientY || 0;
    if (targetFrame) {
      try {
        const rect = targetFrame.getBoundingClientRect();
        x += rect.left;
        y += rect.top;
      } catch (_) {}
    }
    openContextMenu({ kind, enIndex, frIndex, text, selectedText, side, x, y });
  } else if (e.data.type === 'symmetra-close-context-menu') {
    closeContextMenu();
  } else if (e.data.type === 'symmetra-undo') {
    undoLastEdit();
  } else if (e.data.type === 'symmetra-open-search') {
    openPanelSearch(e.data.side || 'fr');
  } else if (e.data.type === 'symmetra-close-search') {
    closePanelSearch(e.data.side || 'fr');
  }
});

const COMMON_EN_TERMS = [
  'Social Insurance Number',
  'Employment Insurance',
  'Canada Revenue Agency',
  'Record of Employment',
  'Direct Deposit',
  'My Account',
  'My Service Canada Account',
  'Job Bank',
  'Public Service Commission',
  'Treasury Board of Canada Secretariat',
  'Canada.ca',
  'GCKey',
  'SIN',
  'EI',
  'CRA',
  'ROE',
  'ROA',
  'CPP',
  'OAS',
  'GIS',
  'T4',
  'T5',
  'GST',
  'HST',
  'CCB',
  'WET',
  'WCAG',
  'IT',
  'FAQ'
];

function previewScrollbarCSS(thumb, thumbHover) {
  return `
/* Side-tinted preview scrollbars (injected per pane).
   Standard props are Firefox-only fallbacks under @supports below: in
   Chromium any specified scrollbar-* property disables the
   ::-webkit-scrollbar sizing above. Hover feedback is color-only so the
   bar never shifts layout. */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--gc-bg);
  border-radius: 9999px;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: ${thumb};
  border-radius: 9999px;
  border: none;
}
::-webkit-scrollbar-thumb:hover {
  background: ${thumbHover};
}
@supports not selector(::-webkit-scrollbar) {
  * { scrollbar-color: ${thumbHover} transparent; }
}
`;
}

// EN badge gradient (#00b4d8 → #0284c7); FR badge gradient (#7c3aed → #c026d3).
const EN_SCROLLBAR_CSS = previewScrollbarCSS(
  'linear-gradient(135deg, #00b4d8, #0284c7)',
  '#00b4d8'
);
const FR_SCROLLBAR_CSS = previewScrollbarCSS(
  'linear-gradient(135deg, #7c3aed, #c026d3)',
  '#a855f7'
);

export {
  BLOCK_SELECTOR,
  COMMON_EN_TERMS,
  CONTEXT_MENU_INJECTED_SCRIPT,
  DETAILS_TOGGLE_SCRIPT,
  EN_SCROLLBAR_CSS,
  FR_SCROLLBAR_CSS,
  FRENCH_PDF_H1_CONJUNCTIONS,
  GC_DEPARTMENT_MAPPINGS,
  HIGHLIGHT_CSS,
  IMAGE_PLACEHOLDER_SCRIPT,
  MAX_UNDO_STACK,
  SPAN_TAGS,
  ZOOM_STEPS,
  splitDocxBlocksOnBr,
  syncDetailsHover,
};
