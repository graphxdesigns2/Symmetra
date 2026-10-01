// Auto-generated imports
import {
  generateFrenchPdfSlug,
} from './pdf-side-panel.js';


function localizePdfUrlWithFrenchH1(href, frenchH1) {
  if (!href || typeof href !== 'string') return '';
  const trimmed = href.trim();
  if (!/\.pdf(?:[?#]|$)/i.test(trimmed)) return trimmed;

  const slug = generateFrenchPdfSlug(frenchH1);
  if (!slug) {
    return localizePdfUrl(trimmed);
  }

  const qIdx = trimmed.search(/[?#]/);
  const urlPath = qIdx !== -1 ? trimmed.substring(0, qIdx) : trimmed;
  const suffix = qIdx !== -1 ? trimmed.substring(qIdx) : '';

  const lastSlashIdx = urlPath.lastIndexOf('/');
  const dirPath = lastSlashIdx !== -1 ? urlPath.substring(0, lastSlashIdx + 1) : '';
  const oldFileName = lastSlashIdx !== -1 ? urlPath.substring(lastSlashIdx + 1) : urlPath;

  let langSuffix = '-fra.pdf';
  if (/-en\.pdf/i.test(oldFileName) || /-fr\.pdf/i.test(oldFileName)) {
    langSuffix = '-fr.pdf';
  } else if (/-eng\.pdf/i.test(oldFileName) || /-fra\.pdf/i.test(oldFileName)) {
    langSuffix = '-fra.pdf';
  } else {
    langSuffix = '-fra.pdf';
  }

  const newFileName = `${slug}${langSuffix}`;

  const oldBaseName = oldFileName.replace(/\.pdf$/i, '').replace(/-(?:eng|fra|en|fr)$/i, '');
  let updatedDirPath = dirPath;
  if (oldBaseName && dirPath.endsWith(`/${oldBaseName}/`)) {
    updatedDirPath = dirPath.substring(0, dirPath.length - oldBaseName.length - 1) + `${slug}/`;
  }

  return `${updatedDirPath}${newFileName}${suffix}`;
}

function localizePdfUrl(href) {
  if (!href || typeof href !== 'string') return '';
  const trimmed = href.trim();
  if (!/\.pdf(?:[?#]|$)/i.test(trimmed)) return trimmed;
  if (/-fra\.pdf/i.test(trimmed) || /-fr\.pdf/i.test(trimmed)) return trimmed;
  if (/-eng\.pdf/i.test(trimmed)) {
    return trimmed.replace(/-eng\.pdf/i, '-fra.pdf');
  }
  if (/-en\.pdf/i.test(trimmed)) {
    return trimmed.replace(/-en\.pdf/i, '-fr.pdf');
  }
  return trimmed.replace(/\.pdf([?#]|$)/i, '-fra.pdf$1');
}

function isFragmentHref(href) {
  return typeof href === 'string' && href.trim().startsWith('#');
}

function isCanadaSiteUrlOrPath(href) {
  if (!href || typeof href !== 'string') return false;
  const t = href.trim();
  if (
    t.startsWith('#') ||
    t.startsWith('mailto:') ||
    t.startsWith('tel:') ||
    t.startsWith('javascript:')
  ) {
    return false;
  }
  // Production Canada.ca domain
  if (/^https?:\/\/(?:www\.)?canada\.ca(?:\/|$)/i.test(t)) return true;
  // Preview domain
  if (/^https?:\/\/canada-preview\.adobecqms\.net(?:\/|$)/i.test(t)) return true;
  // Author domain (e.g. author-canada-prod.adobecqms.net)
  if (/^https?:\/\/author-canada-prod\.adobecqms\.net(?:\/|$)/i.test(t)) return true;
  if (/^https?:\/\/[a-zA-Z0-9_.-]*adobecqms\.net(?:\/|$)/i.test(t)) return true;
  // Local AEM / Root-relative paths
  if (/^(?:\/editor\.html|\/cf#)?\/content\/(?:canadasite|dam|[a-zA-Z0-9_-]+)/i.test(t)) return true;
  if (/^\/(?:en|fr)(?:\/|\.html|\?|#|$)/i.test(t)) return true;
  if (t.startsWith('/dam/')) return true;
  return false;
}

function isNodeHref(href) {
  if (!href || typeof href !== 'string') return false;
  const trimmed = href.trim();
  if (!isCanadaSiteUrlOrPath(trimmed)) return false;
  return (
    /(?:^|\/|\.)(en|fr)\/node(?:\/|\.html|\?|#|$)/i.test(trimmed) ||
    trimmed.includes('/en/node/') ||
    trimmed.includes('/fr/node/')
  );
}

function convertNodeHrefToFrench(href) {
  if (!href || typeof href !== 'string') return '';
  return formatFrenchRootRelativeLink(href);
}

function formatFrenchRootRelativeLink(rawHref) {
  if (!rawHref || typeof rawHref !== 'string') return rawHref || '';
  const trimmed = rawHref.trim();
  if (!trimmed) return '';

  // Preserve anchor fragments, mailto, tel, javascript, etc.
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return trimmed;
  }

  // Only links belonging to Canada.ca (production, preview, author, or local relative paths) need to be root-relative. Anything else, leave it as is.
  if (!isCanadaSiteUrlOrPath(trimmed)) {
    return trimmed;
  }

  // 0. Node links (e.g. /en/node/11022 -> /fr/node/11022, https://www.canada.ca/en/node/11022 -> /fr/node/11022)
  const nodeMatch = trimmed.match(/^(?:https?:\/\/[^\/]+)?(?:\/editor\.html|\/cf#)?\/?(en|fr)\/node(\/.*|\.html.*|\?.*|#.*|$)/i);
  if (nodeMatch) {
    const rest = nodeMatch[2] || '';
    return `/fr/node${rest}`;
  }
  if (trimmed.includes('/en/node/')) {
    return trimmed.replace(/\/en\/node\//gi, '/fr/node/');
  }
  if (trimmed.startsWith('/fr/node/')) {
    return trimmed;
  }

  // 1. AEM authoring prefix + /content/canadasite/... or /content/...
  // (e.g. https://author-canada-prod.adobecqms.net/editor.html/content/canadasite/en/...)
  // (e.g. /editor.html/content/canadasite/en/... or /cf#/content/canadasite/en/...)
  const aemAuthorMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?(?:\/editor\.html|\/cf#)(\/content\/(?:canadasite|dam|[a-zA-Z0-9_-]+)\/.*)$/i);
  if (aemAuthorMatch) {
    return aemAuthorMatch[1];
  }

  // 2. Domain + /content/canadasite/... or /content/dam/... or /content/...
  const contentMatch = trimmed.match(/(?:https?:\/\/[^\/]+)(\/content\/(?:canadasite|dam|[a-zA-Z0-9_-]+)\/.*)$/i);
  if (contentMatch) {
    return contentMatch[1];
  }

  // 3. Already root-relative /content/...
  if (trimmed.startsWith('/content/')) {
    return trimmed;
  }

  // 4. Domains (e.g. canada-preview.adobecqms.net, www.canada.ca, etc.) or relative paths with /en/ or /fr/
  // E.g. https://canada-preview.adobecqms.net/en/health-canada/services/food-nutrition/food-safety/education.html
  // E.g. https://www.canada.ca/en/health-canada/services/food-nutrition/food-safety/education.html
  // E.g. /en/health-canada/services/...
  // E.g. /fr/sante-canada/services/...
  const langPathMatch = trimmed.match(/^(?:https?:\/\/[^\/]+)?(?:\/editor\.html|\/cf#)?\/(en|fr)(\/.*|\.html.*|\?.*|#.*|$)/i);
  if (langPathMatch) {
    const lang = langPathMatch[1].toLowerCase();
    const rest = langPathMatch[2] || '';
    return `/content/canadasite/${lang}${rest}`;
  }

  // 5. Canada.ca domain without explicit en/fr prefix
  const gcDomainMatch = trimmed.match(/^https?:\/\/(?:www\.)?canada\.ca(\/.*)?$/i);
  if (gcDomainMatch) {
    const path = gcDomainMatch[1] || '';
    if (path.startsWith('/content/')) {
      return path;
    }
    if (path.match(/^\/(en|fr)(\/.*|$)/i)) {
      return `/content/canadasite${path}`;
    }
    if (path) {
      return `/content/canadasite${path}`;
    }
    return '/content/canadasite';
  }

  return trimmed;
}

function appendTextWithLineBreaks(parentEl, text) {
  if (!text) return;
  // Treat literal <br> tags in the text as line breaks so following text
  // drops to the next line, same as actual newline characters.
  const normalized = String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const lines = normalized.split('\n');
  lines.forEach((line, idx) => {
    if (idx > 0) {
      parentEl.appendChild(document.createElement('br'));
    }
    if (line) {
      parentEl.appendChild(document.createTextNode(line));
    }
  });
}

export {
  appendTextWithLineBreaks,
  convertNodeHrefToFrench,
  formatFrenchRootRelativeLink,
  isCanadaSiteUrlOrPath,
  isFragmentHref,
  isNodeHref,
  localizePdfUrl,
  localizePdfUrlWithFrenchH1,
};
