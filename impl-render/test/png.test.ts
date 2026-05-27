import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToPng } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', 'examples');

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

function startsWithSignature(bytes: Uint8Array, sig: Uint8Array): boolean {
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false;
  return true;
}

describe('renderToPng', () => {
  for (const file of readdirSync(examplesDir).filter((f) => f.endsWith('.laneflow'))) {
    it(`renders ${file} as a valid PNG`, () => {
      const source = readFileSync(join(examplesDir, file), 'utf8');
      const png = renderToPng(source);
      expect(startsWithSignature(png, PNG_SIGNATURE)).toBe(true);
      expect(png.byteLength).toBeGreaterThan(1000);
    });
  }

  it('produces a larger PNG when scale is increased', () => {
    const source = readFileSync(join(examplesDir, '01-linear-process.laneflow'), 'utf8');
    const small = renderToPng(source, { scale: 1 });
    const big = renderToPng(source, { scale: 3 });
    expect(big.byteLength).toBeGreaterThan(small.byteLength);
  });
});
