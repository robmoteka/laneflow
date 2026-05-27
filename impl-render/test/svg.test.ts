import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToSvg } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', 'examples');
const snapshotDir = join(here, '__snapshots__');

if (!existsSync(snapshotDir)) mkdirSync(snapshotDir, { recursive: true });

const exampleFiles = readdirSync(examplesDir).filter((f) => f.endsWith('.laneflow'));

describe('renderToSvg snapshots', () => {
  for (const file of exampleFiles) {
    for (const theme of ['light', 'dark'] as const) {
      it(`renders ${file} (${theme} theme)`, () => {
        const source = readFileSync(join(examplesDir, file), 'utf8');
        const svg = renderToSvg(source, { theme });
        const snapPath = join(snapshotDir, `${basename(file, '.laneflow')}.${theme}.svg`);
        if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(snapPath)) {
          writeFileSync(snapPath, svg);
          return;
        }
        const expected = readFileSync(snapPath, 'utf8');
        expect(svg).toBe(expected);
      });
    }
  }

  it('produces a well-formed SVG root and exactly two arrow markers', () => {
    const source = readFileSync(join(examplesDir, exampleFiles[0]!), 'utf8');
    const svg = renderToSvg(source);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg.match(/<marker /g)?.length).toBe(2);
    expect(svg.includes('orient="auto"')).toBe(true);
  });

  it('emits stroke-dasharray on message flows only', () => {
    const source = `laneflow v0.1
lane Sales
lane Warehouse
Sales: a (Order)
Warehouse: b [Pack]
a --> b
`;
    const svg = renderToSvg(source);
    const dashCount = (svg.match(/stroke-dasharray=/g) ?? []).length;
    expect(dashCount).toBe(1);
  });

  it('escapes XML entities in labels', () => {
    const source = `laneflow v0.1
lane Sales
Sales: a (Start & "go")
Sales: b ((End))
a --> b
`;
    const svg = renderToSvg(source);
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
    expect(svg).not.toMatch(/\([^)]*&[^a]/);
  });
});
