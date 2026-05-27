# LaneFlow Specification — v0.1 (Draft)

Status: **Draft**. Subject to change until v0.1 is tagged `final`.
License: this document is licensed under **CC BY 4.0** (see `LICENSE`).

LaneFlow is a lightweight, text-based notation for process diagrams with
**lanes** (swimlanes). It is intentionally a narrow subset — roughly 80% of
the practical value of BPMN-style swimlane diagrams at roughly 20% of the
complexity. The notation is designed to be:

1. Diff-friendly and human-readable.
2. Regular and unambiguous, so that LLMs can generate it reliably.
3. Trivially parseable (line-oriented, fixed section order).

This document specifies the syntax and parsing rules of LaneFlow v0.1.
Rendering is out of scope — any conforming renderer may choose its own
visual style as long as it preserves the semantics defined here.

---

## 1. Document structure

A LaneFlow document is a UTF-8 text file, conventionally with the extension
`.laneflow`. It consists of the following sections, in **this fixed order**:

```
1. Header              (required, exactly one line)
2. Direction           (optional, one line)
3. Lane section        (required, one or more lane declarations)
4. Node section        (required, one or more node declarations)
5. Flow section        (required, one or more flow lines)
```

Sections are separated by one or more blank lines. Order is fixed in v0.1
to keep generation by LLMs deterministic. A parser MUST report an error
if sections appear out of order.

A minimal valid document:

```laneflow
laneflow v0.1

lane Sales

Sales: start (Start)
Sales: done  ((Done))

start --> done
```

---

## 2. Lexical rules

### 2.1 Encoding and line endings

- Files MUST be UTF-8.
- Line endings MAY be `\n` (LF) or `\r\n` (CRLF). Parsers MUST accept both.

### 2.2 Whitespace

- Horizontal whitespace (` ` and `\t`) between tokens is insignificant,
  except inside shape brackets and quoted labels, where it is preserved.
- Leading and trailing whitespace on a line is ignored.
- Indentation has no semantic meaning. Authors MAY align declarations
  for readability.

### 2.3 Comments

- A `#` character starts a line comment that runs to the end of the line.
- Comments MAY appear on their own line or at the end of any line.
- `#` inside a shape's label text or a quoted label is **not** a comment.

```laneflow
# This is a comment
Sales: check [Check availability]   # trailing comment
```

### 2.4 Identifiers

- `identifier = letter , { letter | digit | "_" }`
- Identifiers are **case-sensitive**.
- Identifiers are used for both lane ids and node ids. They live in
  **separate namespaces** — a lane and a node MAY share the same id, but
  this is discouraged.

### 2.5 Labels

LaneFlow has two kinds of label text:

- **Quoted labels** appear only in lane declarations and use double
  quotes: `"Order Fulfillment"`. They MAY contain any character except
  `"` and newline. There is no escape mechanism in v0.1.
- **Shape labels** appear inside `()`, `(())`, `[]`, or `<>` and run
  until the matching closing bracket. They MAY contain any character
  except the closing bracket of their shape and newline. There is no
  escape mechanism in v0.1; if a label needs to contain a closing
  bracket, this is **out of scope for v0.1**.

---

## 3. Sections

### 3.1 Header

```
header = "laneflow" , [ ws , "v" , version ] ;
```

- The first non-blank, non-comment line MUST be the header.
- The version suffix is optional in v0.1. If present, it MUST match the
  parser's supported version. Parsers SHOULD accept `laneflow` without a
  version and assume the latest supported.
- Future versions MAY make the version suffix required.

Examples:

```
laneflow
laneflow v0.1
```

### 3.2 Direction

```
direction = "direction" , ws , ( "TB" | "LR" ) ;
```

- Optional. If omitted, the renderer's default applies.
- `TB` = top-to-bottom, `LR` = left-to-right.
- Only `TB` and `LR` are defined in v0.1.

### 3.3 Lane section

```
lane-section = lane-decl , { newline , lane-decl } ;
lane-decl    = "lane" , ws , identifier , [ ws , quoted-label ] ;
```

- One or more lane declarations.
- **Declaration order is the visual order** of lanes in the rendered
  diagram (top-to-bottom for `direction TB`, left-to-right for `LR`).
- A lane id MUST be unique within the document.
- If the optional quoted label is omitted, the renderer SHOULD display
  the lane id as the lane title.

Examples:

```
lane Sales      "Sales Department"
lane Warehouse
lane Finance    "Finance & Billing"
```

### 3.4 Node section

```
node-decl = identifier , ":" , ws , identifier , ws , shape ;
shape     = event | end-event | task | gateway ;
```

| Shape       | Syntax       | Meaning                                  |
|-------------|--------------|------------------------------------------|
| `event`     | `(text)`     | Start event or intermediate event        |
| `end-event` | `((text))`   | End event                                |
| `task`      | `[text]`     | Activity / task / step                   |
| `gateway`   | `<text>`     | Decision gateway (exclusive in v0.1)     |

Rules:

- The lane id before the colon MUST be one of the declared lanes.
- The node id between the colon and the shape MUST be **unique** within
  the document (across all lanes).
- Each node is declared **exactly once**. The flow section references
  nodes by id only.
- A document SHOULD contain at least one `event` (start) and at least
  one `end-event`, but parsers MUST NOT enforce this in v0.1 — it is a
  modeling concern, not a syntactic one.

Examples:

```
Sales:     check_avail [Check availability]
Sales:     in_stock    <In stock?>
Warehouse: pack_order  [Pack order]
Finance:   invoice     [Issue invoice]
Sales:     start       (Order received)
Sales:     done        ((Order closed))
```

### 3.5 Flow section

```
flow  = identifier , arrow , identifier , { arrow , identifier } ;
arrow = ws , "-->" , ws
      | ws , "--" , ws , label-text , ws , "-->" , ws ;
```

- A flow connects two or more nodes by id.
- The shorthand `a --> b --> c` is exactly equivalent to two flows
  `a --> b` and `b --> c`. Each individual arrow may carry its own
  label using `-- label -->`.
- Both endpoints MUST refer to declared nodes.
- An arrow label is plain text. Trailing whitespace before `-->` is
  trimmed. The label MAY NOT contain a newline or the substring `-->`.

Examples:

```
start --> check_avail
check_avail --> in_stock
in_stock -- yes --> pack_order
in_stock -- no  --> done
pack_order --> invoice --> done
```

#### Sequence flow vs. message flow

LaneFlow distinguishes two kinds of flow, but the author does **not**
declare which is which. The parser derives it from the lanes of the
endpoints:

- If `lane(source) == lane(target)` → **sequence flow** (intra-lane).
- If `lane(source) != lane(target)` → **message flow** (cross-lane).

Renderers SHOULD visually distinguish the two (e.g. solid vs. dashed
line). This rule is a hard semantic guarantee of LaneFlow v0.1.

---

## 4. Parsing rules

A conforming parser:

1. Reads the document line by line.
2. Strips trailing comments and surrounding whitespace.
3. Skips blank lines (a blank line is also a section separator).
4. Validates that sections appear in the order defined in §1.
5. Builds three tables: lanes, nodes, flows.
6. Resolves every node-lane and flow-endpoint reference against those
   tables.
7. Computes the sequence/message classification for each flow (§3.5).

Parsers MUST be deterministic — a given input always yields the same
parse result and the same set of errors.

---

## 5. Error handling

Parsers MUST report errors with at minimum a line number, a short error
code, and a human-readable message. The error codes below are reserved
for v0.1 and SHOULD be used by conforming parsers so tooling can react
uniformly.

| Code      | When                                                          |
|-----------|---------------------------------------------------------------|
| `LF001`   | Missing or invalid header (`laneflow` line)                   |
| `LF002`   | Unsupported version in header                                 |
| `LF003`   | Sections out of order                                         |
| `LF004`   | Invalid `direction` value                                     |
| `LF010`   | Duplicate lane id                                             |
| `LF011`   | Malformed lane declaration                                    |
| `LF020`   | Unknown lane id in a node declaration                         |
| `LF021`   | Duplicate node id                                             |
| `LF022`   | Unrecognized shape syntax                                     |
| `LF023`   | Empty label inside a shape                                    |
| `LF030`   | Unknown node id in a flow                                     |
| `LF031`   | Malformed arrow                                               |
| `LF032`   | Arrow label contains forbidden characters                     |
| `LF999`   | Unexpected token / general syntax error                       |

Parsers SHOULD continue parsing after recoverable errors (e.g. an
unknown node id) and emit all errors found, so authors and LLMs can fix
multiple issues in one pass.

---

## 6. Examples

### 6.1 Linear process, single lane

```laneflow
laneflow v0.1

lane Sales "Sales"

Sales: start    (Order received)
Sales: check    [Check availability]
Sales: confirm  [Confirm order]
Sales: done     ((Order closed))

start --> check --> confirm --> done
```

Expected render: four nodes in a single Sales lane, connected by solid
arrows (all flows are intra-lane sequence flows).

### 6.2 Decision gateway

```laneflow
laneflow v0.1
direction LR

lane Sales

Sales: start     (Order received)
Sales: check     [Check availability]
Sales: in_stock  <In stock?>
Sales: confirm   [Confirm order]
Sales: reject    [Reject order]
Sales: done      ((Order closed))

start --> check --> in_stock
in_stock -- yes --> confirm --> done
in_stock -- no  --> reject  --> done
```

Expected render: linear flow into a diamond gateway with two labeled
branches that both terminate at the end event. All sequence flows.

### 6.3 Multi-lane process with message flow

```laneflow
laneflow v0.1

lane Sales      "Sales"
lane Warehouse  "Warehouse"
lane Finance    "Finance"

Sales:     start        (Order received)
Sales:     check        [Check availability]
Sales:     in_stock     <In stock?>
Sales:     reject       [Reject order]
Warehouse: pack_order   [Pack order]
Warehouse: ship         [Ship to customer]
Finance:   invoice      [Issue invoice]
Finance:   done         ((Order closed))

start --> check --> in_stock
in_stock -- no  --> reject --> done
in_stock -- yes --> pack_order
pack_order --> ship
pack_order --> invoice
ship --> done
invoice --> done
```

Expected render: three horizontal lanes. Flows entirely inside `Sales`
or `Warehouse` are sequence flows (solid). The arrows
`in_stock --> pack_order`, `pack_order --> invoice`, `ship --> done`,
`reject --> done`, and `invoice --> done` cross lane boundaries and are
therefore message flows (dashed).

---

## 7. Non-goals / future work

The following are **explicitly out of scope** for v0.1. They MAY be
added in a future version through the RFC process described in
`CONTRIBUTING.md`.

- Typed events: timer, message, error, signal, escalation, etc.
- Gateway types other than exclusive: parallel (`AND`), inclusive
  (`OR`), event-based, complex.
- Subprocesses, call activities, expanded/collapsed pools.
- Boundary events attached to tasks.
- Data objects, data stores, annotations.
- Pools (multiple processes / participants per document).
- Escape sequences inside labels.
- Styling, theming, or layout hints beyond `direction`.
- Lazy lane declaration (a lane springing into existence on first use).
- Multiple arrow styles for sequence vs. message flow at the syntax
  level (this is intentionally derived, not declared).
- Importing / including other LaneFlow files.

---

## 8. Conformance

A document is a **conforming LaneFlow v0.1 document** if and only if it
parses without errors against the grammar in `docs/grammar.ebnf` and
satisfies all the additional rules in this specification.

A tool is a **conforming LaneFlow v0.1 parser** if it accepts every
conforming document, rejects every non-conforming document with at least
one error using the codes from §5, and exposes the lane/node/flow
tables described in §4.
