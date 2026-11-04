import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';
import { hasFinePointer, prefersReducedMotion } from '../lib/motion';

/** Adds `.is-in` once the element enters the viewport. Pure CSS does the animating. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Splits text into characters with a --i index for staggered reveals. */
export function SplitText({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="split-char"
          aria-hidden="true"
          style={{ '--i': i } as CSSProperties}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

/** Pulls its child toward the pointer on fine-pointer devices only. */
export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.22);
      yTo((e.clientY - r.top - r.height / 2) * 0.22);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <span className="magnetic" ref={ref}>
      {children}
    </span>
  );
}
