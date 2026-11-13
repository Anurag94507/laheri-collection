import { useEffect, useState } from 'react';

const DISMISS_KEY = 'laheri_install_hint_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * "Install app" control for the PWA.
 * - Android / desktop Chrome / Edge: uses the real beforeinstallprompt flow.
 * - iOS Safari: shows the Share -> Add to Home Screen steps, since iOS has no prompt.
 * - Already installed (standalone) or dismissed: renders nothing.
 */
export default function InstallApp({ variant = 'icon', className = '' }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // The prompt may have fired before React mounted (index.html captures it early).
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
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setInstalled(isStandalone());
    media?.addEventListener?.('change', onChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onChange);
    };
  }, []);

  if (installed || dismissed) return null;
  const canPrompt = Boolean(promptEvent);
  const iosHint = !canPrompt && isIos();
  if (!canPrompt && !iosHint) return null;

  const install = async () => {
    if (canPrompt) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setShowIos(true);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const base =
    variant === 'row'
      ? 'flex w-full items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2 text-[11px] font-medium text-gold transition hover:bg-gold/10'
      : variant === 'menu'
        ? 'flex w-full items-center gap-2 border-b border-navy/5 py-3 text-sm font-medium text-gold-dark'
        : 'flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 text-navy/70 transition hover:border-gold hover:text-navy';

  return (
    <>
      <button type="button" onClick={install} className={`${base} ${className}`} aria-label="Install the Laheri app">
        <svg viewBox="0 0 24 24" width={variant === 'row' ? 14 : 18} height={variant === 'row' ? 14 : 18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="2.5" width="12" height="19" rx="3" />
          <path d="M12 7v6" />
          <path d="M9.5 10.5 12 13l2.5-2.5" />
        </svg>
        {variant !== 'icon' && <span>Install app</span>}
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
            <button type="button" onClick={dismiss} className="btn-outline btn-sm mt-5 w-full">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
