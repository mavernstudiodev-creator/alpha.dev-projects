import { useCallback, useEffect, useState } from 'react';

const INTRO_SEEN_KEY = 'alpha-dev-intro-seen';

function shouldShowIntro() {
  if (typeof window === 'undefined') return false;

  try {
    if (window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true') return false;
  } catch {
    // Continue without session persistence when browser storage is unavailable.
  }

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IntroAnimation() {
  const [visible, setVisible] = useState(shouldShowIntro);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // The intro still dismisses when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(dismiss, 3900);
    return () => window.clearTimeout(timeout);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div className="site-intro" role="dialog" aria-label="Alpha Dev Presents intro">
      <div className="site-intro__orbit" aria-hidden="true">
        <span className="site-intro__orbit-mark">α</span>
      </div>
      <div className="site-intro__wordmark" aria-label="Alpha Dev presents">
        <span className="site-intro__alpha">alpha</span>
        <span className="site-intro__dev">dev</span>
        <span className="site-intro__presents">presents</span>
      </div>
      <button className="site-intro__skip" onClick={dismiss} type="button">
        Skip intro
      </button>
    </div>
  );
}
