import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp, hasFinePointer, prefersReducedMotion } from '../lib/motion';

/*
 * 2.5D mascot. A flat PNG can't move its head, eyes or limbs on its own, so the
 * motion is applied to the whole image:
 *   .mascot       → scroll parallax (GSAP, ScrollTrigger)
 *   .mascot-tilt  → entrance + cursor tilt + greeting wave (GSAP, transform only)
 *   .mascot-float → idle float and breathing (CSS keyframes, transform only)
 */

const GREETINGS = ['Hey, welcome in!', "Let's build something.", 'Scroll on, the projects are good.', 'Nice to meet you!'];

type Props = { ready: boolean };

export function Mascot({ ready }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const [greeting, setGreeting] = useState(0);
  const [bubble, setBubble] = useState(false);

  // Entrance: plays once, when the hero becomes visible (not hidden behind the laptop intro).
  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || !ready || playedRef.current) return;
    playedRef.current = true;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      tilt,
      { autoAlpha: 0, scale: 0.92, y: 36 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 0.15 },
    );
  }, [ready]);

  // Cursor tilt: fine pointers only. quickTo keeps each move cheap.
  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || !hasFinePointer() || prefersReducedMotion()) return;
    gsap.set(tilt, { transformPerspective: 900, transformOrigin: '50% 60%' });
    const rotX = gsap.quickTo(tilt, 'rotationX', { duration: 0.7, ease: 'power3.out' });
    const rotY = gsap.quickTo(tilt, 'rotationY', { duration: 0.7, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = tilt.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      rotY(clamp(dx * 14, -8, 8) * 1);
      rotX(clamp(-dy * 10, -6, 6));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      gsap.set(tilt, { rotationX: 0, rotationY: 0 });
    };
  }, []);

  // Scroll parallax: desktop and fine pointers only.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !hasFinePointer() || window.innerWidth <= 860 || prefersReducedMotion()) return;
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: '+=900',
      scrub: true,
      onUpdate: (self) => {
        gsap.set(el, { y: -self.progress * 80 });
      },
    });
    return () => {
      st.kill();
      gsap.set(el, { y: 0 });
    };
  }, []);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const showBubble = (duration = 2600) => {
    setBubble(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setBubble(false), duration);
  };

  const wave = () => {
    const tilt = tiltRef.current;
    if (!tilt || prefersReducedMotion()) return;
    gsap.fromTo(
      tilt,
      { rotationZ: 0 },
      { rotationZ: -5, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 3 },
    );
  };

  const onClick = () => {
    setGreeting((g) => (g + 1) % GREETINGS.length);
    showBubble();
    wave();
  };

  return (
    <div className="mascot" ref={rootRef}>
      <div className="mascot-tilt" ref={tiltRef}>
        <button
          type="button"
          className="mascot-button"
          aria-label="Say hello to the portfolio mascot"
          aria-describedby="mascot-bubble"
          onClick={onClick}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') showBubble();
          }}
          onPointerLeave={() => setBubble(false)}
          onFocus={() => showBubble(3200)}
        >
          <span className="mascot-float">
            <img
              src="/mascot/character.png"
              alt="Illustrated character in a blue hoodie, cap and glasses, pointing forward"
              width={434}
              height={1000}
              decoding="async"
              fetchPriority="high"
            />
          </span>
        </button>
        <p id="mascot-bubble" className={`mascot-bubble${bubble ? ' is-shown' : ''}`} role="status">
          {GREETINGS[greeting]}
        </p>
      </div>
    </div>
  );
}
