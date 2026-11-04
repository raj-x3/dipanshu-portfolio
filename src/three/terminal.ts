import * as THREE from 'three';
import { clamp } from '../lib/motion';

// The terminal is drawn to a canvas and mapped onto the laptop's display, so it is
// a real screen surface rather than floating text.

const FONT = '"JetBrains Mono", ui-monospace, monospace';
const WIDTH = 1600;
const HEIGHT = 1000;
const COLORS = {
  bg: '#0b0b0e',
  bar: '#16161c',
  dot: '#3a3a46',
  dotActive: '#8b8cff',
  title: '#6d6c78',
  prompt: '#8b8cff',
  command: '#ece8df',
  string: '#a9d6b8',
  output: '#cfcbc2',
  cursor: '#ece8df',
};

type Row = { kind: 'cmd' | 'out' | 'blank'; text: string };

// Syntax-highlighted script, typed character by character.
const ROWS: Row[] = [
  { kind: 'cmd', text: '$ whoami' },
  { kind: 'out', text: 'Dipanshu Raj' },
  { kind: 'out', text: 'Computer Science & AI Student' },
  { kind: 'out', text: 'Newton School of Technology, Rishihood University' },
  { kind: 'blank', text: '' },
  { kind: 'cmd', text: '$ echo "Building ideas into digital experiences."' },
  { kind: 'cmd', text: '$ ' },
];

const TOTAL_CHARS = ROWS.reduce((sum, row) => sum + row.text.length, 0);

function colorFor(row: Row, index: number): string {
  if (row.kind === 'out') return COLORS.output;
  if (index < 1) return COLORS.prompt;
  const before = row.text.slice(0, index);
  const inQuote = (before.match(/"/g)?.length ?? 0) % 2 === 1 || row.text[index] === '"';
  if (inQuote) return COLORS.string;
  return COLORS.command;
}

export type Terminal = {
  texture: THREE.CanvasTexture;
  /** Redraws only when the visible text or cursor phase changes. Returns true when drawn. */
  update: (fraction: number, blink: boolean) => boolean;
  dispose: () => void;
};

export function createTerminal(): Terminal {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  let lastKey = -1;
  // Once the webfont is ready, force a redraw so the terminal uses the right face.
  void document.fonts?.load(`40px ${FONT}`).then(() => {
    lastKey = -1;
  });

  function draw(chars: number, blink: boolean): void {
    // Background
    const bg = ctx!.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, COLORS.bg);
    bg.addColorStop(1, '#101016');
    ctx!.fillStyle = bg;
    ctx!.fillRect(0, 0, WIDTH, HEIGHT);

    // Title bar + window controls
    ctx!.fillStyle = COLORS.bar;
    ctx!.fillRect(0, 0, WIDTH, 96);
    [0, 1, 2].forEach((i) => {
      ctx!.beginPath();
      ctx!.arc(44 + i * 30, 48, 9, 0, Math.PI * 2);
      ctx!.fillStyle = i === 0 ? COLORS.dotActive : COLORS.dot;
      ctx!.fill();
    });
    ctx!.font = `500 26px ${FONT}`;
    ctx!.fillStyle = COLORS.title;
    ctx!.textAlign = 'center';
    ctx!.fillText('dipanshu — zsh — 96×28', WIDTH / 2, 58);
    ctx!.textAlign = 'left';

    // Body
    ctx!.font = `400 40px ${FONT}`;
    ctx!.textBaseline = 'alphabetic';
    const x0 = 120;
    const lineHeight = 62;
    let y = 190;
    let remaining = chars;
    let cursorX = x0;
    let cursorY = y;

    for (const row of ROWS) {
      if (remaining <= 0) break;
      const take = Math.min(row.text.length, remaining);
      remaining -= take;
      let x = x0;
      for (let i = 0; i < take; i++) {
        const ch = row.text[i];
        ctx!.fillStyle = colorFor(row, i);
        ctx!.fillText(ch, x, y);
        x += ctx!.measureText(ch).width;
      }
      cursorX = x;
      cursorY = y;
      if (take < row.text.length) break;
      y += lineHeight;
    }

    if (blink) {
      ctx!.fillStyle = COLORS.cursor;
      ctx!.fillRect(cursorX + 4, cursorY - 34, 22, 42);
    }
  }

  return {
    texture,
    update(fraction, blink) {
      const chars = Math.round(clamp(fraction) * TOTAL_CHARS);
      const key = chars * 2 + (blink ? 1 : 0);
      if (key === lastKey) return false;
      lastKey = key;
      draw(chars, blink);
      texture.needsUpdate = true;
      return true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
