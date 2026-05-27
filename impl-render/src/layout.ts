import type { Document, Flow, NodeDecl, Direction } from '@laneflow/parser';
import type { Box, Point } from './geometry.js';
import {
  shapeSize,
  pickSides,
  anchorPoint,
  manhattanPath,
} from './geometry.js';
import type { Theme } from './theme.js';

export const LANE_HEADER_SIZE = 120;
export const CELL_TB = { width: 180, height: 100 } as const;
export const CELL_LR = { width: 200, height: 120 } as const;

export interface LaidOutNode {
  id: string;
  shape: NodeDecl['shape'];
  label: string;
  laneId: string;
  box: Box;
}

export interface LaidOutEdge {
  source: string;
  target: string;
  flowType: Flow['flowType'];
  label: string | null;
  points: Point[];
  labelAnchor: Point | null;
}

export interface LaidOutLane {
  id: string;
  label: string;
  header: Box;
  band: Box;
  alt: boolean;
}

export interface Layout {
  direction: Direction;
  canvas: { width: number; height: number };
  lanes: LaidOutLane[];
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
}

export interface LayoutOptions {
  direction?: Direction;
  theme: Theme;
}

export function layout(doc: Document, opts: LayoutOptions): Layout {
  const direction: Direction = opts.direction ?? doc.direction ?? 'TB';
  const baseCell = direction === 'TB' ? CELL_TB : CELL_LR;
  const { theme } = opts;

  const columns = computeColumns(doc);
  const maxColumn = doc.nodes.reduce((max, n) => Math.max(max, columns.get(n.id) ?? 0), 0);

  const lanesById = new Map(doc.lanes.map((l, idx) => [l.id, idx]));

  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of doc.nodes) {
    sizes.set(n.id, shapeSize(n.shape, n.label, theme.fontSize));
  }
  const maxNodeWidth = doc.nodes.reduce((max, n) => Math.max(max, sizes.get(n.id)!.width), 0);
  const cell = {
    width: Math.max(baseCell.width, maxNodeWidth + 24),
    height: baseCell.height,
  };

  const lanes: LaidOutLane[] = [];
  let canvasWidth = 0;
  let canvasHeight = 0;

  if (direction === 'TB') {
    canvasWidth = LANE_HEADER_SIZE + (maxColumn + 1) * cell.width;
    for (let i = 0; i < doc.lanes.length; i++) {
      const ln = doc.lanes[i];
      const y = i * cell.height;
      lanes.push({
        id: ln.id,
        label: ln.label ?? ln.id,
        header: { x: 0, y, width: LANE_HEADER_SIZE, height: cell.height },
        band: { x: LANE_HEADER_SIZE, y, width: canvasWidth - LANE_HEADER_SIZE, height: cell.height },
        alt: i % 2 === 1,
      });
      canvasHeight = (i + 1) * cell.height;
    }
  } else {
    canvasHeight = LANE_HEADER_SIZE + (maxColumn + 1) * cell.height;
    for (let i = 0; i < doc.lanes.length; i++) {
      const ln = doc.lanes[i];
      const x = i * cell.width;
      lanes.push({
        id: ln.id,
        label: ln.label ?? ln.id,
        header: { x, y: 0, width: cell.width, height: LANE_HEADER_SIZE },
        band: { x, y: LANE_HEADER_SIZE, width: cell.width, height: canvasHeight - LANE_HEADER_SIZE },
        alt: i % 2 === 1,
      });
      canvasWidth = (i + 1) * cell.width;
    }
  }

  const nodes: LaidOutNode[] = doc.nodes.map((n) => {
    const size = sizes.get(n.id)!;
    const col = columns.get(n.id) ?? 0;
    const laneIdx = lanesById.get(n.laneId) ?? 0;
    let x: number;
    let y: number;
    if (direction === 'TB') {
      const cellX = LANE_HEADER_SIZE + col * cell.width;
      const cellY = laneIdx * cell.height;
      x = cellX + (cell.width - size.width) / 2;
      y = cellY + (cell.height - size.height) / 2;
    } else {
      const cellX = laneIdx * cell.width;
      const cellY = LANE_HEADER_SIZE + col * cell.height;
      x = cellX + (cell.width - size.width) / 2;
      y = cellY + (cell.height - size.height) / 2;
    }
    return {
      id: n.id,
      shape: n.shape,
      label: n.label,
      laneId: n.laneId,
      box: { x, y, width: size.width, height: size.height },
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edges: LaidOutEdge[] = doc.flows.map((f) => {
    const src = nodeById.get(f.source)!;
    const tgt = nodeById.get(f.target)!;
    const { fromSide, toSide } = pickSides(src.box, tgt.box, direction);
    const from = anchorPoint(src.box, src.shape, fromSide);
    const to = anchorPoint(tgt.box, tgt.shape, toSide);
    const points = manhattanPath(from, to, fromSide, toSide);
    return {
      source: f.source,
      target: f.target,
      flowType: f.flowType,
      label: f.label,
      points,
      labelAnchor: f.label ? midOfLongestSegment(points) : null,
    };
  });

  return {
    direction,
    canvas: { width: canvasWidth, height: canvasHeight },
    lanes,
    nodes,
    edges,
  };
}

function computeColumns(doc: Document): Map<string, number> {
  const col = new Map<string, number>();
  for (const n of doc.nodes) col.set(n.id, 0);
  const sequenceFlows = doc.flows.filter((f) => f.flowType === 'sequence');
  const maxIter = doc.nodes.length + 1;
  for (let i = 0; i < maxIter; i++) {
    let changed = false;
    for (const f of sequenceFlows) {
      const src = col.get(f.source);
      const tgt = col.get(f.target);
      if (src === undefined || tgt === undefined) continue;
      if (src + 1 > tgt) {
        col.set(f.target, src + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return col;
}

function midOfLongestSegment(points: Point[]): Point {
  let bestLen = -1;
  let bestMid: Point = points[0];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      bestMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }
  return bestMid;
}
