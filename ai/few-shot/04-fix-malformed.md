# Few-shot 04 — Fixing a malformed LaneFlow document

**Pattern:** A document with multiple common errors that need
correcting.
**Teaches:** Reading LaneFlow critically, applying the error-recovery
catalog, preserving authorial intent while fixing syntax.

---

## Input

The user pasted this document and asked you to fix it:

```laneflow
flowchart TB

lane Sales
lane Warehouse

Sales:     start [Order received]
Sales:     check [Check availability]
Sales:     decide [In stock?]
Warehouse: pack  [Pack order]
Sales:     done  [Order closed]

[Check availability] --> [In stock?]
decide ..> pack
decide --> done
pack --> done
```

## Output

```laneflow
laneflow v0.1

lane Sales
lane Warehouse

Sales:     start   (Order received)
Sales:     check   [Check availability]
Sales:     decide  <In stock?>
Warehouse: pack    [Pack order]
Sales:     done    ((Order closed))

start --> check --> decide
decide -- yes --> pack --> done
decide -- no  --> done
```

## Notes

The original had six distinct problems. Each was fixed as follows:

1. **`flowchart TB` is Mermaid syntax, not LaneFlow** (E10). Replaced
   with the required header `laneflow v0.1`. `TB` is the default
   direction, so an explicit `direction TB` line is not needed.

2. **`[Order received]` should be a start event** (E5). Changed
   `[Order received]` to `(Order received)`. Start triggers are
   events, not tasks.

3. **`[In stock?]` should be a gateway** (E5). Changed to
   `<In stock?>`. A decision phrased as a question is always a
   gateway.

4. **`[Order closed]` should be an end event** (E11/E5). Changed to
   `((Order closed))`. The process terminates here.

5. **Flows used labels instead of ids** (E4). The line
   `[Check availability] --> [In stock?]` was rewritten using node
   ids: `check --> decide`. Endpoints are always ids.

6. **`..>` is not a LaneFlow arrow** (E6). Replaced with `-->`. The
   parser will classify `decide --> pack` as a message flow
   automatically because the two endpoints are in different lanes.

7. **Unlabeled gateway branches** (E9). Added `-- yes -->` and
   `-- no -->` labels so the two outgoing arrows from `decide` are
   meaningful.

The flow `start --> check --> decide` was also chained on a single
line because it is a straight unbranching path — purely a style
improvement.
