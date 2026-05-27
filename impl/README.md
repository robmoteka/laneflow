# @laneflow/parser

Reference parser and CLI for the LaneFlow notation, v0.1.

- **Spec:** see `../SPEC.md` (the normative source of truth)
- **License:** MIT (see `../LICENSE-CODE`)
- **No runtime dependencies.** Pure TypeScript, ESM, Node 18+.

This package is part of the LaneFlow repository. It exists to provide a
canonical implementation of the v0.1 grammar so that:

1. The specification can be tested against reality (every example in
   `examples/` and every error in `ai/error-recovery.md` is exercised
   by this parser's test suite).
2. Other tools (editors, linters, the MD2PDF renderer, AI authoring
   loops) can validate LaneFlow input without each rolling their own.

It is intentionally minimal. There is no renderer, no auto-layout, no
language server. Those belong in separate packages.

---

## Install (after publishing)

```bash
npm install @laneflow/parser
```

Until the first public release, consume it via the local path or as a
git dependency.

---

## API

```ts
import { parse, validate } from '@laneflow/parser';

const source = `laneflow v0.1

lane Sales
Sales: start (Order)
Sales: done  ((Done))
start --> done
`;

const { document, errors } = parse(source);

if (errors.length === 0) {
  console.log(document.lanes);
  console.log(document.nodes);
  console.log(document.flows);
}

// Or, when you only care about validity:
const errs = validate(source);
```

### `parse(source: string): ParseResult`

Parses a full LaneFlow document. Always returns a `ParseResult`, even on
malformed input — the parser is resilient and reports as many errors as
it can find in one pass.

```ts
interface ParseResult {
  document: Document;       // partially populated if errors > 0
  errors: ParseError[];     // empty array on success
}
```

`Document`, `Lane`, `NodeDecl`, `Flow`, `ParseError`, and `ErrorCode`
are exported types. See `src/types.ts` for the full definitions.

### `validate(source: string): ParseError[]`

Shortcut for `parse(source).errors`. Returns an empty array if the
document conforms to the spec.

### Sequence vs. message flow

The parser classifies every flow as either `sequence` (intra-lane) or
`message` (cross-lane). This classification is derived from the lane
membership of the endpoints and is set on the `flowType` property of
each flow. Authors never declare it; see SPEC §3.5 and DD-005.

### Error codes

Errors use the codes defined in SPEC §5 (`LF001`–`LF999`). The full
table lives in `src/errors.ts`. The parser continues past recoverable
errors so users see all problems at once.

---

## CLI

```bash
# Validate a file; exit 0 if OK, exit 1 if errors.
laneflow validate path/to/process.laneflow

# Print the parsed AST in a human-readable form.
laneflow parse path/to/process.laneflow

# Same, as JSON (suitable for piping to jq, etc.).
laneflow parse path/to/process.laneflow --json
```

During development, run the CLI without installing:

```bash
node dist/cli.js validate ../examples/01-linear-process.laneflow
```

---

## Build and test

```bash
npm install
npm run build       # tsc → dist/
npm test            # vitest run
```

The test suite covers three layers:

| File | Layer |
|------|-------|
| `test/parse.test.ts` | Happy paths: minimal documents, all four shapes, labeled / chained arrows, sequence vs. message classification, comment stripping. |
| `test/errors.test.ts` | One test per error code from SPEC §5, plus an error-recovery test verifying multiple errors are reported in one pass. |
| `test/examples.test.ts` | All `.laneflow` files in `../examples/` must parse cleanly. The three SPEC §6 normative examples are also re-checked. |

A failing test here is either a parser bug or a real spec issue —
treat it as a blocker.

---

## Status and stability

The package version is `0.1.0-draft`. While LaneFlow is pre-1.0, the
public API and CLI surface may change in any release that bumps the
minor version. Each such change will appear in the repository's top-level
`CHANGELOG.md`.
