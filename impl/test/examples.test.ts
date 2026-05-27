import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', 'examples');

describe('repository examples conform to the spec', () => {
  const files = readdirSync(examplesDir).filter((f) => f.endsWith('.laneflow'));

  it('finds at least one example', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`parses ${file} without errors`, () => {
      const src = readFileSync(join(examplesDir, file), 'utf8');
      const { document, errors } = parse(src);
      expect(errors).toEqual([]);
      expect(document.lanes.length).toBeGreaterThan(0);
      expect(document.nodes.length).toBeGreaterThan(0);
      expect(document.flows.length).toBeGreaterThan(0);
    });
  }
});

describe('SPEC §6 normative examples', () => {
  it('6.1 — linear', () => {
    const src = `laneflow v0.1

lane Sales "Sales"

Sales: start    (Order received)
Sales: check    [Check availability]
Sales: confirm  [Confirm order]
Sales: done     ((Order closed))

start --> check --> confirm --> done
`;
    const { errors, document } = parse(src);
    expect(errors).toEqual([]);
    expect(document.flows).toHaveLength(3);
    expect(document.flows.every((f) => f.flowType === 'sequence')).toBe(true);
  });

  it('6.2 — gateway', () => {
    const src = `laneflow v0.1
direction LR

lane Sales

Sales: start     (Order received)
Sales: check     [Check availability]
Sales: in_stock  <In stock?>
Sales: confirm   [Confirm order]
Sales: reject    [Reject order]
Sales: done      ((Order closed))

start --> check --> in_stock
in_stock -- yes --> confirm --> done
in_stock -- no  --> reject  --> done
`;
    const { errors, document } = parse(src);
    expect(errors).toEqual([]);
    expect(document.direction).toBe('LR');
    const labels = document.flows.map((f) => f.label).filter(Boolean);
    expect(labels).toContain('yes');
    expect(labels).toContain('no');
  });

  it('6.3 — multi-lane with message flow', () => {
    const src = `laneflow v0.1

lane Sales      "Sales"
lane Warehouse  "Warehouse"
lane Finance    "Finance"

Sales:     start        (Order received)
Sales:     check        [Check availability]
Sales:     in_stock     <In stock?>
Sales:     reject       [Reject order]
Warehouse: pack_order   [Pack order]
Warehouse: ship         [Ship to customer]
Finance:   invoice      [Issue invoice]
Finance:   done         ((Order closed))

start --> check --> in_stock
in_stock -- no  --> reject --> done
in_stock -- yes --> pack_order
pack_order --> ship
pack_order --> invoice
ship --> done
invoice --> done
`;
    const { errors, document } = parse(src);
    expect(errors).toEqual([]);
    const messageFlows = document.flows.filter((f) => f.flowType === 'message');
    const sequenceFlows = document.flows.filter((f) => f.flowType === 'sequence');
    expect(messageFlows.length).toBeGreaterThan(0);
    expect(sequenceFlows.length).toBeGreaterThan(0);
  });
});
