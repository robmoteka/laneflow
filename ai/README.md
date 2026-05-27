# AI Authoring Materials

This directory contains everything an LLM-based assistant needs to
generate and review LaneFlow documents reliably. It is consumed by:

- The Claude Code skill at `.claude/skills/laneflow/SKILL.md`
- Any application embedding Claude (or another frontier model) that
  wants to produce LaneFlow output
- Humans who want to understand how LaneFlow should be written

The normative source for the language itself is always `SPEC.md`. The
files here are guidance, not specification.

## What is where

| File | Purpose |
|------|---------|
| `AUTHORING_GUIDE.md` | The long-form guide. Mental model, seven-step generation procedure, style rules, mapping table from natural language to LaneFlow. Read this first if you have time. |
| `SYSTEM_PROMPT.md` | A condensed, drop-in system prompt for production use (~350 words). Self-contained. |
| `error-recovery.md` | Catalog of the 14 most common mistakes when generating LaneFlow, with before/after examples. |
| `few-shot/` | Five worked examples (Input → Output → Notes) covering the common generation and review patterns. See `few-shot/README.md` for which to use when. |

## Recommended usage patterns

**For a production application** (e.g. "convert this SOP to a process
diagram"):

1. Cache `SYSTEM_PROMPT.md` as the system prompt.
2. Cache 2–3 few-shot files appropriate to your inputs (commonly
   `01 + 02 + 03`).
3. Send the user's process description as the user turn.

**For a Claude Code workflow** (interactive editing of `.laneflow`
files in a repository):

- Use the skill at `.claude/skills/laneflow/`. It points the assistant
  at this directory automatically.

**For prompt engineering experiments:**

- Start with `AUTHORING_GUIDE.md` and `error-recovery.md` to understand
  the failure modes, then design your prompt accordingly.

## Keeping these files in sync with the spec

If a change to `SPEC.md` affects how documents should be authored, the
PR that changes the spec must also update at least:

- The hard rules in `SYSTEM_PROMPT.md`
- Any newly-introduced shape or section in `AUTHORING_GUIDE.md`
- The error catalog in `error-recovery.md` if the change creates new
  error modes
- Affected few-shot examples

The PR checklist in `.github/PULL_REQUEST_TEMPLATE.md` reminds
contributors to do this.
