import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-800.css';
import '@fontsource/playfair-display/latin-600-italic.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import App from './App.jsx';
import './styles/global.css';
import './styles/icfa-branding.css';

try {
  for (const key of Object.keys(localStorage)) {
    if (/^(music|ensemble|mems)/i.test(key)) {
      const stored = localStorage.getItem(key);
      if (stored?.includes('Mridangam')) localStorage.setItem(key, stored.replaceAll('Mridangam', 'Miruthangam'));
    }
  }
} catch { /* Storage availability is handled by each portal. */ }

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
import './styles/application-compact.css';
