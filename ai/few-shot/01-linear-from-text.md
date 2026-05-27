# Few-shot 01 — Linear process from natural language

**Pattern:** A process description with one actor and no branching.
**Teaches:** Basic document skeleton, single lane, four shape types,
plain arrows.

---

## Input

> A new employee joins the company. HR receives the signed contract,
> creates the employee record in the HR system, requests a laptop from
> IT, schedules an onboarding meeting, and closes the onboarding ticket
> once everything is ready.

## Output

```laneflow
laneflow v0.1

lane HR "Human Resources"

HR: start     (Signed contract received)
HR: create    [Create employee record]
HR: request   [Request laptop from IT]
HR: schedule  [Schedule onboarding meeting]
HR: done      ((Onboarding ticket closed))

start --> create --> request --> schedule --> done
```

## Notes

- One actor in the source description (HR) — one lane in the output.
- "A new employee joins" is the trigger; the process starts when HR
  receives the contract, so the start event lives in HR.
- "Requests a laptop from IT" is described from HR's perspective —
  this is a task HR performs, not a cross-lane message. IT is not
  modeled as a lane because the source does not describe any IT
  steps.
- All flows are intra-lane, so they will render as solid (sequence)
  arrows.
