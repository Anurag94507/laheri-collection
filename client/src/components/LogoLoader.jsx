import { useEffect } from 'react';

/** Removes the static first-visit curtain that index.html paints before React boots. */
export default function LogoLoader() {
  useEffect(() => {
    const boot = document.getElementById('laheri-boot');
    if (!boot) return undefined;
    const timer = window.setTimeout(() => {
      boot.classList.add('done');
      window.setTimeout(() => boot.remove(), 500);
    }, 420);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
