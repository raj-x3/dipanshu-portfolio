import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/*
 * Works drum: a scroll-driven 3D project carousel.
 *
 * One value, `target`, is the whole timeline, measured in units:
 *   0 → 1      the cards spin a full 360° around a ring
 *   1 → 1.5    the ring flattens into a horizontal row
 *   1.5 → ∞    each further step brings the next project forward and sends the active
 *              one back through depth. The row wraps, so the sequence loops forever.
 * A draw loop eases `turn` toward `target` and writes transforms straight to the DOM,
 * so scrolling never causes a React render. React re-renders only when the active
 * project or the scroll gate changes.
 *
 * Scroll gate: while the drum sits near the middle of the viewport and the mouse is over
 * it (on touch screens, while it is centred), wheel, trackpad, touch, drag and arrow keys
 * drive the drum instead of the page. Moving the cursor off the drum hands scrolling back
 * to the page. The Skip button releases the gate until the cursor leaves and returns.
 * Reduced-motion visitors get a plain list instead.
 */

const CARD_H = 0.42; // card height as a share of the stage height
const CARD_MAX_W = 0.34; // ...but never wider than this share of the stage width
const CARD_RATIO = 1.45; // card width / height
const ROW_ROT = 16; // degrees of turn per project in the row (gentle, so edges never look sharp)
const RING_TILT = 0.5; // share of the ring angle a card turns by (keeps side cards from going edge-on)
const ROW_START = 1.5; // the spin (1) plus the flatten (0.5) come before the loop
const BLEND = 0.5;

const WHEEL_UNITS = 900; // wheel pixels per unit; a full spin is one unit (larger = calmer)
const DRAG_UNITS = 620;
const SETTLE = 260; // ms of stillness before the row snaps to a project
const OMEGA = 3.2; // spring stiffness: a critically damped spring eases in and out with no overshoot

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Signed distance from slot i to the front, wrapped so the row loops. */
function wrapD(d: number, n: number): number {
  let x = ((d % n) + n) % n;
  if (x >= n / 2) x -= n;
  return x;
}

export type WheelItem = {
  slug: string;
  title: string;
  kicker: string;
  href?: string;
};

export function WorksWheel({ items, label = "Works '26" }: { items: WheelItem[]; label?: string }) {
  // Decided once per mount, so the hooks inside the drum are never skipped.
  const [reduced] = useState(() => prefersReducedMotion());

  if (reduced) {
    return (
      <ul className="wheel-static" aria-label={label}>
        {items.map((item) => (
          <li key={item.slug} className="wheel-static-item">
            <img src={`/projects/${item.slug}.png`} alt={item.title} loading="lazy" decoding="async" />
            <div>
              <p className="project-kicker">{item.kicker}</p>
              <h3>{item.title}</h3>
              {item.href && (
                <a className="text-link" href={item.href} target="_blank" rel="noreferrer">
                  Live demo ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return <WheelDrum items={items} label={label} />;
}

type Controls = {
  to: (n: number) => void;
  goto: (i: number) => void;
  stepBy: (dir: number) => void;
  release: () => void;
};

function WheelDrum({ items, label }: { items: WheelItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const [locked, setLocked] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const controls = useRef<Controls | null>(null);
  const dragDistance = useRef(0);
  const inView = useRef(false);
  const hovered = useRef(false);
  const released = useRef(false);
  const coarse = useRef(false);

  const count = items.length;

  // Recompute the gate; setState only fires when the value actually changes.
  const refreshLock = () =>
    setLocked(inView.current && !released.current && (coarse.current || hovered.current));

  // The drum is "centred" when its middle sits within 12% of the viewport's middle.
  useEffect(() => {
    coarse.current = window.matchMedia('(pointer: coarse)').matches;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const centred = Math.abs(mid - window.innerHeight / 2) < window.innerHeight * 0.12;
      if (centred === inView.current) return;
      inView.current = centred;
      refreshLock();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // refreshLock only touches refs and a stable state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const labelEl = labelRef.current;
    const titleEl = titleRef.current;
    const cards = cardRefs.current
      .slice(0, count)
      .filter((c): c is HTMLDivElement => c !== null);
    if (!stage || !labelEl || !titleEl || cards.length !== count) return;

    let metrics = computeMetrics(stage.clientWidth || 800, stage.clientHeight || 500, count);

    const applyMetrics = () => {
      metrics = computeMetrics(stage.clientWidth || 800, stage.clientHeight || 500, count);
      stage.style.perspective = `${metrics.perspective}px`;
      cards.forEach((card) => {
        card.style.width = `${metrics.cardW}px`;
        card.style.height = `${metrics.cardH}px`;
        card.style.marginLeft = `${-metrics.cardW / 2}px`;
        card.style.marginTop = `${-metrics.cardH / 2}px`;
      });
      labelEl.style.fontSize = `${metrics.title}px`;
      titleEl.style.fontSize = `${metrics.title * 0.9}px`;
    };
    applyMetrics();

    const ro = new ResizeObserver(applyMetrics);
    ro.observe(stage);

    let turn = 0;
    let target = 0;
    let vel = 0;
    let lastTime = performance.now();
    let activeIdx = 0;

    const to = (next: number) => {
      target = Math.max(0, next);
    };

    // Jump to project i by the shortest way round the loop.
    const goto = (i: number) => {
      const s = Math.max(0, target - ROW_START);
      to(ROW_START + s + wrapD(i - s, count));
    };

    // One project forward or back, from the spin, the flatten, or the row.
    const stepBy = (dir: number) => {
      if (target < ROW_START - 0.001) {
        if (dir > 0) to(target < 1 ? 1 : ROW_START);
        else to(target > 1 ? 1 : 0);
        return;
      }
      const s = Math.round(target - ROW_START);
      if (dir < 0 && s <= 0) {
        to(1);
        return;
      }
      to(ROW_START + s + dir);
    };

    const release = () => {
      released.current = true;
      refreshLock();
    };
    controls.current = { to, goto, stepBy, release };

    const isGated = () => inView.current && !released.current && (coarse.current || hovered.current);

    // After scrolling pauses, the row snaps to the nearest project.
    let settleTimer = 0;
    const settle = () => {
      if (target > 1 && target < ROW_START) {
        to(target < 1.25 ? 1 : ROW_START);
      } else if (target >= ROW_START) {
        to(ROW_START + Math.round(target - ROW_START));
      }
    };
    const kick = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE);
    };

    // While gated, page scrolling is captured here (capture phase, before the smooth-scroll
    // layer) and turned into drum motion. Scrolling up at the very start releases the page.
    const onWheel = (e: WheelEvent) => {
      if (!isGated()) return;
      if (e.deltaY < 0 && target <= 0.0005) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      to(target + e.deltaY / WHEEL_UNITS);
      kick();
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isGated()) return;
      const y = e.touches[0]?.clientY ?? touchY;
      const dy = touchY - y;
      touchY = y;
      if (dy < 0 && target <= 0.0005) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      to(target + dy / DRAG_UNITS);
      kick();
    };

    const onWindowKey = (e: KeyboardEvent) => {
      if (!isGated()) return;
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
      const up = e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!down && !up) return;
      if (up && target <= 0.0005) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      stepBy(down ? 1 : -1);
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    window.addEventListener('keydown', onWindowKey, { capture: true });

    // Drag on the stage (mouse / pen)
    let dragging = false;
    let dragY = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      dragY = e.clientY;
      dragDistance.current = 0;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture is best-effort */
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const diff = dragY - e.clientY;
      dragDistance.current += Math.abs(diff);
      to(target + diff / DRAG_UNITS);
      dragY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      kick();
    };
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);

    // Arrow keys when the stage itself has focus
    const onStageKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBy(-1);
      }
    };
    stage.addEventListener('keydown', onStageKey);

    // Card clicks: the front card opens its link, any other card moves to the front.
    const cardClicks = cards.map((card, i) => {
      const handler = () => {
        if (dragDistance.current > 6) return;
        if (activeIdx === i) {
          const href = items[i]?.href;
          if (href) window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          goto(i);
        }
      };
      card.addEventListener('click', handler);
      return { card, handler };
    });

    // One rAF loop writing transforms directly.
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);

      // Exponential follow: the same feel at 60, 120 or 144 Hz.
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      // Critically damped spring: starts gently, glides, settles without overshoot.
      const gap = target - turn;
      vel += (OMEGA * OMEGA * gap - 2 * OMEGA * vel) * dt;
      turn += vel * dt;
      if (Math.abs(gap) < 0.0005 && Math.abs(vel) < 0.001) {
        turn = target;
        vel = 0;
      }

      const T = turn;
      const theta = clampN(T, 0, 1) * Math.PI * 2; // the ring turns once
      const blend = smooth(clampN((T - 1) / BLEND, 0, 1)); // ring → row
      const s = Math.max(0, T - ROW_START); // position along the loop
      const { ringR, spacing, depthStep } = metrics;

      for (let i = 0; i < count; i++) {
        const card = cards[i];

        // Ring pose: cards sit around a circle and face outward.
        const phi = (i / count) * Math.PI * 2 + theta;
        const cos = Math.cos(phi);
        const rx = ringR * Math.sin(phi);
        const rz = ringR * (cos - 1);
        const wrapped = Math.atan2(Math.sin(phi), Math.cos(phi)); // -π..π, no jump at the seam
        const rry = ((wrapped * 180) / Math.PI) * RING_TILT;
        const rop = 0.4 + 0.6 * ((cos + 1) / 2);

        // Row pose: projects line up, the active one front and centre, others recede in depth.
        const d = wrapD(i - s, count);
        const ad = Math.abs(d);
        const cull = clampN((count / 2 - ad) / 0.5, 0, 1); // hides the card that wraps round
        const fade = Math.max(0, 1 - 0.3 * ad) * cull;

        const x = lerpN(rx, d * spacing, blend);
        const z = lerpN(rz, -ad * depthStep, blend);
        const ry = lerpN(rry, -d * ROW_ROT, blend);
        const sc = lerpN(1, 1 - 0.16 * ad, blend);
        const op = lerpN(rop, fade, blend);

        card.style.transform = `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        card.style.opacity = op.toFixed(3);
        card.style.pointerEvents = op < 0.05 ? 'none' : 'auto';
        card.style.zIndex = String(Math.round(1000 + z));
      }

      labelEl.style.opacity = String(1 - blend);
      titleEl.style.opacity = String(blend);

      const near = ((Math.round(s) % count) + count) % count;
      if (near !== activeIdx) {
        activeIdx = near;
        setActive(near);
      }
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.clearTimeout(settleTimer);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('keydown', onWindowKey, { capture: true });
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('keydown', onStageKey);
      cardClicks.forEach(({ card, handler }) => card.removeEventListener('click', handler));
      controls.current = null;
    };
    // refreshLock only touches refs and a stable state setter, so it is safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, items]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const current = items[active] ?? items[0];

  return (
    <div
      className={`wheel${locked ? ' is-locked' : ''}`}
      ref={rootRef}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        hovered.current = true;
        released.current = false;
        refreshLock();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        hovered.current = false;
        released.current = false;
        refreshLock();
      }}
    >
      <div
        className="wheel-stage"
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`wheel-${active}`}
      >
        <div className="wheel-drum">
          {items.map((item, i) => (
            <div
              key={item.slug}
              id={`wheel-${i}`}
              role="option"
              aria-selected={i === active}
              className="wheel-card"
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
            >
              <div className="wheel-face">
                <img src={`/projects/${item.slug}.png`} alt={item.title} draggable={false} />
                <div className="wheel-shade" />
                <div className="wheel-info">
                  <span>{item.title}</span>
                  <span className="wheel-action">{item.href ? 'Live ↗' : 'Details'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="wheel-floor" aria-hidden="true" />
        <div className="wheel-label" ref={labelRef}>
          {label}
        </div>
        <div className="wheel-title" ref={titleRef} aria-hidden="true">
          <span key={active} className="wheel-title-text">
            {current?.title}
          </span>
        </div>
      </div>

      <ol className="wheel-index">
        {items.map((item, i) => (
          <li key={item.slug}>
            <button
              type="button"
              aria-current={i === active ? 'true' : undefined}
              onClick={() => controls.current?.goto(i)}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>

      <p className="wheel-counter" aria-hidden="true">
        <span key={active} className="wheel-count-num">
          {pad(active + 1)}
        </span>{' '}
        / {pad(count)}
      </p>

      <p className="wheel-hint">
        {locked ? (
          <>
            Scroll to cycle · move your cursor off to continue
            <button type="button" className="wheel-skip" onClick={() => controls.current?.release()}>
              Skip ↓
            </button>
          </>
        ) : (
          'Hover and scroll to cycle the projects'
        )}
      </p>
    </div>
  );
}

function computeMetrics(w: number, h: number, count: number) {
  const narrow = w < 700;
  const cardW = Math.min(h * CARD_H * CARD_RATIO, w * (narrow ? 0.58 : CARD_MAX_W));
  const cardH = cardW / CARD_RATIO;
  return {
    cardW,
    cardH,
    // The ring is wide enough that neighbouring cards do not collide while spinning.
    ringR: cardW * Math.max(1, count * 0.36),
    // In the row, neighbours sit just clear of the front card.
    spacing: cardW * (narrow ? 1.0 : 1.08),
    depthStep: cardW * 0.55,
    perspective: cardW * 3.4,
    title: Math.max(22, cardH * 0.115),
  };
}
