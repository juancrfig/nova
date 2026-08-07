# AGENTS.md — Dashboard

The **pipes room** of the Nova harness: observes and controls, per API call, what the harness sends
to its model provider, and renders it live with elegant, minimal visuals.

Read the repo-root `AGENTS.md` and `CONTEXT.md` (Nova vocabulary) and this room's `CONTEXT.md`
(Dashboard vocabulary: payload, context, injectable, seam, capture log, render surface) before
working here.

## Structure (two decoupled halves, joined by the capture log)

- **Capture half** — a pi extension that hooks the provider/context seams and writes one record per
  payload to the capture log. Applies the opinionated decision layer live.
- **Render half** — a webapp (the render surface) that tails the capture log and renders each record.
  A pure reader; replaceable without touching capture.

See `docs/adr/0002-capture-log-is-the-decoupled-contract.md` — the two halves only communicate
through the capture log.

## Agent conventions

- **Issue tracker**: local markdown under `.scratch/<room-or-feature>/`. See
  `docs/agents/issue-tracker.md`.
- **Triage labels**: canonical role labels (`ready-for-agent`, `needs-triage`, …). See
  `docs/agents/triage-labels.md`.
- **Domain docs**: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Conventions

- Use the glossary vocabulary from `CONTEXT.md` (`payload`, `context`, `injectable`, `seam`,
  `capture log`, `render surface`).
- The capture half is a pi extension; the render half is a webapp. Do not let one import the other.
- Flag any work that would require forking pi or touching the pi source directly.
