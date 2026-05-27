import { describe, it, expect } from 'vitest';
import { parse, stripComment } from '../src/index.js';

describe('stripComment', () => {
  it('strips a trailing comment', () => {
    expect(stripComment('Sales: check [Check]   # trailing')).toBe(
      'Sales: check [Check]   '
    );
  });

  it('does not strip # inside brackets', () => {
    expect(stripComment('Sales: check [Check # foo]')).toBe(
      'Sales: check [Check # foo]'
    );
  });

  it('does not strip # inside quoted lane label', () => {
    expect(stripComment('lane Sales "Sales # team"')).toBe(
      'lane Sales "Sales # team"'
    );
  });

  it('handles > in --> without messing up depth', () => {
    expect(stripComment('a --> b # tail')).toBe('a --> b ');
  });

  it('handles gateway < and > correctly', () => {
    expect(stripComment('Sales: g <Q? # nope>')).toBe('Sales: g <Q? # nope>');
  });

  it('returns empty string when whole line is a comment', () => {
    expect(stripComment('# just a comment')).toBe('');
  });
});

describe('parse — minimal valid document', () => {
  it('parses a one-lane one-node document', () => {
    const src = `laneflow v0.1

lane Sales

Sales: start (Start)
Sales: done  ((Done))

start --> done
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.version).toBe('0.1');
    expect(document.lanes).toHaveLength(1);
    expect(document.nodes).toHaveLength(2);
    expect(document.flows).toHaveLength(1);
    expect(document.flows[0]!.flowType).toBe('sequence');
  });

  it('accepts header without version', () => {
    const src = `laneflow

lane S
S: a (a)
S: b ((b))
a --> b
`;
    const { errors } = parse(src);
    expect(errors).toEqual([]);
  });

  it('parses direction', () => {
    const src = `laneflow v0.1
direction LR

lane S
S: a (a)
S: b ((b))
a --> b
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.direction).toBe('LR');
  });
});

describe('parse — sequence vs message flow', () => {
  it('classifies same-lane arrow as sequence', () => {
    const src = `laneflow v0.1
lane A
A: x (x)
A: y ((y))
x --> y
`;
    const { document } = parse(src);
    expect(document.flows[0]!.flowType).toBe('sequence');
  });

  it('classifies cross-lane arrow as message', () => {
    const src = `laneflow v0.1
lane A
lane B
A: x (x)
B: y ((y))
x --> y
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.flows[0]!.flowType).toBe('message');
  });
});

describe('parse — labeled and chained arrows', () => {
  it('parses a labeled arrow', () => {
    const src = `laneflow v0.1
lane S
S: a (a)
S: b ((b))
a -- yes --> b
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.flows[0]!.label).toBe('yes');
  });

  it('expands a chained arrow into multiple flows', () => {
    const src = `laneflow v0.1
lane S
S: a (a)
S: b [b]
S: c ((c))
a --> b --> c
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.flows).toHaveLength(2);
    expect(document.flows[0]!.source).toBe('a');
    expect(document.flows[0]!.target).toBe('b');
    expect(document.flows[1]!.source).toBe('b');
    expect(document.flows[1]!.target).toBe('c');
  });

  it('parses a chain with a labeled arrow in the middle', () => {
    const src = `laneflow v0.1
lane S
S: a (a)
S: b <q?>
S: c ((c))
a --> b -- yes --> c
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(document.flows).toHaveLength(2);
    expect(document.flows[1]!.label).toBe('yes');
  });
});

describe('parse — all four shapes', () => {
  it('recognises event, end event, task, gateway', () => {
    const src = `laneflow v0.1
lane S
S: e (event)
S: t [task]
S: g <gateway?>
S: end ((endEvent))
e --> t
t --> g
g -- y --> end
`;
    const { document, errors } = parse(src);
    expect(errors).toEqual([]);
    const shapes = document.nodes.map((n) => n.shape);
    expect(shapes).toEqual(['event', 'task', 'gateway', 'endEvent']);
  });
});
