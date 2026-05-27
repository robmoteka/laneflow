# Few-shot 02 — Decision gateway from natural language

**Pattern:** A process with a conditional branch.
**Teaches:** Recognising "if/else" in prose, gateway shape `<...>`,
labeled arrows, multiple branches converging at a single end event.

---

## Input

> A customer submits a refund request. Customer Service reviews the
> claim. If the amount is under 100 EUR, the agent approves it
> immediately and issues the refund. If it is 100 EUR or more, the
> claim is escalated to a supervisor for manual review; the supervisor
> either approves and issues the refund, or rejects it. Either way the
> case is closed.

## Output

```laneflow
laneflow v0.1

lane CS "Customer Service"

CS: start       (Refund request received)
CS: review      [Review claim]
CS: under_100   <Amount under 100 EUR?>
CS: approve     [Approve refund]
CS: escalate    [Escalate to supervisor]
CS: sup_review  [Supervisor reviews claim]
CS: sup_decide  <Supervisor approves?>
CS: reject      [Reject refund]
CS: refund      [Issue refund]
CS: done        ((Case closed))

start --> review --> under_100
under_100 -- yes --> approve --> refund
under_100 -- no  --> escalate --> sup_review --> sup_decide
sup_decide -- yes --> refund
sup_decide -- no  --> reject --> done
refund --> done
```

## Notes

- Two gateways are needed: one for the amount threshold, one for the
  supervisor's verdict. Both phrased as questions.
- "Either way the case is closed" — both branches eventually reach
  `done`. The approved-refund path goes through `refund` first; the
  rejected path goes directly to `done` after `reject`.
- `refund` is declared once and referenced twice in the flow section.
  This is a normal pattern when two branches converge before the end
  event.
- The supervisor is performing the work, but the source treats them
  as part of Customer Service ("escalated to a supervisor"). Without
  more context the whole process stays in one lane. If the source
  said "the case is transferred to the Quality team", the supervisor
  steps would move to a separate lane.
