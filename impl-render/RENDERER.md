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
- The other axis is a topological ordering of nodes across **all
  flows**, sequence and message alike. Every arrow means "later", so
  every arrow advances the target one column past the source. Treating
  only sequence flows as ordering edges produces stacked nodes for
  cross-lane ping-pong processes, which is why the renderer uses both.
- Nodes with no incoming flow start at column 0. Each incoming edge
  raises the target's column to `max(current, source.col + 1)`.
- Within a lane, the column index is treated as a slot; the cell's
  centerline is the anchor for the node.
- Cycles, if any, are bounded by `nodes.length` iterations of
  relaxation; the column index will saturate but layout will not
  diverge.

Cell sizes are uniform across the diagram. The renderer starts from a
default and grows the cell width to `max(default, widest task + 24)`
so every task fits its label without overflowing into a neighboring
cell. Cell height stays at the default.

| Direction | Default cell width | Cell height |
|-----------|--------------------|-------------|
| TB        | 180 px             | 100 px      |
| LR        | 200 px             | 120 px      |

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

**Gateway override.** Every edge that leaves a gateway is rendered as
sequence flow (solid line, filled arrow head) regardless of whether
the parser classified it as message flow. A gateway is a control-flow
decision: its branches describe which path the process takes, not a
hand-off between participants. Drawing a `yes`/`no` branch with a
dashed line would conflict with the BPMN convention where dashed means
message flow, so the renderer steps in and visually treats gateway
branches as sequence flow. The semantic classification in the
`Document` is unchanged; only the stroke style is.

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

**Distributed anchors.** When several edges share the same side of
the same node, the renderer distributes their anchor points instead
of stacking them on the midpoint. For `N` edges entering (or
leaving) through a given side, anchor `i` (0-indexed, sorted by the
position of the other endpoint along the perpendicular axis) is
placed at `(i + 1) / (N + 1)` along the side.

- **Tasks** distribute along the rectangle side, with 8 px padding
  from each corner.
- **Events and end events** distribute angularly on the circle's
  perimeter, within a ±30° arc centered on the side's normal. The
  anchor stays on the circle so the arrow head touches the boundary.

Gateways keep their fixed mid-side anchors because their branches
typically leave through different sides, so accumulating multiple
edges on one side is unusual.

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
