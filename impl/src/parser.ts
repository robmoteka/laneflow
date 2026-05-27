import type {
  Direction,
  Document,
  Flow,
  Lane,
  ParseError,
  ParseResult,
  Shape,
} from './types.js';
import { makeError } from './errors.js';

const SUPPORTED_VERSIONS = new Set(['0.1']);

const IDENT_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const HEADER_RE = /^laneflow(?:\s+v(\d+\.\d+))?$/;
const DIRECTION_RE = /^direction\s+(\S+)$/;
const LANE_RE = /^lane\s+([A-Za-z][A-Za-z0-9_]*)(?:\s+"([^"]*)")?\s*$/;
const NODE_RE = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/;

type Phase = 'header' | 'direction' | 'lanes' | 'nodes' | 'flows';

const PHASE_ORDER: Phase[] = ['header', 'direction', 'lanes', 'nodes', 'flows'];

type LineKind =
  | 'header'
  | 'direction'
  | 'lane'
  | 'node'
  | 'flow'
  | 'unknown';

interface PhysicalLine {
  raw: string;
  text: string;
  line: number;
  kind: LineKind;
}

/**
 * Strip a trailing `#` comment from a single source line. A `#` inside
 * a shape's brackets or inside a double-quoted lane label is preserved.
 * Bracket tracking uses a stack so that `>` outside a `<` context (as
 * in `-->`) does not affect depth.
 */
export function stripComment(line: string): string {
  const stack: string[] = [];
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') inQuote = false;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      continue;
    }
    const top = stack[stack.length - 1];
    if (c === '(' || c === '[' || c === '<') {
      stack.push(c);
    } else if (c === ')' && top === '(') {
      stack.pop();
    } else if (c === ']' && top === '[') {
      stack.pop();
    } else if (c === '>' && top === '<') {
      stack.pop();
    } else if (c === '#' && stack.length === 0) {
      return line.slice(0, i);
    }
  }
  return line;
}

function classify(text: string): LineKind {
  if (HEADER_RE.test(text)) return 'header';
  if (/^direction(\s|$)/.test(text)) return 'direction';
  if (/^lane(\s|$)/.test(text)) return 'lane';
  if (text.includes('-->')) return 'flow';
  if (/^[A-Za-z][A-Za-z0-9_]*\s*:/.test(text)) return 'node';
  return 'unknown';
}

function preprocess(source: string): PhysicalLine[] {
  const rawLines = source.split(/\r\n|\n/);
  const out: PhysicalLine[] = [];
  rawLines.forEach((raw, idx) => {
    const stripped = stripComment(raw).trim();
    if (stripped.length === 0) return;
    out.push({
      raw,
      text: stripped,
      line: idx + 1,
      kind: classify(stripped),
    });
  });
  return out;
}

function parseShape(
  text: string,
  line: number,
  errors: ParseError[]
): { shape: Shape; label: string } | null {
  if (text.startsWith('((') && text.endsWith('))')) {
    const inner = text.slice(2, -2);
    if (inner.length === 0) errors.push(makeError('LF023', line, 'end event'));
    return { shape: 'endEvent', label: inner };
  }
  if (text.startsWith('(') && text.endsWith(')')) {
    const inner = text.slice(1, -1);
    if (inner.length === 0) errors.push(makeError('LF023', line, 'event'));
    return { shape: 'event', label: inner };
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1);
    if (inner.length === 0) errors.push(makeError('LF023', line, 'task'));
    return { shape: 'task', label: inner };
  }
  if (text.startsWith('<') && text.endsWith('>')) {
    const inner = text.slice(1, -1);
    if (inner.length === 0) errors.push(makeError('LF023', line, 'gateway'));
    return { shape: 'gateway', label: inner };
  }
  errors.push(makeError('LF022', line, text));
  return null;
}

interface FlowSegment {
  source: string;
  target: string;
  label: string | null;
}

function tokenizeFlow(
  text: string,
  line: number,
  errors: ParseError[]
): FlowSegment[] {
  // Split on `-->` (with optional inline `-- label -->` pattern).
  // Strategy: scan forward, find each `-->`, capture any `--` label
  // that appears immediately before it (after the previous endpoint).
  const tokens: { kind: 'id' | 'arrow'; value: string; line: number }[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i]!)) i++;
    if (i >= n) break;

    // Try arrow at current position
    if (text.startsWith('-->', i)) {
      tokens.push({ kind: 'arrow', value: '-->', line });
      i += 3;
      continue;
    }
    if (text.startsWith('--', i)) {
      // Labeled arrow: -- label -->
      const start = i + 2;
      const arrowAt = text.indexOf('-->', start);
      if (arrowAt === -1) {
        errors.push(makeError('LF031', line, 'unterminated labeled arrow'));
        return [];
      }
      const label = text.slice(start, arrowAt).trim();
      if (label.length === 0) {
        errors.push(makeError('LF031', line, 'empty arrow label'));
        return [];
      }
      if (label.includes('-->') || label.includes('\n')) {
        errors.push(makeError('LF032', line, label));
        return [];
      }
      tokens.push({ kind: 'arrow', value: label, line });
      i = arrowAt + 3;
      continue;
    }

    // Read an identifier
    const idMatch = text.slice(i).match(/^[A-Za-z][A-Za-z0-9_]*/);
    if (!idMatch) {
      errors.push(makeError('LF031', line, `unexpected token at "${text.slice(i, i + 20)}"`));
      return [];
    }
    tokens.push({ kind: 'id', value: idMatch[0], line });
    i += idMatch[0].length;
  }

  // Now zip into segments: id (arrow id)+
  if (tokens.length < 3 || tokens[0]!.kind !== 'id') {
    errors.push(makeError('LF031', line, 'flow must have at least one arrow'));
    return [];
  }
  const segments: FlowSegment[] = [];
  let prevId: string | null = (tokens[0] as { value: string }).value;
  for (let t = 1; t < tokens.length; t += 2) {
    const arrow = tokens[t];
    const next = tokens[t + 1];
    if (!arrow || arrow.kind !== 'arrow' || !next || next.kind !== 'id') {
      errors.push(makeError('LF031', line, 'malformed arrow sequence'));
      return [];
    }
    const label = arrow.value === '-->' ? null : arrow.value;
    segments.push({ source: prevId!, target: next.value, label });
    prevId = next.value;
  }
  return segments;
}

function checkPhaseOrder(
  expected: Phase,
  kind: LineKind,
  line: number,
  errors: ParseError[]
): Phase {
  // Determine what phase this kind belongs to.
  const kindToPhase: Record<Exclude<LineKind, 'unknown'>, Phase> = {
    header: 'header',
    direction: 'direction',
    lane: 'lanes',
    node: 'nodes',
    flow: 'flows',
  };
  if (kind === 'unknown') {
    errors.push(makeError('LF999', line));
    return expected;
  }
  const here = kindToPhase[kind];
  const expectedIdx = PHASE_ORDER.indexOf(expected);
  const hereIdx = PHASE_ORDER.indexOf(here);
  if (hereIdx < expectedIdx) {
    errors.push(makeError('LF003', line, `${kind} after ${expected}`));
  }
  return here;
}

export function parse(source: string): ParseResult {
  const errors: ParseError[] = [];
  const document: Document = {
    version: null,
    direction: null,
    lanes: [],
    nodes: [],
    flows: [],
  };

  const lines = preprocess(source);

  if (lines.length === 0) {
    errors.push(makeError('LF001', 1, 'empty document'));
    return { document, errors };
  }

  let phase: Phase = 'header';
  let headerSeen = false;

  for (const pl of lines) {
    const newPhase = checkPhaseOrder(phase, pl.kind, pl.line, errors);
    if (PHASE_ORDER.indexOf(newPhase) >= PHASE_ORDER.indexOf(phase)) {
      phase = newPhase;
    }

    switch (pl.kind) {
      case 'header': {
        if (headerSeen) {
          errors.push(makeError('LF999', pl.line, 'duplicate header'));
          break;
        }
        headerSeen = true;
        const m = pl.text.match(HEADER_RE);
        if (!m) {
          errors.push(makeError('LF001', pl.line, pl.text));
          break;
        }
        const version = m[1] ?? null;
        if (version !== null && !SUPPORTED_VERSIONS.has(version)) {
          errors.push(makeError('LF002', pl.line, version));
        }
        document.version = version;
        break;
      }
      case 'direction': {
        const m = pl.text.match(DIRECTION_RE);
        if (!m) {
          errors.push(makeError('LF004', pl.line, pl.text));
          break;
        }
        const val = m[1]!;
        if (val !== 'TB' && val !== 'LR') {
          errors.push(makeError('LF004', pl.line, val));
          break;
        }
        document.direction = val as Direction;
        break;
      }
      case 'lane': {
        const m = pl.text.match(LANE_RE);
        if (!m) {
          errors.push(makeError('LF011', pl.line, pl.text));
          break;
        }
        const [, id, label] = m;
        const lane: Lane = { id: id!, label: label ?? null, line: pl.line };
        if (document.lanes.some((l) => l.id === lane.id)) {
          errors.push(makeError('LF010', pl.line, lane.id));
          break;
        }
        document.lanes.push(lane);
        break;
      }
      case 'node': {
        const m = pl.text.match(NODE_RE);
        if (!m) {
          errors.push(makeError('LF999', pl.line, 'malformed node declaration'));
          break;
        }
        const [, laneId, nodeId, shapeText] = m;
        if (!document.lanes.some((l) => l.id === laneId)) {
          errors.push(makeError('LF020', pl.line, laneId!));
        }
        if (document.nodes.some((n) => n.id === nodeId)) {
          errors.push(makeError('LF021', pl.line, nodeId!));
          break;
        }
        const parsed = parseShape(shapeText!.trim(), pl.line, errors);
        if (!parsed) break;
        document.nodes.push({
          id: nodeId!,
          laneId: laneId!,
          shape: parsed.shape,
          label: parsed.label,
          line: pl.line,
        });
        break;
      }
      case 'flow': {
        const segments = tokenizeFlow(pl.text, pl.line, errors);
        for (const seg of segments) {
          const src = document.nodes.find((n) => n.id === seg.source);
          const dst = document.nodes.find((n) => n.id === seg.target);
          if (!src) errors.push(makeError('LF030', pl.line, seg.source));
          if (!dst) errors.push(makeError('LF030', pl.line, seg.target));
          const flowType =
            src && dst && src.laneId === dst.laneId ? 'sequence' : 'message';
          const flow: Flow = {
            source: seg.source,
            target: seg.target,
            label: seg.label,
            flowType,
            line: pl.line,
          };
          document.flows.push(flow);
        }
        break;
      }
      case 'unknown':
        // Already reported by checkPhaseOrder
        break;
    }
  }

  if (!headerSeen) {
    errors.push(makeError('LF001', 1, 'no header line found'));
  }

  // Silence noUnusedLocals for IDENT_RE if unused elsewhere
  void IDENT_RE;

  return { document, errors };
}

export function validate(source: string): ParseError[] {
  return parse(source).errors;
}
