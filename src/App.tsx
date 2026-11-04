import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { HeroStage, type ExperienceMode } from './components/HeroStage';
import { CustomCursor, Loader, Nav, ScrollProgress } from './components/chrome';
import { About, Skills, Projects, Journey, Education } from './sections/Sections';
import { Contact } from './sections/Contact';
import { hasWebGL, prefersReducedMotion } from './lib/motion';
import { ErrorBoundary } from './components/ErrorBoundary';

gsap.registerPlugin(ScrollTrigger);

/** Smooth scrolling for pointer users. Reduced-motion users get native scrolling. */
function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    const scrollTo = (id: string) => {
      if (id === 'top') {
        window.scrollTo({ top: 0 });
        return;
      }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };

    if (!enabled) {
      const onNav = (e: Event) => scrollTo((e as CustomEvent<string>).detail);
      window.addEventListener('site:scrollto', onNav);
      return () => window.removeEventListener('site:scrollto', onNav);
    }

    const lenis = new Lenis({ duration: 1.15, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onNav = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === 'top') {
        lenis.scrollTo(0);
        return;
      }
      const el = document.getElementById(id);
      if (el) lenis.scrollTo(el, { offset: -72 });
    };
    window.addEventListener('site:scrollto', onNav);

    return () => {
      window.removeEventListener('site:scrollto', onNav);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [enabled]);
}

export default function App() {
  // Decide once: reduced motion or no WebGL gets the static hero, with the same copy.
  const [mode] = useState<ExperienceMode>(() =>
    prefersReducedMotion() || !hasWebGL() ? 'static' : 'cinematic',
  );
  useSmoothScroll(mode === 'cinematic');

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <Loader />
      <ScrollProgress />
      <CustomCursor />
      <Nav />
      <main>
        <HeroStage mode={mode} />
        <About />
        <Skills />
        <Projects />
        <Journey />
        <Education />
        <Contact />
      </main>
    </ErrorBoundary>
  );
}
