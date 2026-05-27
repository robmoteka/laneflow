# Few-shot examples

Five worked examples that demonstrate how to turn natural-language
process descriptions into LaneFlow documents. They are intended as
in-context teaching material for LLM-based assistants: include one or
more of them in the prompt when you ask a model to generate or review
LaneFlow.

| File | Pattern | Use when |
|------|---------|----------|
| `01-linear-from-text.md` | Single actor, sequential steps | Source describes one role doing things in order |
| `02-gateway-from-text.md` | Decision gateway with merging paths | Source contains "if/else" or thresholds |
| `03-multilane-from-text.md` | Multiple actors with hand-offs | Source mentions distinct departments or systems collaborating |
| `04-fix-malformed.md` | Repairing broken LaneFlow | User pastes invalid LaneFlow and asks for help |
| `05-ambiguous-source.md` | Source has gaps; document assumptions | Source is incomplete or vague |

Each file uses the same structure:

```
## Input        — the source description
## Output       — the LaneFlow document
## Notes        — why the output looks the way it does
```

## How to use these in a prompt

For best results when prompting an LLM to generate LaneFlow:

1. Start with the system prompt from `ai/SYSTEM_PROMPT.md`.
2. Append one or more relevant few-shot files, each as a separate
   block (User: input / Assistant: output / Notes can be omitted in
   the runtime prompt or included as the explanation of the assistant
   reply).
3. Then provide the new process description as the actual user turn.

A typical 3-shot prompt for general use is `01 + 02 + 03`. Add `04` if
your application includes a "fix this LaneFlow" feature. Add `05` if
your inputs are likely to be incomplete.

## Adding your own

If you find a class of input that the existing examples do not cover
well, contribute a new few-shot file via the RFC process described in
`CONTRIBUTING.md`. Follow the same structure (Input / Output / Notes)
and explain in the Notes section *why* this example teaches something
the others do not.
