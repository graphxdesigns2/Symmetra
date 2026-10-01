function synthesizeFrenchSummary(enSummaryText, translatedFigcaptionText = '') {
  if (!enSummaryText) return 'Équivalent textuel';
  let t = enSummaryText.trim();

  if (/^(?:Text(?:\s+|-)?equivalent|Alternative\s+text|Text\s+version)$/i.test(t)) {
    return 'Équivalent textuel';
  }
  if (/^(?:Text\s+description|Long\s+description)$/i.test(t)) {
    return 'Description textuelle';
  }
  if (/^Table\s+equivalent$/i.test(t)) {
    return 'Tableau équivalent';
  }

  const figMatch = t.match(/^Figure\s+([a-zA-Z0-9_-]+)\s*[\-–—:.]\s*(?:Text(?:\s+|-)?equivalent|Long\s+description|Text\s+description|Table\s+equivalent|Alternative\s+text|Text\s+version)$/i);
  if (figMatch) {
    return `Figure ${figMatch[1]} - Équivalent textuel`;
  }

  const titleMatch = t.match(/^(.*?)\s*[\-–—:.]\s*(?:Text(?:\s+|-)?equivalent|Long\s+description|Text\s+description|Table\s+equivalent|Alternative\s+text|Text\s+version)$/i);
  if (titleMatch && titleMatch[1]) {
    const enTitle = titleMatch[1].trim();
    const frTitle = translatedFigcaptionText ? translatedFigcaptionText.trim() : enTitle;
    return `${frTitle} - Équivalent textuel`;
  }

  return t
    .replace(/\bText(?:\s+|-)?equivalent\b/gi, 'Équivalent textuel')
    .replace(/\bText\s+description\b/gi, 'Description textuelle')
    .replace(/\bLong\s+description\b/gi, 'Description textuelle')
    .replace(/\bTable\s+equivalent\b/gi, 'Tableau équivalent')
    .replace(/\bText\s+version\b/gi, 'Version textuelle');
}

function convertFrenchImageSrc(src) {
  if (!src || typeof src !== 'string') return src;
  return src
    .replace(/([_-])en(\.(?:png|jpg|jpeg|svg|webp|gif|bmp|tiff|avif)(?:[?#].*)?)$/i, '$1fr$2')
    .replace(/([_-])eng(\.(?:png|jpg|jpeg|svg|webp|gif|bmp|tiff|avif)(?:[?#].*)?)$/i, '$1fra$2')
    .replace(/([_-])en([.][a-zA-Z0-9]+(?:[?#].*)?)$/i, '$1fr$2')
    .replace(/([_-])eng([.][a-zA-Z0-9]+(?:[?#].*)?)$/i, '$1fra$2')
    .replace(/\/en\//gi, '/fr/')
    .replace(/\/eng\//gi, '/fra/');
}

function convertFrenchOrdinalsInHtml(html) {
  if (!html || typeof html !== 'string') return html;

  // Split into tags and text segments to safely process only text content outside attributes/tags
  const parts = html.split(/(<[^>]+>)/g);
  let inNoFormatTag = false;
  let inSup = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      // HTML Tag
      const openMatch = part.match(/^<([a-zA-Z0-9_-]+)/i);
      const closeMatch = part.match(/^<\/([a-zA-Z0-9_-]+)/i);
      const tag = (openMatch ? openMatch[1] : closeMatch ? closeMatch[1] : '').toLowerCase();

      if (['script', 'style', 'code', 'pre', 'textarea'].includes(tag)) {
        if (part.startsWith('</')) inNoFormatTag = false;
        else inNoFormatTag = true;
      }
      if (tag === 'sup') {
        if (part.startsWith('</')) inSup = false;
        else inSup = true;
      }
      continue;
    }

    if (inNoFormatTag || inSup || !part) continue;

    // Convert English 1st and French 1er, 1ers, 1re, 1res so the abbreviation gets superscripted
    parts[i] = parts[i]
      .replace(/\b1st\b/gi, '1<sup>er</sup>')
      .replace(/\b1(er|ers|re|res|ère|ères)\b/gi, (match, suffix) => {
        const s = suffix.toLowerCase();
        let cleanSuff = s;
        if (s === 'ère') cleanSuff = 're';
        if (s === 'ères') cleanSuff = 'res';
        return `1<sup>${cleanSuff}</sup>`;
      });
  }

  let result = parts.join('');
  // Clean any nested or duplicated <sup>
  result = result.replace(/1<sup>\s*<sup>\s*(er|ers|re|res)\s*<\/sup>\s*<\/sup>/gi, '1<sup>$1</sup>');
  result = result.replace(/1<sup>\s*(er|ers|re|res)\s*<\/sup>\s*<sup>\s*(?:er|ers|re|res)\s*<\/sup>/gi, '1<sup>$1</sup>');
  return result;
}

function cleanFrenchUrlAndEntities(text) {
  if (!text) return '';
  return text
    .replace(/(?:https?|ftp|mailto|file):\/\/[^\s<>"'\\]+/gi, (url) =>
      url.replace(/:/g, '__COLON__').replace(/;/g, '__SEMI__').replace(/\?/g, '__Q__').replace(/!/g, '__EXCL__')
    )
    .replace(/&[a-zA-Z0-9#]+;/g, (ent) => ent.replace(/;/g, '__SEMI__'));
}

function restoreFrenchUrlAndEntities(text) {
  if (!text) return '';
  return text
    .replace(/__COLON__/g, ':')
    .replace(/__SEMI__/g, ';')
    .replace(/__Q__/g, '?')
    .replace(/__EXCL__/g, '!');
}

function applyFrenchTypographyRules(text) {
  if (!text) return text;
  let t = cleanFrenchUrlAndEntities(text);
  t = t
    // Replace regular space(s) or lack of space before : ; ? ! with non-breaking space (\u00A0)
    .replace(/([^\s\u00A0:;?!])[ \t]*([:;?!])/g, '$1\u00A0$2')
    // Guillemets: non-breaking space inside quotes
    .replace(/«[ \t\r\n\u00A0]*/g, '«\u00A0')
    .replace(/[ \t\r\n\u00A0]*»/g, '\u00A0»')
    // Currency symbols ($ and €) require non-breaking space between number and currency
    .replace(/(\d)[ \t\r\n\u00A0]*([$€])/g, '$1\u00A0$2')
    // Percentage (%) symbol requires non-breaking space before it when following numbers
    .replace(/(\d)[ \t\r\n\u00A0]*%/g, '$1\u00A0%')
    // Numbered units (km, h, min, s, jours, ans, mois, etc.) with non-breaking space after numbers
    .replace(/(\d)[ \t\r\n\u00A0]+(km|kg|mg|g|m|cm|mm|ha|t|l|ml|h|min|s|ans|an|jours|jour|mois|semaines|semaine|pages|page|p\.|art\.|no|n°|nº|§)\b/gi, '$1\u00A0$2')
    // Prevent accidental double non-breaking spaces or regular space + non-breaking space combos
    .replace(/[ \t]*\u00A0+[ \t]*/g, '\u00A0')
    .replace(/\u00A0+/g, '\u00A0');
  return restoreFrenchUrlAndEntities(t);
}

export {
  applyFrenchTypographyRules,
  cleanFrenchUrlAndEntities,
  convertFrenchImageSrc,
  convertFrenchOrdinalsInHtml,
  restoreFrenchUrlAndEntities,
  synthesizeFrenchSummary,
};
