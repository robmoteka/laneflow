import { parse } from '@laneflow/parser';
import type { Document } from '@laneflow/parser';
import { layout } from './layout.js';
import { renderSvg } from './svg.js';
import { renderPng } from './png.js';
import { resolveTheme } from './theme.js';
import type { Theme, ThemeName } from './theme.js';

export interface RenderOptions {
  theme?: ThemeName | Theme;
  direction?: 'TB' | 'LR';
}

export interface PngRenderOptions extends RenderOptions {
  scale?: number;
}

export function renderToSvg(input: string | Document, options: RenderOptions = {}): string {
  const doc = toDocument(input);
  const theme = resolveTheme(options.theme);
  const lay = layout(doc, { direction: options.direction, theme });
  return renderSvg(lay, theme);
}

export function renderToPng(input: string | Document, options: PngRenderOptions = {}): Uint8Array {
  const svg = renderToSvg(input, options);
  return renderPng(svg, options.scale ?? 1);
}

function toDocument(input: string | Document): Document {
  if (typeof input !== 'string') return input;
  const result = parse(input);
  if (result.errors.length > 0) {
    const details = result.errors
      .map((e) => `${e.code} line ${e.line}: ${e.message}`)
      .join('; ');
    throw new Error(`LaneFlow parser errors: ${details}`);
  }
  return result.document;
}

export { lightTheme, darkTheme, resolveTheme } from './theme.js';
export type { Theme, ThemeName } from './theme.js';
export { layout } from './layout.js';
export type {
  Layout,
  LaidOutNode,
  LaidOutEdge,
  LaidOutLane,
  LayoutOptions,
} from './layout.js';
