# LaneFlow Authoring Guide for AI Assistants

This guide explains how to generate and review LaneFlow documents
reliably. It is written for LLM-based assistants (Claude, GPT-class
models) but is equally useful for humans authoring `.laneflow` files by
hand.

If you are an assistant about to generate a LaneFlow document, read this
guide and the few-shot examples in `ai/few-shot/` before producing
output.

The normative source is always `SPEC.md`. Where this guide and the spec
disagree, the spec wins.

---

## 1. The mental model

A LaneFlow document is **three lists in a fixed order**:

1. The list of **lanes** (who participates).
2. The list of **nodes** (what happens, in which lane).
3. The list of **flows** (how the nodes connect).

Plus a one-line header at the top and an optional `direction` line.

Generate the document in that order. Never go back to edit an earlier
section after you have started the next one — the spec requires the
order to be exactly as above and a parser will reject your output if it
is not.

---

## 2. The seven-step generation procedure

Follow this procedure every time you turn a natural-language description
into a LaneFlow document. Do steps 1–4 in your head (or in a scratch
area); produce the file content in step 5.

### Step 1 — Identify participants

Read the source description and list every distinct actor, role,
department, or system that **performs** an action. Customers and other
external actors who only **trigger** the process (e.g. "the customer
submits an order") usually do **not** become lanes — they appear as a
start event in the lane of whoever receives the trigger.

If the source mentions only one actor, you will have one lane. That is
fine.

### Step 2 — Identify steps

For each sentence in the source, ask: *is this an event, a task, or a
gateway?*

- **Event** `(text)` — something that happens at a point in time.
  Triggers and intermediate signals. Examples: "Order received",
  "Payment confirmed", "Timer expires".
- **End event** `((text))` — the process ends here. Examples: "Order
  closed", "Application rejected".
- **Task** `[text]` — an activity that takes time and effort. Examples:
  "Check stock", "Send email", "Approve invoice". Use an imperative
  verb in the label when possible.
- **Gateway** `<text>` — a decision point. Always phrased as a question.
  Examples: "In stock?", "Amount > 1000?", "Approved?".

If you are unsure between event and task: tasks are things people *do*,
events are things that *happen*.

### Step 3 — Assign each step to a lane

Every node belongs to exactly one lane. Use the participant identified
in step 1 who is responsible for the action.

For gateways, the lane is the lane of whoever makes the decision —
usually the same as the task that precedes the gateway.

### Step 4 — Identify connections

For each step, ask: *what comes next?* Most steps have one successor.
Gateways have two or more (one per branch); label each branch with the
condition that selects it.

If the same step has multiple successors that are **not** branches of a
decision (e.g. "after packing, both ship and invoice happen"), that is
fine — emit two separate flow lines from the same source.

### Step 5 — Choose ids

Give every lane and every node a short identifier. Rules:

- Snake_case, lowercase. Examples: `check_stock`, `in_stock`, `done`.
- Short but descriptive. Aim for 1–3 words joined by underscores.
- Unique across the whole document for nodes; unique among lanes for
  lanes.
- Stable: if you regenerate the same process, use the same ids.

For lane ids, prefer simple PascalCase or single words: `Sales`,
`Warehouse`, `Finance`. The optional quoted label carries the
human-readable name.

### Step 6 — Emit the document

Produce the document in this exact order:

```
laneflow v0.1
[direction TB|LR]      ← optional, only if you have a preference

lane <Id> ["Display name"]
lane <Id> ["Display name"]
...

<LaneId>: <node_id> <shape>
<LaneId>: <node_id> <shape>
...

<src_id> --> <dst_id>
<src_id> -- label --> <dst_id>
<src_id> --> <dst_id> --> <dst2_id>
...
```

Separate the four blocks (header, lanes, nodes, flows) with one blank
line. Within a block, do not insert blank lines.

### Step 7 — Self-check

Before returning your answer, verify:

- [ ] First non-blank line is `laneflow` (with optional version).
- [ ] Every lane id used in a node declaration was declared with `lane`.
- [ ] Every node id used in a flow was declared in the node section.
- [ ] Every node id is declared exactly once.
- [ ] There is at least one start event `(text)` and at least one end
      event `((text))`.
- [ ] Every gateway has at least two outgoing arrows, and each is
      labeled (`-- yes -->`, `-- no -->`, etc.).
- [ ] No arrow uses a label as endpoint — only ids.

If any check fails, fix the document before returning it.

---

## 3. Style rules

These are not enforced by the parser but make documents readable and
diff-friendly. Follow them unless you have a specific reason not to.

- **Indent for alignment in the node section.** Make lane ids,
  node ids, and shapes line up visually. The example below is much
  easier to scan than the unaligned version.

  ```laneflow
  Sales:     start    (Order received)
  Sales:     check    [Check availability]
  Warehouse: pack     [Pack order]
  ```

- **One flow line per logical step.** Use chaining (`a --> b --> c`)
  only when the steps form an unbranching straight line that you are
  also reading as a single thought. Otherwise split into multiple
  lines.

- **Label the branches of every gateway.** Even when there are only two
  branches and the labels seem obvious, write `-- yes -->` and
  `-- no -->`. This is the only way a reader knows which branch
  represents which condition.

- **Use comments to record assumptions.** When the source description
  is ambiguous and you have to guess, write a `#` comment above the
  affected node or flow. This is critical and is covered in
  `ai/few-shot/05-ambiguous-source.md`.

- **Order matters visually.** Lanes are rendered in declaration order.
  Put the lane that handles the start event first. Put the lane that
  handles the most cross-cutting work in the middle if there are three
  or more lanes.

---

## 4. Mapping natural language to LaneFlow

Common phrases and how to render them:

| Source phrase                                  | LaneFlow element                         |
|------------------------------------------------|------------------------------------------|
| "X is received" / "Y arrives"                  | event `(X received)` — start             |
| "The customer / system sends X to <us>"        | event `(X received)` in our lane         |
| "We do X" / "Then Y does Z"                    | task `[X]` / `[Z]` in lane Y             |
| "If A, then B; otherwise C"                    | gateway `<A?>` with `yes` / `no` labels  |
| "When the amount exceeds 1000, escalate"       | gateway `<Amount > 1000?>`               |
| "The process ends" / "The case is closed"      | end event `((Closed))`                   |
| "Approval is required from finance"            | task in `Finance` lane, called from prev |
| "Meanwhile" / "in parallel"                    | multiple successors from the same node   |

When a sentence describes interaction *between* two participants ("Sales
asks Warehouse to pack the order"), model it as a flow from a step in
the first lane to a step in the second lane. The parser will classify
it as a message flow automatically — you do **not** declare it.

---

## 5. What to do when the source is incomplete

Real process descriptions are rarely complete. Handle missing pieces in
this order of preference:

1. **Ask** if you can. If the user is interactive, list the assumptions
   you would otherwise have to make and ask which one is correct.
2. **Make explicit assumptions.** When you cannot ask, pick the most
   reasonable interpretation and **mark it with a comment**:

   ```laneflow
   # assumption: rejected orders are not re-checked
   decide -- no --> reject --> done
   ```

3. **Document gaps.** If a whole branch is missing ("...and then it gets
   handled somehow"), emit a placeholder task with a comment and an
   end event:

   ```laneflow
   Sales: unclear  [Handle exception]  # source does not specify how
   ```

Never silently invent steps that have no basis in the source. A
faithful-but-incomplete diagram with comments is more useful than a
plausible-looking one that is wrong.

---

## 6. Reviewing existing LaneFlow

When asked to review a `.laneflow` document (find bugs, suggest
improvements), check the document against this list in order:

1. **Syntax.** Does it parse? Run through `docs/grammar.ebnf` mentally
   or use the error codes in `SPEC.md` §5 as a checklist:
   - Header present and correct.
   - Sections in the right order.
   - All lanes declared before use.
   - All node ids unique.
   - All flow endpoints reference declared nodes.

2. **Semantics.** Does the diagram correctly represent the intended
   process?
   - Every gateway branch reaches an end event (or merges back into a
     path that does).
   - No orphan nodes (declared but never used in a flow).
   - No unreachable nodes (no path from any start event).
   - Cross-lane flows make sense as messages (a system would actually
     send something).

3. **Style.** Aligned columns, labeled gateway branches, comments on
   assumptions, sensible lane order.

Report findings as a numbered list with the affected line and the fix.
Prefer suggesting concrete edits over abstract criticism.

---

## 7. What you should never do

- Never invent syntax that is not in `SPEC.md`. Examples of common
  inventions that are **wrong**: `[task] -->|label| [task]`,
  `flowchart TB`, `participant X`, `note over X`, parallel gateway
  `<<text>>`, `subgraph`. None of these are LaneFlow.
- Never use a label (the text inside brackets) as a flow endpoint.
  Endpoints are always node ids.
- Never use two different arrow styles for sequence vs. message flow.
  The parser derives the type; there is exactly one arrow: `-->`.
- Never skip the `lane` declaration block. A lane that is used but not
  declared is a parse error, not a feature.
- Never put sections in a different order. Header, then direction, then
  lanes, then nodes, then flows. Always.

For a longer list of mistakes and how to correct them, see
`ai/error-recovery.md`.
