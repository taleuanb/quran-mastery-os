import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/ui/theme.css', 'utf8');

function tokens(startMarker) {
  const start = css.indexOf(startMarker);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) out[m[1]] = m[2];
  return out;
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mix = (a, b, p) => '#' + [1, 3, 5]
  .map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p))
    .toString(16).padStart(2, '0')).join('');

const modes = {
  clair: tokens(':root{'),
  sombre: tokens(':root[data-theme="dark"]'),
};

describe.each(Object.entries(modes))('contraste ≥ 4,5:1 (%s)', (_name, k) => {
  const pairs = [];
  for (const bg of ['bg', 'surface', 'surface2', 'gold-soft', 'empty', 'accent-soft']) {
    pairs.push(['muted', bg]);
  }
  for (const bg of ['bg', 'surface', 'surface2', 'gold-soft']) pairs.push(['gold', bg]);
  for (const bg of ['bg', 'surface', 'surface2', 'accent-soft']) pairs.push(['accent', bg]);
  pairs.push(['accent-fg', 'accent'], ['on-gold', 'gold'], ['bg', 'fg'], ['fg', 'surface'], ['toast-link', 'fg']);
  for (let n = 1; n <= 5; n += 1) pairs.push([`on-${n}`, `s${n}`]);
  pairs.push(['s1-text', 'bg'], ['s1-text', 'surface'], ['s4-text', 'surface'], ['s4-text', 'bg']);

  it.each(pairs)('%s sur %s', (fg, bg) => {
    expect(k[fg], `jeton --${fg}`).toBeDefined();
    expect(k[bg], `jeton --${bg}`).toBeDefined();
    expect(ratio(k[fg], k[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('s1-text sur la cellule « manqué » (16 % de s1 sur surface)', () => {
    expect(ratio(k['s1-text'], mix(k.s1, k.surface, 0.16))).toBeGreaterThanOrEqual(4.5);
  });
});
