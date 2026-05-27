# LaneFlow Renderer — visual conventions

This document describes how `@laneflow/renderer` turns a `LaneFlow Document`
into an SVG. It is **non-normative**: the LaneFlow specification
(`SPEC.md`) deliberately says nothing about pixels, fonts, or colors. Any
conforming renderer may pick different conventions as long as it preserves
the document semantics defined in `SPEC.md`. This file documents the
conventions of the reference renderer at `impl-render/`.

The intent is that a reader of a diagram produced by this renderer can
recognize the four LaneFlow shapes and the two flow types at a glance,
and that the output looks consistent across all supported themes and
directions.

## Coordinate system

- The SVG `viewBox` starts at `0 0`. Width and height are computed from
  the layout (see "Layout" below).
- Direction `TB` (top-to-bottom) places lanes as horizontal bands,
  stacked vertically in declaration order. Flow progresses left to
  right within a band.
- Direction `LR` (left-to-right) places lanes as vertical bands,
  arranged horizontally in declaration order. Flow progresses top to
  bottom within a band.
- The renderer never reorders lanes. Declaration order in the source
  document is the visual order on the canvas.

## Layout

The layout engine is a simple grid:

- One axis is fixed by lane declaration order.
- The other axis is a topological ordering of nodes by **sequence
  flow** only. Message flows do not affect column placement, because by
  definition they cross lane boundaries and would otherwise distort the
  per-lane progression.
- Nodes that have no incoming sequence flow start at column 0. Each
  outgoing sequence edge advances the column index of the target to
  `max(current, source.col + 1)`.
- Within a lane, the column index is treated as a slot; the cell's
  centerline is the anchor for the node.

Cell sizes are fixed per direction. The renderer adjusts task widths
to fit labels (see "Label metrics"), but does not shrink cells below
the defaults.

| Direction | Cell width | Cell height |
|-----------|------------|-------------|
| TB        | 180 px     | 100 px      |
| LR        | 200 px     | 120 px      |

## Lane bands

- Lane band background uses the theme's `laneBg` color, alternating
  with `laneAltBg` for visual separation.
- Lane label sits in a fixed header strip at the start of the band
  (left edge for `TB`, top edge for `LR`), width/height `120 px`.
  Label is the lane's `label` field if present, otherwise its `id`.
- A 1px stroke separates lane bands using the theme's `laneBorder`
  color.

## Shape geometry

All shapes are centered on their cell anchor. Labels are placed:

- **inside** the shape for tasks and gateways,
- **below** the shape for events and end events (with 6 px gap),

and use the theme's `text` color.

| Shape      | Geometry                                          |
|------------|---------------------------------------------------|
| `event`    | circle, `r = 18`                                  |
| `endEvent` | two concentric circles, `r = 20` (outer), `r = 15` (inner); outer stroke 2px |
| `task`     | rounded rectangle, default `120 × 50`, `rx = 8`; width grows to fit label |
| `gateway`  | diamond (rhombus), `50 × 50`, vertices at axis midpoints |

Stroke width for shape borders is `1.5 px`; fill is the theme's
`nodeFill`; stroke is the theme's `nodeStroke`.

## Flow rendering

LaneFlow has exactly two flow types, derived by the parser:

- **sequence flow** — within a single lane. Rendered as a solid line.
- **message flow** — between different lanes. Rendered as a dashed
  line, `stroke-dasharray="6 4"`.

Both use the same stroke width (`1.5 px`) and end in an arrow head.
The arrow head is a filled triangle (12 px long, 6 px wide at the
base) for sequence flow, and an open (stroke-only) triangle of the
same dimensions for message flow.

### Routing

Edges are routed as orthogonal L-shapes ("Manhattan" routing):

- For `TB` direction, the edge leaves the source horizontally and
  enters the target vertically (or the source vertically and target
  horizontally, whichever requires only one bend).
- For `LR` direction, the opposite.
- The edge anchors on the shape boundary at the side closest to the
  bend, so the line does not overlap the shape interior.

This routing intentionally does **not** detect or avoid collisions
with other nodes. Diagrams that produce ugly overlaps are a signal
that the source document is too dense for a single column layout;
the renderer reports nothing in this case.

### Edge labels

If a flow has a label, it is drawn near the midpoint of the longer
segment, with a 2 px padding rectangle in the theme's `bg` color so
it remains readable when crossing other shapes. Font is the theme's
default at 90% size.

## Themes

The renderer ships two themes:

- `light` (default): white background, dark text and strokes.
- `dark`: deep neutral background, light text and strokes.

Themes are not configurable from external files in v0.2. Adding a
custom theme requires importing the renderer programmatically and
passing a `Theme` object. The Theme shape is:

```ts
interface Theme {
  bg: string;
  laneBg: string;
  laneAltBg: string;
  laneBorder: string;
  laneLabel: string;
  nodeFill: string;
  nodeStroke: string;
  text: string;
  edge: string;
  fontFamily: string;
  fontSize: number;
}
```

### `light`

| Token       | Value                                |
|-------------|--------------------------------------|
| bg          | `#ffffff`                            |
| laneBg      | `#fafafa`                            |
| laneAltBg   | `#f0f0f0`                            |
| laneBorder  | `#d0d0d0`                            |
| laneLabel   | `#333333`                            |
| nodeFill    | `#ffffff`                            |
| nodeStroke  | `#333333`                            |
| text        | `#111111`                            |
| edge        | `#333333`                            |
| fontFamily  | `system-ui, -apple-system, sans-serif` |
| fontSize    | `13`                                 |

### `dark`

| Token       | Value                                |
|-------------|--------------------------------------|
| bg          | `#1a1a1a`                            |
| laneBg      | `#222222`                            |
| laneAltBg   | `#2a2a2a`                            |
| laneBorder  | `#444444`                            |
| laneLabel   | `#dddddd`                            |
| nodeFill    | `#2a2a2a`                            |
| nodeStroke  | `#cccccc`                            |
| text        | `#eeeeee`                            |
| edge        | `#cccccc`                            |
| fontFamily  | `system-ui, -apple-system, sans-serif` |
| fontSize    | `13`                                 |

## Label metrics

The renderer estimates label width without access to a real font
engine. The estimator multiplies character count by a per-character
average for the theme's font size, with three width buckets:

- narrow (`i l I . , ; : ' |`): `0.40 × fontSize`
- wide (`m w M W`): `0.95 × fontSize`
- default: `0.58 × fontSize`

The estimate is used to grow task rectangles horizontally so the
label fits with 16 px horizontal padding on each side. Other shapes
do not resize; their labels are external (events, end events) or
placed below if they overflow (gateways).

## PNG output

PNG output is generated by `@resvg/resvg-js` from the renderer's SVG
output. The default DPI is 96; passing `--scale N` to the CLI (or
`{ scale: N }` programmatically) multiplies output pixel dimensions
by `N`. Output is always RGBA, no transparency control beyond the
theme's `bg`.

## What this renderer is **not**

- It is not interactive. Output SVGs contain no `<script>`, no
  `<a>`, no hover behavior.
- It does not animate.
- It does not export to BPMN XML or any other format.
- It does not embed web fonts. Text rendering depends on fonts
  available on the system that consumes the SVG (or on resvg's
  bundled fonts for PNG output).
- It does not validate the input. Validation happens in
  `@laneflow/parser`. The renderer assumes a valid `Document`.
