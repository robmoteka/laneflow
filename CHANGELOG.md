# Changelog

All notable changes to the LaneFlow specification are documented here.

This file follows the format of [Keep a Changelog](https://keepachangelog.com/)
and the versioning policy described in `CONTRIBUTING.md`.

---

## [Unreleased]

Work in progress toward v0.1 final.

### Added — Reference parser (`impl/`)

- TypeScript reference parser at `impl/` (`@laneflow/parser`, package
  version `0.1.0-draft`). Pure ESM, zero runtime dependencies.
- Public API: `parse(source)` returning `{ document, errors }`,
  `validate(source)` shortcut, and exported type definitions.
- CLI: `laneflow validate <file>` and `laneflow parse <file> [--json]`.
- Test suite (Vitest, 37 tests): happy paths for the four shapes and
  arrow forms; one test per error code from SPEC §5; conformance check
  that every file in `examples/` parses cleanly.
- `LICENSE-CODE` added to the repository root with the MIT license that
  covers `impl/` and future source code (the specification stays under
  CC BY 4.0).

### Added — AI authoring materials (Step 2)

- `ai/AUTHORING_GUIDE.md` — long-form guide for LLM-based assistants:
  mental model, seven-step generation procedure, style rules,
  natural-language-to-LaneFlow mapping table.
- `ai/SYSTEM_PROMPT.md` — condensed, drop-in system prompt (~350
  words) for production applications.
- `ai/error-recovery.md` — catalog of 14 common mistakes with
  before/after fixes (E1–E14).
- `ai/few-shot/` — five worked examples covering linear, gateway,
  multi-lane, malformed-input repair, and ambiguous-source cases.
- `.claude/skills/laneflow/SKILL.md` — Claude Code skill with
  `generate` and `review` subcommands.

---

## [v0.1-draft] — 2026-05-27

Initial public draft of the specification.

### Added

- Document structure: fixed section order (header, direction, lanes,
  nodes, flows).
- `direction TB | LR` directive (optional).
- Lane declarations: `lane <id> ["optional label"]`.
- Four node shapes: event `(text)`, end event `((text))`, task `[text]`,
  gateway `<text>`.
- Node declarations: `<lane-id>: <node-id> <shape>`.
- Flow lines: `a --> b`, `a -- label --> b`, chained `a --> b --> c`.
- Automatic classification of sequence flow (intra-lane) vs. message flow
  (cross-lane).
- Comment syntax: `# to end of line`.
- 14 reserved error codes (`LF001`–`LF032`).
- Three worked examples in `examples/`.
- EBNF grammar in `docs/grammar.ebnf`.
- Design decision log in `docs/DESIGN_DECISIONS.md`.
