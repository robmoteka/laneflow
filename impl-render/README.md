# @laneflow/renderer

Reference SVG/PNG renderer for the [LaneFlow](https://github.com/robmoteka/laneflow)
notation. Consumes documents parsed by `@laneflow/parser` and emits
diagrams in two themes (`light`, `dark`) and two directions (`TB`, `LR`).

- **Status:** v0.2.0-draft
- **License:** MIT
- **Runtime dependencies:** `@laneflow/parser`, `@resvg/resvg-js`

The visual conventions (shape geometry, colors, edge styling) are
documented separately in [`RENDERER.md`](./RENDERER.md). They are
**non-normative**: the LaneFlow specification stays purely semantic,
so other renderers may pick different conventions without conflicting
with the spec.

## Install

```sh
npm install @laneflow/renderer
```

## API

```ts
import { renderToSvg, renderToPng } from '@laneflow/renderer';

const source = `laneflow v0.1
lane Sales
Sales: start (Order received)
Sales: check [Verify order]
Sales: done  ((Order confirmed))
start --> check --> done
`;

const svg: string = renderToSvg(source);
const png: Uint8Array = renderToPng(source, { theme: 'dark', scale: 2 });
```

Both functions accept either a LaneFlow source string or an already
parsed `Document` (from `@laneflow/parser`). When given a string, the
renderer parses it internally and throws if the parser reports any
errors — use `@laneflow/parser` directly if you want to handle errors
yourself.

### Options

```ts
interface RenderOptions {
  theme?: 'light' | 'dark' | Theme;  // default: 'light'
  direction?: 'TB' | 'LR';            // overrides the document's direction
}

interface PngRenderOptions extends RenderOptions {
  scale?: number;                     // default: 1
}
```

A custom `Theme` object can be passed instead of a theme name; see
`src/theme.ts` for the shape.

## CLI

Installed as `laneflow-render`:

```sh
laneflow-render render diagram.laneflow -o diagram.svg
laneflow-render render diagram.laneflow -o diagram.png --theme dark --scale 2
```

| Option              | Description                                              |
|---------------------|----------------------------------------------------------|
| `-o, --output PATH` | Output file. Format inferred from extension (`.svg`/`.png`). Omit for SVG on stdout. |
| `--theme NAME`      | `light` (default) or `dark`.                             |
| `--direction TB\|LR`| Override the document's direction.                       |
| `--scale N`         | PNG scale factor (default 1). Ignored for SVG output.    |
| `-h, --help`        | Show usage.                                              |

## Development

```sh
npm install
npm run build
npm test
```

Snapshot SVGs live under `test/__snapshots__/` as plain `.svg` files
so they can be opened directly in a browser during review. Update them
with:

```sh
UPDATE_SNAPSHOTS=1 npm test
```
