# Few-shot 05 — Ambiguous source description

**Pattern:** A natural-language description that leaves gaps or
ambiguities.
**Teaches:** Making explicit assumptions, documenting them with `#`
comments, and resisting the urge to silently invent steps.

---

## Input

> When an expense report is submitted, it should be reviewed and
> handled accordingly. High-value reports go through additional
> checks. The process ends once the report is resolved.

This description is vague in several ways:

- Who submits the report?
- Who reviews it?
- What does "handled accordingly" mean?
- What is the threshold for "high-value"?
- What are the "additional checks"?
- What does "resolved" mean — approved? paid? rejected?

## Output

```laneflow
laneflow v0.1

# assumption: the report is submitted by an employee (external trigger,
# not modeled as a lane); Finance owns the review and approval process.
# assumption: the high-value threshold is unspecified; using a placeholder.
# assumption: "resolved" means either approved (and queued for payment)
# or rejected with notice to the submitter.

lane Finance

Finance: start      (Expense report submitted)
Finance: review     [Review report]
Finance: high_value <High value?>
Finance: extra      [Run additional checks]   # source: unspecified what these are
Finance: decide     <Approve?>
Finance: approve    [Approve for payment]
Finance: reject     [Notify submitter of rejection]
Finance: done       ((Report resolved))

start --> review --> high_value
high_value -- yes --> extra --> decide
high_value -- no  --> decide
decide -- yes --> approve --> done
decide -- no  --> reject --> done
```

## Notes

- Every assumption that filled a gap in the source is recorded as a
  `#` comment at the top of the document. This makes it easy for the
  user to spot the guesses and correct them.
- An inline comment on the `extra` task notes that the source did not
  describe what the additional checks are. The placeholder task lets
  the diagram flow without inventing fictional steps.
- Both branches of `high_value` converge at the same `decide`
  gateway. This is correct: low-value reports go straight to the
  approval decision, while high-value reports first pass through the
  extra-checks step. Both then enter the same approval flow.
- A single lane was used. The source mentioned no roles, so adding
  Warehouse, HR, or Submitter lanes would be unjustified invention.
  If the user clarifies that, e.g., Procurement runs the additional
  checks, the diagram would gain a second lane and the relevant edges
  would become message flows automatically.

### What this example deliberately does **not** do

- It does not invent a specific currency threshold ("over 1000 EUR").
- It does not invent who submits the report (Sales? HR? Engineering?).
- It does not add an audit trail, escalation paths, or notifications
  that the source did not mention.

A faithful diagram with marked assumptions is more useful to the user
than a polished one that contains fabricated details.
