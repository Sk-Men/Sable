import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import '@fontsource-variable/nunito';
import '@fontsource-variable/nunito/wght-italic.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/space-mono/400-italic.css';
import '@fontsource/space-mono/700-italic.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';

enableMapSet();

import './index.css';
import './app/styles/themes.css';
import './app/styles/overrides/General.css';
import './app/styles/overrides/Privacy.css';

import { trimTrailingSlash } from './app/utils/common';
import App from './app/pages/App';

// import i18n (needs to be bundled ;))
import './app/i18n';
import { pushSessionToSW } from './sw-session';
import {
  getFallbackSession,
  MATRIX_SESSIONS_KEY,
  Sessions,
  ACTIVE_SESSION_KEY,
} from './app/state/sessions';
import { getLocalStorageItem } from './app/state/utils/atomWithLocalStorage';

document.body.classList.add(configClass, varsClass);

// Register Service Worker
if ('serviceWorker' in navigator) {
  const swUrl =
    import.meta.env.MODE === 'production'
      ? `${trimTrailingSlash(import.meta.env.BASE_URL)}/sw.js`
      : `/dev-sw.js?dev-sw`;

  const sendSessionToSW = () => {
    // Use the active session from the new multi-session store, fall back to legacy
    const sessions = getLocalStorageItem<Sessions>(MATRIX_SESSIONS_KEY, []);
    const activeId = getLocalStorageItem<string | undefined>(ACTIVE_SESSION_KEY, undefined);
    const active =
      sessions.find((s) => s.userId === activeId) ?? sessions[0] ?? getFallbackSession();
    pushSessionToSW(active?.baseUrl, active?.accessToken);
  };

  void navigator.serviceWorker.register(swUrl).then(sendSessionToSW);
  void navigator.serviceWorker.ready.then(sendSessionToSW);

  navigator.serviceWorker.addEventListener('message', (ev) => {
    const data: unknown = ev.data;
    if (!data || typeof data !== 'object') return;
    const { type } = data as { type?: unknown };

    if (type === 'requestSession') {
      sendSessionToSW();
    }
  });
}

const injectIOSMetaTags = () => {
  const metaTags = [
    { name: 'theme-color', content: '#0C0B0F' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  ];

  metaTags.forEach((tag) => {
    let element = document.querySelector(`meta[name="${tag.name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', tag.name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', tag.content);
  });
};

injectIOSMetaTags();

const mountApp = () => {
  const rootContainer = document.getElementById('root');

  if (rootContainer === null) {
    throw new Error('Root container element not found!');
  }

  const root = createRoot(rootContainer);
  root.render(<App />);
};

mountApp();
