# Common LaneFlow Mistakes and How to Fix Them

This is a catalog of frequent mistakes that AI assistants (and humans)
make when producing LaneFlow documents. Each entry includes a short
example of the bug, the reason it is wrong, and the correct form.

Use this as a checklist when generating LaneFlow, and as a reference
when reviewing or fixing existing documents.

---

## E1 — Missing header

**Symptom:**

```laneflow
lane Sales
Sales: start (Order received)
start --> ...
```

**Why it is wrong:** The first non-blank, non-comment line MUST be the
`laneflow` header. Error code: `LF001`.

**Fix:**

```laneflow
laneflow v0.1

lane Sales
Sales: start (Order received)
start --> ...
```

---

## E2 — Lazy lane (used but not declared)

**Symptom:**

```laneflow
laneflow v0.1

Sales: check [Check availability]
```

**Why it is wrong:** LaneFlow has no lazy-lane mode. Every lane must
appear in a `lane` declaration before being used. Error code: `LF020`.

**Fix:**

```laneflow
laneflow v0.1

lane Sales

Sales: check [Check availability]
```

---

## E3 — Sections out of order

**Symptom:**

```laneflow
laneflow v0.1

Sales: start (Order received)

lane Sales

start --> ...
```

**Why it is wrong:** Section order is fixed: header → (direction) →
lanes → nodes → flows. The lane block must come before the node block.
Error code: `LF003`.

**Fix:** Reorder.

```laneflow
laneflow v0.1

lane Sales

Sales: start (Order received)

start --> ...
```

---

## E4 — Using a label instead of an id in a flow

**Symptom:**

```laneflow
Sales: check [Check availability]
Sales: done  ((Done))

[Check availability] --> ((Done))
```

**Why it is wrong:** Flow endpoints are node ids, not labels or shapes.
Error code: `LF030` (and likely `LF031`).

**Fix:**

```laneflow
Sales: check [Check availability]
Sales: done  ((Done))

check --> done
```

---

## E5 — Confusing shapes (gateway vs. task)

**Symptom:**

```laneflow
Sales: in_stock [In stock?]
in_stock -- yes --> ...
in_stock -- no  --> ...
```

**Why it is wrong:** `[...]` is a task — an activity that takes time
and produces work. A question with branches is a gateway and must use
`<...>`.

**Fix:**

```laneflow
Sales: in_stock <In stock?>
in_stock -- yes --> ...
in_stock -- no  --> ...
```

Mirror image: do not use `<>` for an activity that is not a decision.

---

## E6 — Inventing a message-flow arrow

**Symptom:**

```laneflow
sales_check ..> warehouse_pack
sales_check ==> warehouse_pack
sales_check ~> warehouse_pack
```

**Why it is wrong:** There is exactly one arrow in LaneFlow: `-->`. The
parser classifies sequence vs. message flow from the lanes of the
endpoints. Authors (and LLMs) must not pick the type.

**Fix:**

```laneflow
sales_check --> warehouse_pack
```

---

## E7 — Duplicate node id

**Symptom:**

```laneflow
Sales:     check [Check availability]
Warehouse: check [Check warehouse capacity]

check --> ...
```

**Why it is wrong:** Node ids are unique across the whole document, not
per lane. The flow line is ambiguous. Error code: `LF021`.

**Fix:** Use distinct ids.

```laneflow
Sales:     check_sales [Check availability]
Warehouse: check_wh    [Check warehouse capacity]

check_sales --> check_wh
```

---

## E8 — Declaring the same node twice

**Symptom:**

```laneflow
Sales: check [Check availability]
Sales: check [Check availability]
```

**Why it is wrong:** Each node is declared exactly once. If you need to
refer to it later, use its id in the flow section. Error code: `LF021`.

**Fix:** Remove the duplicate declaration.

---

## E9 — Unlabeled gateway branches

**Symptom:**

```laneflow
Sales: decide <Approved?>

decide --> confirm
decide --> reject
```

**Why it is wrong:** The two branches are syntactically valid but
meaningless to a reader: which one is `yes`? This is a style bug, not a
syntax error, but it makes the diagram useless.

**Fix:**

```laneflow
Sales: decide <Approved?>

decide -- yes --> confirm
decide -- no  --> reject
```

---

## E10 — Invented keywords from other notations

**Symptom:**

```laneflow
flowchart TB
participant Sales
subgraph Warehouse
  pack[Pack order]
end
note over Sales: Manual step
```

**Why it is wrong:** None of `flowchart`, `participant`, `subgraph`,
`note`, or `end` are LaneFlow keywords. They come from Mermaid or
PlantUML.

**Fix:** Use LaneFlow syntax: a `laneflow` header, `lane` declarations,
shape-based nodes, and `-->` flows. See `ai/few-shot/` for canonical
examples.

---

## E11 — Missing end event

**Symptom:**

```laneflow
laneflow v0.1

lane Sales

Sales: start  (Order received)
Sales: check  [Check availability]

start --> check
```

**Why it is wrong:** The process has no terminal node. This is not a
syntax error (the spec does not enforce it in v0.1) but it is a
modeling bug — the diagram does not actually describe a complete
process.

**Fix:** Add an end event.

```laneflow
Sales: start  (Order received)
Sales: check  [Check availability]
Sales: done   ((Done))

start --> check --> done
```

---

## E12 — Customer or external system modeled as a lane

**Symptom:**

```laneflow
lane Customer
lane Sales

Customer:  submit (Submits order)
Sales:     check  [Check availability]

submit --> check
```

**Why it is wrong:** External actors that only **trigger** the process
should appear as a start event in the lane that receives the trigger.
Modeling them as a lane usually adds noise without information,
because they have no internal steps.

**Fix:** Collapse the trigger into an event in the relevant lane.

```laneflow
lane Sales

Sales: start  (Order received)
Sales: check  [Check availability]

start --> check
```

(If the external actor has meaningful internal steps — e.g. an
external system that does its own multi-step processing visible to
the model — then a separate lane is appropriate.)

---

## E13 — Quoted label confused with shape label

**Symptom:**

```laneflow
lane Sales [Sales Department]
```

**Why it is wrong:** The optional lane display name uses **double
quotes**, not shape brackets. Brackets are only for node shapes.

**Fix:**

```laneflow
lane Sales "Sales Department"
```

---

## E14 — Comment inside a shape

**Symptom:**

```laneflow
Sales: check [Check availability # TODO: clarify scope]
```

**Why it is wrong:** Inside a shape, `#` is part of the label text. The
parser will see a label that ends at the closing bracket and includes
the `#` and everything after it. This is technically valid syntax but
almost never what you want.

**Fix:** Put the comment on its own line or at the end of the line,
outside the brackets.

```laneflow
# TODO: clarify scope of availability check
Sales: check [Check availability]
```

---

## Quick checklist

When you have finished generating a LaneFlow document, run through this
list before returning it:

- [ ] First line is `laneflow` (with optional version).
- [ ] Lanes are declared, in the order you want them displayed.
- [ ] Every lane used in node declarations was declared.
- [ ] Every node id is unique and used somewhere in the flows.
- [ ] Every flow endpoint references an id that exists.
- [ ] Every gateway branch is labeled.
- [ ] There is at least one start event and one end event.
- [ ] No invented syntax from Mermaid, BPMN, or PlantUML.
- [ ] Sections appear in the order: header, direction, lanes, nodes,
      flows.
