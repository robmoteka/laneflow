import { describe, expect, it } from 'vitest';
import { parse } from '@laneflow/parser';
import { layout } from '../src/layout.js';
import { lightTheme } from '../src/theme.js';

function parseDoc(source: string) {
  const result = parse(source);
  expect(result.errors).toEqual([]);
  return result.document;
}

describe('layout', () => {
  it('places nodes of a linear sequence in increasing columns within a single lane', () => {
    const doc = parseDoc(`laneflow v0.1
lane Sales
Sales: a (Start)
Sales: b [Step]
Sales: c ((End))
a --> b --> c
`);
    const lay = layout(doc, { theme: lightTheme });
    const nodeById = new Map(lay.nodes.map((n) => [n.id, n]));
    expect(nodeById.get('a')!.box.x).toBeLessThan(nodeById.get('b')!.box.x);
    expect(nodeById.get('b')!.box.x).toBeLessThan(nodeById.get('c')!.box.x);
    const centerY = (n: { box: { y: number; height: number } }) => n.box.y + n.box.height / 2;
    expect(centerY(nodeById.get('a')!)).toBe(centerY(nodeById.get('b')!));
    expect(nodeById.get('a')!.laneId).toBe('Sales');
    expect(nodeById.get('c')!.laneId).toBe('Sales');
    expect(lay.canvas.width).toBeGreaterThan(0);
    expect(lay.canvas.height).toBeGreaterThan(0);
  });

  it('classifies cross-lane edges as message flow and keeps them off the column ordering', () => {
    const doc = parseDoc(`laneflow v0.1
lane Sales
lane Warehouse
Sales: a (Order)
Sales: b [Verify]
Warehouse: c [Pack]
Sales: d ((Done))
a --> b
b --> c
c --> d
`);
    const lay = layout(doc, { theme: lightTheme });
    const byId = new Map(lay.nodes.map((n) => [n.id, n]));
    expect(byId.get('a')!.laneId).toBe('Sales');
    expect(byId.get('c')!.laneId).toBe('Warehouse');
    expect(byId.get('a')!.box.y).toBeLessThan(byId.get('c')!.box.y);

    const edges = new Map(lay.edges.map((e) => [`${e.source}->${e.target}`, e]));
    expect(edges.get('a->b')!.flowType).toBe('sequence');
    expect(edges.get('b->c')!.flowType).toBe('message');
    expect(edges.get('c->d')!.flowType).toBe('message');
  });

  it('honors explicit LR direction', () => {
    const doc = parseDoc(`laneflow v0.1
direction LR
lane Sales
Sales: a (Start)
Sales: b ((End))
a --> b
`);
    const lay = layout(doc, { theme: lightTheme });
    expect(lay.direction).toBe('LR');
    const a = lay.nodes.find((n) => n.id === 'a')!;
    const b = lay.nodes.find((n) => n.id === 'b')!;
    expect(a.box.y).toBeLessThan(b.box.y);
    const centerX = (n: { box: { x: number; width: number } }) => n.box.x + n.box.width / 2;
    expect(centerX(a)).toBe(centerX(b));
  });

  it('grows cell width uniformly to fit the widest task label', () => {
    const doc = parseDoc(`laneflow v0.1
lane Sales
Sales: a (Start)
Sales: b [A very very long task label that needs more room]
Sales: c ((End))
a --> b --> c
`);
    const lay = layout(doc, { theme: lightTheme });
    const a = lay.nodes.find((n) => n.id === 'a')!;
    const b = lay.nodes.find((n) => n.id === 'b')!;
    const c = lay.nodes.find((n) => n.id === 'c')!;
    expect(b.box.x).toBeGreaterThan(a.box.x + 100);
    expect(c.box.x).toBeGreaterThan(b.box.x + 100);
  });

  it('routes every edge with at least two points and ends on the target anchor', () => {
    const doc = parseDoc(`laneflow v0.1
lane Sales
lane Warehouse
Sales: a (Order)
Sales: b <Stock?>
Warehouse: c [Pack]
Sales: d ((Done))
a --> b
b -- yes --> c
b -- no --> d
c --> d
`);
    const lay = layout(doc, { theme: lightTheme });
    for (const e of lay.edges) {
      expect(e.points.length).toBeGreaterThanOrEqual(2);
    }
    const labeled = lay.edges.find((e) => e.label === 'yes');
    expect(labeled).toBeDefined();
    expect(labeled!.labelAnchor).not.toBeNull();
  });
});
