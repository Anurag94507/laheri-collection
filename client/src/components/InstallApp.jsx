import { useEffect, useState } from 'react';

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Install control for the PWA.
 * Chrome/Edge/Android use the real install prompt; iOS gets Share -> Add to Home Screen steps.
 * Renders nothing once the app is running installed, or on browsers that offer no way to install.
 */
export default function InstallApp({ label = false, className = '' }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // index.html captures the prompt before React mounts, since it can fire early.
    if (window.__laheriInstallPrompt) {
      setPromptEvent(window.__laheriInstallPrompt);
      window.__laheriInstallPrompt = null;
    }
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!promptEvent && !isIos())) return null;

  const install = async () => {
    if (!promptEvent) {
      setShowIos(true);
      return;
    }
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === 'accepted') setInstalled(true);
    setPromptEvent(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 transition ${className}`}
        aria-label="Install the Laheri app"
      >
        <svg viewBox="0 0 24 24" width={label ? 14 : 18} height={label ? 14 : 18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="2.5" width="12" height="19" rx="3" />
          <path d="M12 7v6M9.5 10.5 12 13l2.5-2.5" />
        </svg>
        {label && <span>Install app</span>}
      </button>

      {showIos && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-navy/60 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl text-navy">Install Laheri on your iPhone</h2>
              <button type="button" onClick={() => setShowIos(false)} className="text-ink/40" aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-ink/70">
              <li>1. Tap the <strong>Share</strong> button in Safari (the square with an arrow).</li>
              <li>2. Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>3. Tap <strong>Add</strong> — the Laheri app icon appears with your other apps.</li>
            </ol>
            <button type="button" onClick={() => setShowIos(false)} className="btn-outline btn-sm mt-5 w-full">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
