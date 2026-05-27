import type { Shape } from '@laneflow/parser';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point, Size {}

export const SHAPE_DEFAULTS: Record<Shape, Size> = {
  event: { width: 36, height: 36 },
  endEvent: { width: 40, height: 40 },
  task: { width: 120, height: 50 },
  gateway: { width: 50, height: 50 },
};

export const EVENT_RADIUS = 18;
export const END_EVENT_OUTER_RADIUS = 20;
export const END_EVENT_INNER_RADIUS = 15;
export const TASK_CORNER_RADIUS = 8;
export const TASK_HORIZONTAL_PADDING = 16;
export const TASK_MIN_WIDTH = 120;
export const TASK_HEIGHT = 50;

export const NARROW_CHARS = new Set("iltI.,;:'|! ".split(''));
export const WIDE_CHARS = new Set('mwMW%@'.split(''));

export function estimateTextWidth(text: string, fontSize: number): number {
  let total = 0;
  for (const ch of text) {
    if (NARROW_CHARS.has(ch)) total += 0.40 * fontSize;
    else if (WIDE_CHARS.has(ch)) total += 0.95 * fontSize;
    else total += 0.58 * fontSize;
  }
  return total;
}

export function shapeSize(shape: Shape, label: string, fontSize: number): Size {
  if (shape === 'task') {
    const labelWidth = estimateTextWidth(label, fontSize);
    const width = Math.max(TASK_MIN_WIDTH, Math.ceil(labelWidth + TASK_HORIZONTAL_PADDING * 2));
    return { width, height: TASK_HEIGHT };
  }
  return SHAPE_DEFAULTS[shape];
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

export function anchorPoint(box: Box, shape: Shape, side: Side, t: number = 0.5): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (shape === 'event' || shape === 'endEvent') {
    const r = shape === 'event' ? EVENT_RADIUS : END_EVENT_OUTER_RADIUS;
    switch (side) {
      case 'top': return { x: cx, y: cy - r };
      case 'bottom': return { x: cx, y: cy + r };
      case 'left': return { x: cx - r, y: cy };
      case 'right': return { x: cx + r, y: cy };
    }
  }

  if (shape === 'gateway') {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    switch (side) {
      case 'top': return { x: cx, y: cy - halfH };
      case 'bottom': return { x: cx, y: cy + halfH };
      case 'left': return { x: cx - halfW, y: cy };
      case 'right': return { x: cx + halfW, y: cy };
    }
  }

  const padX = 8;
  const padY = 8;
  const lerpX = box.x + padX + (box.width - 2 * padX) * t;
  const lerpY = box.y + padY + (box.height - 2 * padY) * t;
  switch (side) {
    case 'top': return { x: lerpX, y: box.y };
    case 'bottom': return { x: lerpX, y: box.y + box.height };
    case 'left': return { x: box.x, y: lerpY };
    case 'right': return { x: box.x + box.width, y: lerpY };
  }
}

export function pickSides(from: Box, to: Box, direction: 'TB' | 'LR'): { fromSide: Side; toSide: Side } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  if (direction === 'TB') {
    if (toCx > fromCx) return { fromSide: 'right', toSide: 'left' };
    if (toCx < fromCx) return { fromSide: 'left', toSide: 'right' };
    return { fromSide: toCy > fromCy ? 'bottom' : 'top', toSide: toCy > fromCy ? 'top' : 'bottom' };
  }

  if (toCy > fromCy) return { fromSide: 'bottom', toSide: 'top' };
  if (toCy < fromCy) return { fromSide: 'top', toSide: 'bottom' };
  return { fromSide: toCx > fromCx ? 'right' : 'left', toSide: toCx > fromCx ? 'left' : 'right' };
}

export function manhattanPath(from: Point, to: Point, fromSide: Side, toSide: Side): Point[] {
  if (from.x === to.x || from.y === to.y) return [from, to];

  const fromHorizontal = fromSide === 'left' || fromSide === 'right';
  const toHorizontal = toSide === 'left' || toSide === 'right';

  if (fromHorizontal && !toHorizontal) {
    return [from, { x: to.x, y: from.y }, to];
  }
  if (!fromHorizontal && toHorizontal) {
    return [from, { x: from.x, y: to.y }, to];
  }
  if (fromHorizontal && toHorizontal) {
    const midX = (from.x + to.x) / 2;
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }
  const midY = (from.y + to.y) / 2;
  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}
