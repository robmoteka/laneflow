# Contributing to LaneFlow

Thanks for your interest in LaneFlow! This document describes how to
propose changes to the standard, report issues with the specification,
and structure your commits.

By participating, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## Types of contributions

There are three things you can contribute right now:

1. **Spec bugs** — ambiguities, contradictions, missing error cases,
   typos, broken examples. Use the **Spec bug** issue template.
2. **RFC proposals** — additions, removals, or behavioral changes to the
   standard. Use the **RFC proposal** issue template.
3. **Examples** — `.laneflow` files that exercise corners of the syntax
   not yet covered in `examples/`. Open a pull request directly.

The reference parser, renderer, and AI authoring guide will come in
later phases (see the roadmap in `README.md`). Contributions targeted at
those phases are welcome as discussion in issues, but no implementation
PRs are accepted yet.

---

## The RFC process

LaneFlow's value comes from being small and stable. Every addition to
the standard is a long-term commitment, so changes go through a
lightweight but explicit process.

1. **Open an RFC proposal issue.** Use the template. Describe:
   - the problem you're trying to solve,
   - the proposed change,
   - at least one realistic example,
   - which of the v0.1 design principles it preserves or breaks,
   - what you considered and rejected.
2. **Discussion.** Maintainers and the community discuss in the issue.
   Expect questions about whether the change is necessary, whether it
   fits the "one way to write it" rule, and whether it should live in
   v0.1 or a later major version.
3. **Acceptance.** A maintainer marks the issue `rfc-accepted` and
   assigns it a target version.
4. **Pull request.** Submit a PR that updates `SPEC.md`,
   `docs/grammar.ebnf`, `CHANGELOG.md`, and adds or updates examples.
   Link the RFC issue.
5. **Merge.** The PR is merged once review converges. The change ships
   in the target version.

RFCs that touch the **non-goals** list in `SPEC.md` §7 face a higher
bar — those exclusions are deliberate.

### When you do not need an RFC

- Editorial fixes: typos, grammar, broken links, clearer wording that
  does not change meaning.
- New examples that conform to the existing spec.
- Tooling-only changes (issue templates, CI config, etc.).

For these, just open a PR.

---

## Reporting a spec bug

A "spec bug" is anything that makes the specification:

- **Ambiguous** — two parsers could reasonably produce different results
  from the same valid-looking document.
- **Contradictory** — two sections of the spec disagree.
- **Incomplete** — a real input is neither clearly accepted nor clearly
  rejected.

Open an issue with the **Spec bug** template and include the smallest
`.laneflow` snippet that reproduces the problem.

---

## Pull requests

- Branch from `main`.
- Keep PRs focused. One RFC = one PR. One example = one PR.
- Update `SPEC.md`, `docs/grammar.ebnf`, and `CHANGELOG.md` together
  when changing the standard.
- Cross-link the RFC issue in the PR description.

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/)
with a small set of types:

| Type       | Use for                                                   |
|------------|-----------------------------------------------------------|
| `spec`     | Normative changes to `SPEC.md` or `docs/grammar.ebnf`     |
| `docs`     | Non-normative documentation (`README.md`, guides)         |
| `examples` | Anything under `examples/`                                |
| `meta`     | Repository metadata (`.github/`, `LICENSE`, templates)    |
| `chore`    | Everything else                                           |

Examples:

```
spec: tighten label-text definition for shape brackets
docs: clarify before/after comparison in README
examples: add multi-lane process with parallel branches
meta: add RFC issue template
```

For breaking changes to the specification, add a `!` after the type and
explain the migration in the body and in `CHANGELOG.md`:

```
spec!: require version suffix in header
```

---

## Versioning

LaneFlow uses semantic-ish versioning **for the specification**:

- **Major** (`v1.0`, `v2.0`) — breaking syntactic or semantic change.
- **Minor** (`v0.2`, `v1.1`) — new syntax that does not invalidate prior
  conforming documents.
- **Patch** — editorial only; the version number does not bump.

While we are pre-1.0, minor versions MAY introduce breaking changes,
but each such change MUST be called out in `CHANGELOG.md`.

---

## Questions

If you're not sure whether your idea is a bug, an RFC, or out of scope,
open an RFC proposal issue and say so up front. We'd rather have the
conversation than miss the contribution.
