// Shared, non-reactive scroll state. ScrollTrigger writes `p` on scroll and the
// WebGL frame loop reads it. Keeping this out of React state means scrolling
// never triggers a React render.
export const laptopState = {
  /** 0 → 1 across the hero stage (closed laptop → screen fills viewport). */
  p: 0,
};
