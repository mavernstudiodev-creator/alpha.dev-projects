import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const video = videoRef.current;
    const play = video?.play();
    play?.catch(() => {
      // Keep the intro usable when autoplay is restricted; the user can start it.
    });
  }, [visible, dismiss]);

  const toggleAudio = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (video.paused) void video.play().catch(() => undefined);
  };

  if (!visible) return null;

  return (
    <div className="site-intro" role="dialog" aria-label="Alpha Dev Presents intro">
      <video
        ref={videoRef}
        className="site-intro__video"
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        aria-label="Alpha Dev intro animation"
      >
        <source src={`${import.meta.env.BASE_URL}alpha-dev-intro.mp4`} type="video/mp4" />
      </video>
      <div className="site-intro__controls">
        <button className="site-intro__audio" onClick={toggleAudio} type="button" aria-label={muted ? 'Enable intro sound' : 'Mute intro sound'}>
          {muted ? 'Enable sound' : 'Mute sound'}
        </button>
        <button className="site-intro__skip" onClick={dismiss} type="button">
          Skip intro
        </button>
      </div>
    </div>
  );
}

