import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LaptopScene } from '../three/LaptopScene';
import { laptopState } from '../three/progress';
import { profile } from '../data/content';
import { scrollToId, smoothstep } from '../lib/motion';
import { Magnetic, SplitText } from './primitives';
import { Mascot } from './Mascot';

gsap.registerPlugin(ScrollTrigger);

export type ExperienceMode = 'cinematic' | 'static';

function HeroCopy({ ready }: { ready: boolean }) {
  return (
    <div className="hero-inner hero-grid">
      <div className="hero-text">
        <p className="eyebrow">Aspiring Software Developer · Computer Science &amp; AI</p>
        <h1 className="hero-name" id="hero-title">
          <SplitText text={profile.name} />
        </h1>
        <p className="hero-tagline">{profile.tagline}</p>
        <p className="hero-copy">{profile.intro}</p>
        <div className="hero-actions">
          <Magnetic>
            <a
              className="btn btn--primary"
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('projects');
              }}
            >
              Explore My Work
            </a>
          </Magnetic>
          <Magnetic>
            <a
              className="btn"
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('contact');
              }}
            >
              Let&rsquo;s Connect
            </a>
          </Magnetic>
        </div>
        <ul className="hero-social">
          <li>
            <a href={profile.github} target="_blank" rel="noreferrer" data-cursor>
              GitHub
            </a>
          </li>
          <li>
            <a href={profile.linkedin} target="_blank" rel="noreferrer" data-cursor>
              LinkedIn
            </a>
          </li>
        </ul>
        <p className="hero-meta">{profile.location} · Newton School of Technology, Rishihood University · Graduating 2030</p>
      </div>
      <Mascot ready={ready} />
    </div>
  );
}

/**
 * The hero is one sticky stage inside a tall track. Scroll position scrubs the
 * lid, the camera and the terminal (read by the WebGL loop) and fades the DOM site
 * in as the camera passes into the display.
 */
export function HeroStage({ mode }: { mode: ExperienceMode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(true);
  const readyRef = useRef(false);
  const [live, setLive] = useState(true);
  const [siteReady, setSiteReady] = useState(false);

  useEffect(() => {
    if (mode !== 'cinematic' || !trackRef.current) return;

    // The laptop plays once. Once the page with the avatar has appeared, the progress is latched
    // at its end, so scrolling back never replays the laptop; the avatar page stays in place.
    let latched = false;

    const st = ScrollTrigger.create({
      trigger: trackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        if (self.progress >= 0.995) latched = true;
        const p = latched ? 1 : self.progress;
        laptopState.p = p;

        // Direct style writes: no React render per scroll tick.
        if (introRef.current) introRef.current.style.opacity = String(1 - smoothstep(0.02, 0.18, p));
        if (hintRef.current) hintRef.current.style.opacity = String(1 - smoothstep(0.02, 0.1, p));
        if (siteRef.current) {
          const o = smoothstep(0.84, 1, p);
          siteRef.current.style.opacity = String(o);
          siteRef.current.style.pointerEvents = o > 0.95 ? 'auto' : 'none';
        }

        // Pause the WebGL loop once the DOM covers it. Latched, it stays paused.
        const nextLive = p < 0.995;
        if (nextLive !== liveRef.current) {
          liveRef.current = nextLive;
          setLive(nextLive);
        }
        // Tell the mascot when the hero is actually on screen, so its entrance plays then.
        const nextReady = p > 0.9;
        if (nextReady !== readyRef.current) {
          readyRef.current = nextReady;
          setSiteReady(nextReady);
        }
      },
    });

    return () => {
      st.kill();
      laptopState.p = 0;
    };
  }, [mode]);

  if (mode === 'static') {
    return (
      <section className="stage stage--static" id="top" aria-labelledby="hero-title">
        <HeroCopy ready />
      </section>
    );
  }

  return (
    <div className="stage-track" ref={trackRef} id="top">
      <div className="stage">
        <div className="stage-canvas" aria-hidden="true">
          <LaptopScene frameloop={live ? 'always' : 'never'} />
        </div>
        <p className="stage-intro" ref={introRef}>
          Every idea starts somewhere.
        </p>
        <div className="stage-hint" ref={hintRef} aria-hidden="true">
          Scroll
        </div>
        <div className="stage-site" ref={siteRef}>
          <HeroCopy ready={siteReady} />
        </div>
      </div>
    </div>
  );
}
