import { useEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import { hasFinePointer, prefersReducedMotion, scrollToId } from '../lib/motion';
import { profile } from '../data/content';

/* ---------- Loader: brief name reveal, then gets out of the way ---------- */
export function Loader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setGone(true);
      return;
    }
    const letters = nameRef.current?.querySelectorAll('span') ?? [];
    const tl = gsap.timeline({ onComplete: () => setGone(true) });
    tl.fromTo(letters, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power4.out', stagger: 0.035 })
      .to(rootRef.current, { opacity: 0, duration: 0.6, ease: 'power2.out' }, '+=0.35');
    // Safety net: never leave the page covered by the loader.
    const fallback = window.setTimeout(() => setGone(true), 4000);
    return () => {
      tl.kill();
      window.clearTimeout(fallback);
    };
  }, []);

  if (gone) return null;
  return (
    <div className="loader" ref={rootRef} role="status" aria-live="polite">
      <div className="loader-name" ref={nameRef} aria-label="Loading Dipanshu Raj">
        {Array.from(profile.name).map((ch, i) => (
          <span key={i}>{ch === ' ' ? ' ' : ch}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Scroll progress: writes transform directly, never React state ---------- */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" ref={barRef} aria-hidden="true" />;
}

/* ---------- Custom cursor: desktop with a fine pointer only ---------- */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add('has-cursor');
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });

    const move = (e: PointerEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const hit = target?.closest('a, button, [data-cursor]');
      ring.classList.toggle('is-active', Boolean(hit));
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
    };
  }, []);

  return (
    <>
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
    </>
  );
}

/* ---------- Navigation with active-section highlight and a mobile menu ---------- */
const NAV = [
  { id: 'top', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'journey', label: 'Journey' },
  { id: 'contact', label: 'Contact' },
];

export function Nav() {
  const [active, setActive] = useState('top');
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const ids = NAV.map((n) => n.id).filter((id) => id !== 'top');
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    targets.forEach((el) => io.observe(el));

    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollToId(id);
  };

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <a className="nav-brand" href="#top" onClick={go('top')} aria-label="Dipanshu Raj, back to top">
        Dipanshu Raj
      </a>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <nav aria-label="Primary">
        <ul className="nav-links" id="site-nav">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                className="nav-link"
                href={`#${n.id}`}
                onClick={go(n.id)}
                aria-current={active === n.id ? 'true' : undefined}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
