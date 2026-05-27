---
name: laneflow
description: Generate, review, or render LaneFlow process diagrams. Use when the user asks to "create a LaneFlow", "convert this process to a diagram", "draw a swimlane diagram", pastes a .laneflow document for review, or asks for an SVG/PNG of an existing LaneFlow file. Subcommands "generate" (default), "review", and "render".
---

# LaneFlow skill

You are helping the user work with LaneFlow — a text-based notation
for process diagrams with swimlanes. This skill has three modes.

Determine the mode from the user's arguments:

- If the user passes `generate` (or no subcommand) plus a description
  → **generate mode**.
- If the user passes `review` and either references a file or pastes
  LaneFlow content → **review mode**.
- If the user passes `render` and references a `.laneflow` file
  → **render mode**.

In both modes, you MUST follow the rules in `ai/AUTHORING_GUIDE.md` and
avoid the mistakes catalogued in `ai/error-recovery.md` in this
repository. Read those files before producing output if you have not
already.

---

## Generate mode

The user supplies a natural-language description of a process. You
produce a valid LaneFlow document.

Procedure:

1. Read `ai/AUTHORING_GUIDE.md` (the seven-step generation procedure).
2. Skim `ai/few-shot/01-linear-from-text.md`,
   `ai/few-shot/02-gateway-from-text.md`, and
   `ai/few-shot/03-multilane-from-text.md` to ground yourself in the
   target syntax.
3. If the source is incomplete or ambiguous, also skim
   `ai/few-shot/05-ambiguous-source.md` and use `#` comments to
   record any assumptions you have to make.
4. Generate the document, applying the seven-step procedure.
5. Run the self-check in §2 step 7 of the authoring guide.
6. **Validate with the reference parser.** Write the candidate to a
   temporary file (or directly to the target path if the user
   specified one) and run
   `node impl/dist/cli.js validate <path>`. If the build does not
   exist yet, run `npm --prefix impl install && npm --prefix impl run build`
   first. If the parser reports errors, fix them and re-validate.
   Do not return until the parser exits 0.

Output format:

- A single fenced code block with the `laneflow` language tag,
  containing the document.
- Above the code block, one short sentence describing what the
  diagram represents.
- Below the code block (optional, only if relevant), a short bullet
  list of assumptions you had to make. Match each bullet to the
  corresponding `# assumption: ...` comment in the document.

If the user pointed at a specific path (e.g. "save it to
`examples/foo.laneflow`"), write the file with the Write tool
**after** showing the content in chat.

---

## Review mode

The user provides an existing LaneFlow document (file path or pasted
content) and asks for problems and improvements.

Procedure:

1. Read the document.
2. Run the reference parser:
   `node impl/dist/cli.js validate <path>`. Capture its output. Each
   reported `LF***` code is a definitive syntax problem; report those
   first.
3. Read `ai/error-recovery.md` and use it as a checklist for problems
   the parser does not catch (semantic and stylistic issues).
4. Check, in this order:
   - **Syntax.** Header present? Section order correct? Lanes
     declared? Node ids unique? Flow endpoints valid?
   - **Semantics.** Every gateway branch reaches an end event? Any
     orphan or unreachable nodes? Cross-lane flows that make sense
     as messages?
   - **Style.** Aligned columns, labeled gateway branches, comments
     on assumptions, sensible lane order.

Output format:

A numbered list of findings. Each finding has:

- The affected line number(s) or section.
- A short statement of the problem.
- The concrete fix as a code snippet or before/after pair.

If you find no problems, say so explicitly and (optionally) suggest
one or two stylistic improvements.

If asked to apply the fixes (e.g. "fix them"), use the Edit tool to
update the file.

---

## Render mode

The user has an existing `.laneflow` file and wants an SVG or PNG.

Procedure:

1. Validate the document first with the parser:
   `node impl/dist/cli.js validate <path>`. Do not render an invalid
   document — fix the syntax issues first (drop into review mode if
   the user wants you to).
2. If the renderer build does not exist, run
   `npm --prefix impl-render install && npm --prefix impl-render run build`.
3. Render with the renderer CLI:
   `node impl-render/dist/cli.js render <path> -o <out>`.
   - Use `.svg` output by default. Only emit PNG if the user asked
     for an image embedded somewhere that cannot consume SVG.
   - Pass `--theme dark` only if the user asked for a dark
     diagram.
   - Pass `--direction TB|LR` only to override the document's
     direction at the user's request.
4. Report the output path. If the user has not specified one, write
   the file next to the source with a matching basename (e.g.
   `diagram.laneflow` → `diagram.svg`).

Do not attempt to render documents that the parser rejects. The
renderer assumes a valid `Document` and will produce garbage or
throw on broken input.

---

## What to avoid

- Do not invent syntax that is not in `SPEC.md`. Common inventions
  that are **wrong**: `flowchart`, `subgraph`, `participant`, pipe
  labels `|label|`, dashed arrows `..>`, parallel gateway `<<text>>`.
- Do not silently invent process steps that have no basis in the
  source. Use `#` comments to record any guesses.
- Do not put lanes before the header or nodes before lanes — the
  section order is fixed.
- Do not classify arrows manually as sequence or message flow. The
  parser does that; you always emit `-->`.
