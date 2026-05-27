# LaneFlow Examples

Each file in this directory is a self-contained `.laneflow` document
that demonstrates a specific set of language features. Read them in
order — each example builds on the previous one.

| File | What it teaches |
|------|----------------|
| `01-linear-process.laneflow` | Header, lane declaration, all four shape types, plain arrows. A single lane with no branching. |
| `02-gateway-decision.laneflow` | Decision gateway (`<text>`), labeled arrows (`-- yes -->`), two paths merging at a single end event. Uses `direction LR`. |
| `03-multilane-message-flow.laneflow` | Three lanes with display labels. Shows how the parser automatically classifies cross-lane arrows as message flow and intra-lane arrows as sequence flow. |

All examples use English labels and cover the entire v0.1 feature set.
They are also used as the normative examples in `SPEC.md` §6.
