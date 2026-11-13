import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Installable app support (production builds only; dev keeps hot reload fast).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  // A new deploy takes over immediately; reload once so the page never mixes old and new files.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' }) // never trust a cached copy of the worker
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch(() => undefined);
  });
}
