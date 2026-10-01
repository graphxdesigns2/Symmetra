// Auto-generated imports
import {
  docxPreviewFrame,
  enPreviewFrame,
  frPreviewFrame,
  themeThumbIcon,
  themeToggle,
} from './dom-refs.js';
import {
  state,
} from './state.ts';


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
      themeThumbIcon.setAttribute('class', 'w-3 h-3 text-purple-400');
    } else {
      themeThumbIcon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
      themeThumbIcon.setAttribute('class', 'w-3 h-3 text-amber-500');
    }
  }

  // Update preview iframes theme
  updateIframesTheme();
}

function updateIframesTheme() {
  [enPreviewFrame, frPreviewFrame, docxPreviewFrame].forEach((frame) => {
    if (frame && frame.contentDocument && frame.contentDocument.body) {
      if (state.theme === 'light') {
        frame.contentDocument.body.classList.add('gc-light-mode');
      } else {
        frame.contentDocument.body.classList.remove('gc-light-mode');
      }
      frame.contentDocument.body.classList.toggle('mode-focus', !!state.focusMode);
      frame.contentDocument.body.classList.toggle('mode-blur', !!state.blurMode);
      frame.contentDocument.body.classList.toggle('hide-highlight', state.showHighlightBox === false);
    }
  });
}

export {
  applyTheme,
  initTheme,
  updateIframesTheme,
};
