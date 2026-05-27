import type { Layout, LaidOutNode, LaidOutEdge, LaidOutLane } from './layout.js';
import type { Theme } from './theme.js';
import {
  EVENT_RADIUS,
  END_EVENT_OUTER_RADIUS,
  END_EVENT_INNER_RADIUS,
  TASK_CORNER_RADIUS,
  estimateTextWidth,
} from './geometry.js';

export function renderSvg(lay: Layout, theme: Theme): string {
  const { width, height } = lay.canvas;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(defs(theme));
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.bg}"/>`);
  parts.push(renderLanes(lay.lanes, lay.direction, theme));
  parts.push(renderEdges(lay.edges, theme));
  parts.push(renderNodes(lay.nodes, theme));
  parts.push('</svg>');
  return parts.join('\n');
}

function defs(theme: Theme): string {
  return [
    '<defs>',
    `<marker id="arrow-seq" viewBox="0 0 12 6" refX="11" refY="3" markerWidth="12" markerHeight="6" orient="auto-start-reverse">`,
    `<path d="M 0 0 L 12 3 L 0 6 z" fill="${theme.edge}"/>`,
    '</marker>',
    `<marker id="arrow-msg" viewBox="0 0 12 6" refX="11" refY="3" markerWidth="12" markerHeight="6" orient="auto-start-reverse">`,
    `<path d="M 0 0 L 12 3 L 0 6 z" fill="none" stroke="${theme.edge}" stroke-width="1"/>`,
    '</marker>',
    '</defs>',
  ].join('\n');
}

function renderLanes(lanes: LaidOutLane[], direction: 'TB' | 'LR', theme: Theme): string {
  const out: string[] = ['<g class="lanes">'];
  for (const ln of lanes) {
    const bandFill = ln.alt ? theme.laneAltBg : theme.laneBg;
    out.push(
      `<rect x="${ln.band.x}" y="${ln.band.y}" width="${ln.band.width}" height="${ln.band.height}" fill="${bandFill}"/>`,
    );
    out.push(
      `<rect x="${ln.header.x}" y="${ln.header.y}" width="${ln.header.width}" height="${ln.header.height}" fill="${theme.laneAltBg}"/>`,
    );
    out.push(
      `<rect x="${ln.header.x}" y="${ln.header.y}" width="${ln.header.width}" height="${ln.header.height}" fill="none" stroke="${theme.laneBorder}" stroke-width="1"/>`,
    );
    out.push(
      `<rect x="${ln.band.x}" y="${ln.band.y}" width="${ln.band.width}" height="${ln.band.height}" fill="none" stroke="${theme.laneBorder}" stroke-width="1"/>`,
    );

    const labelCx = ln.header.x + ln.header.width / 2;
    const labelCy = ln.header.y + ln.header.height / 2;
    const rotate = direction === 'TB' ? ` transform="rotate(-90 ${labelCx} ${labelCy})"` : '';
    out.push(
      `<text x="${labelCx}" y="${labelCy}" font-family="${theme.fontFamily}" font-size="${theme.fontSize}" font-weight="600" fill="${theme.laneLabel}" text-anchor="middle" dominant-baseline="middle"${rotate}>${escapeXml(ln.label)}</text>`,
    );
  }
  out.push('</g>');
  return out.join('\n');
}

function renderEdges(edges: LaidOutEdge[], theme: Theme): string {
  const out: string[] = ['<g class="edges">'];
  for (const e of edges) {
    const d = pointsToPath(e.points);
    const dash = e.flowType === 'message' ? ' stroke-dasharray="6 4"' : '';
    const marker = e.flowType === 'message' ? 'arrow-msg' : 'arrow-seq';
    out.push(
      `<path d="${d}" fill="none" stroke="${theme.edge}" stroke-width="1.5"${dash} marker-end="url(#${marker})"/>`,
    );
    if (e.label && e.labelAnchor) {
      const labelFontSize = Math.round(theme.fontSize * 0.9);
      const w = estimateTextWidth(e.label, labelFontSize) + 8;
      const h = labelFontSize + 4;
      const lx = e.labelAnchor.x;
      const ly = e.labelAnchor.y;
      out.push(
        `<rect x="${lx - w / 2}" y="${ly - h / 2}" width="${w}" height="${h}" fill="${theme.bg}"/>`,
      );
      out.push(
        `<text x="${lx}" y="${ly}" font-family="${theme.fontFamily}" font-size="${labelFontSize}" fill="${theme.text}" text-anchor="middle" dominant-baseline="middle">${escapeXml(e.label)}</text>`,
      );
    }
  }
  out.push('</g>');
  return out.join('\n');
}

function renderNodes(nodes: LaidOutNode[], theme: Theme): string {
  const out: string[] = ['<g class="nodes">'];
  for (const n of nodes) {
    out.push(renderNode(n, theme));
  }
  out.push('</g>');
  return out.join('\n');
}

function renderNode(n: LaidOutNode, theme: Theme): string {
  const cx = n.box.x + n.box.width / 2;
  const cy = n.box.y + n.box.height / 2;
  const lines: string[] = [];

  switch (n.shape) {
    case 'event': {
      lines.push(
        `<circle cx="${cx}" cy="${cy}" r="${EVENT_RADIUS}" fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="1.5"/>`,
      );
      lines.push(externalLabel(n, theme, EVENT_RADIUS));
      break;
    }
    case 'endEvent': {
      lines.push(
        `<circle cx="${cx}" cy="${cy}" r="${END_EVENT_OUTER_RADIUS}" fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="2"/>`,
      );
      lines.push(
        `<circle cx="${cx}" cy="${cy}" r="${END_EVENT_INNER_RADIUS}" fill="none" stroke="${theme.nodeStroke}" stroke-width="1.5"/>`,
      );
      lines.push(externalLabel(n, theme, END_EVENT_OUTER_RADIUS));
      break;
    }
    case 'task': {
      lines.push(
        `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.width}" height="${n.box.height}" rx="${TASK_CORNER_RADIUS}" ry="${TASK_CORNER_RADIUS}" fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="1.5"/>`,
      );
      lines.push(internalLabel(n, theme));
      break;
    }
    case 'gateway': {
      const halfW = n.box.width / 2;
      const halfH = n.box.height / 2;
      const points = `${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}`;
      lines.push(
        `<polygon points="${points}" fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="1.5"/>`,
      );
      lines.push(externalLabel(n, theme, halfH));
      break;
    }
  }
  return lines.join('\n');
}

function internalLabel(n: LaidOutNode, theme: Theme): string {
  const cx = n.box.x + n.box.width / 2;
  const cy = n.box.y + n.box.height / 2;
  return `<text x="${cx}" y="${cy}" font-family="${theme.fontFamily}" font-size="${theme.fontSize}" fill="${theme.text}" text-anchor="middle" dominant-baseline="middle">${escapeXml(n.label)}</text>`;
}

function externalLabel(n: LaidOutNode, theme: Theme, halfHeight: number): string {
  const cx = n.box.x + n.box.width / 2;
  const cy = n.box.y + n.box.height / 2;
  const y = cy + halfHeight + 6 + theme.fontSize * 0.8;
  return `<text x="${cx}" y="${y}" font-family="${theme.fontFamily}" font-size="${theme.fontSize}" fill="${theme.text}" text-anchor="middle">${escapeXml(n.label)}</text>`;
}

function pointsToPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
