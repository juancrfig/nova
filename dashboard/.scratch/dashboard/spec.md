Status: ready-for-agent

# Dashboard (the pipes room of Nova) — observe and control what pi sends to the provider

## Problem Statement

As the user is learning harness and context engineering, they can't see what the pi coding agent
actually injects and sends to the model provider. The conversation is visible, but the *assembled*
request — the system prompt, the injectable skills and templates, the tool schemas, and the whole
history as one serialized unit per API call — is a black box. They want a clear, real-time,
per-call view of every payload, and the ability to decide, for the parts under their control,
whether they go out or not, and to change that live during a session. Long term they fear their
customizations will be silently clobbered or broken by pi updates, so any solution must live in the
user-owned customization layer that survives updates.

## Solution

A **Dashboard** — the pipes room of the Nova harness — with two decoupled halves joined by a capture log:

1. **Capture layer** — a pi extension (in `~/.pi/agent/extensions/`) that hooks the provider seams.
   On every API call it captures the fully assembled payload to an append-only JSONL file, one
   record per call, tagged with a call id, model, timestamp, and token/cost info. It also applies an
   opinionated decision layer: rules that decide which injectables and messages are allowed to go
   out, re-read live so a rule edit takes effect on the next call.
2. **Render layer** — a small webapp that tails the capture log and renders each payload record:
   the system prompt, each message block by role, tool schemas, and a clear marker of which parts
   are user-controlled injectables versus pi-generated, plus the current decision state on each.

The user's short-term goal is observation and iteration: build the capture first so they can *see*
payloads immediately, then layer the decision control on top. The viewer is a webapp (not a TUI)
for fastest iteration and because the capture log is decoupled, the viewer can be replaced later
(e.g. by an SDK harness) without touching capture.

## User Stories

1. As a harness learner, I want to see every payload pi sends to the provider in real time, one
   record per API call, so that I can understand what is actually injected and sent.
2. As a harness learner, I want to see the system prompt exactly as assembled per call, so that I
   can audit what instructions are active.
3. As a harness learner, I want to see the full message history exactly as serialized in each
   payload, so that I can watch how my context grows and compacts across a session.
4. As a harness learner, I want tool schemas that are sent in each payload to be visible, so that I
   can see exactly what tool surface the model is offered.
5. As a harness learner, I want each payload entry tagged with model, timestamp, and token/cost
   usage, so that I can trace cost and context growth per call.
6. As a customization user, I want to see which parts of a payload are user-controlled injectables
   (skills, templates, custom instructions) versus pi-generated, so that I know what is mine to
   decide.
7. As a customization user, I want a per-call capture log that works without me being asked to
   watch it, so that I can render or replay any session afterward.
8. As a customization user, I want the decision rules (allow/deny injectables, strip system-prompt
   sections, drop message roles, redact tool output) re-read live, so that editing a rule takes
   effect on the next API call during the same session.
9. As a customization user, I want the capture and render to run in the user-owned pi extension
   directory, so that my work survives pi updates without being overwritten.
10. As a customization user, I want to record both what was intended to be sent and what was
    actually sent, so that I can compare my decisions' effect per call.
11. As a quick-iteration user, I want the render layer to be a lightweight webapp I can restyle or
    replace, so that I can slot future harness functionality (search, diffs across calls, a
    decision editor) in without touching capture.
12. As a learning user, I want the system to be buildable and demoable in an evening, so that I have
    a minimal vertical slice from pi hook to rendered record before committing to more.
13. As a learning user, I want to see a diff-style view between consecutive payloads of the same
    session, so that I can watch exactly what a new call adds to the context.
14. As a cautious user, I want to avoid blocking confirmation on every call, so that decision-making
    is rule-driven and non-disruptive to throughput.

## Implementation Decisions

- **Capture is a pi extension** using the provider seams: `before_provider_request` to see/rewrite
  the final payload, `context` to filter the message list, `before_agent_start` to decide
  injectables and system prompt. This is the single highest seam that gives both observation and
  control, and it lives in the update-safe user-owned extension directory (ADR-0001).
- **Capture and render are decoupled by the capture log** — an append-only JSONL file, one record
  per payload keyed by a per-call id, consumed by the viewer. Neither side imports the other
  (ADR-0002).
- **The capture-log record schema** (prototype-shaped decision):
  ```jsonc
  {
    "callId": "uuid-per-api-call",
    "ts": 1733234567890,
    "sessionId": "abc123",
    "model": "openrouter/deepseek-...",
    "thinkingLevel": "high",
    "intended": { "system": "...", "messages": [...], "tools": [...] },
    "sent": { "system": "...", "messages": [...], "tools": [...] },
    "decisions": [{ "rule": "drop skill:X", "effect": "removed system prompt section" }],
    "usage": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "cost": 0 }
  }
  ```
  `sent` reflects the payload after rules are applied; where no rules apply, `sent` mirrors
  `intended`.
- **Decision layer is rule-driven and live**: a small config (re-read before each call) expressing
  rules (allow/deny injectables, strip system-prompt sections, drop roles, redact tool output).
  Editing the config applies on the next call; no per-call blocking confirmation.
- **Viewer is a webapp** that tails the capture log and renders records; diffs between consecutive
  payloads of a session are a first-class view.
- **Short-term sequencing**: capture + a minimal viewer first (see it), decision rules second
  (control it). No SDK re-embed; no reverse proxy.

## Testing Decisions

- **What makes a good test**: exercise external behaviour, not implementation. For the decision
  layer, that means "given an intended payload and a set of rules, the sent payload is what the
  rules demand" — pure function over the seam contract, no pi runtime. For the viewer, "given a
  capture log fixture, the rendered page shows the expected sections and decision markers."
- **Modules to test**: the payload transformation pipeline (intended → sent under rules), which is
  pure and the highest-value seam to lock; and the viewer's rendering of capture-log fixtures.
- **Prior art**: the pi project's own provider tests (the `packages/ai/test` stream/context tests)
  are the reference for testing payload handling; the transformation tests resemble any pure
  filter/transform reducer tests already present in the user's other repos (e.g. `Repos/palmas`,
  `Repos/skills`). A fixture capture log replaces any live API dependency so tests are hermetic.

## Out of Scope

- Re-implementing pi's agent loop via the SDK (an eventual "become the harness" endpoint, not this
  feature).
- A local reverse proxy in front of the provider.
- A TUI render layer.
- Interactive per-call blocking approval (the plan is rule-driven decisions; a one-time confirmation
  on *first sighting* of an unknown injectable is a possible later refinement, not v1).
- Guaranteeing pin-stable compatibility across pi versions beyond the user-owned extension seam
  (mitigated by relying on documented hooks and keeping the tool small).

## Further Notes

- The domain vocabulary (payload, context, injectable, seam, capture log, viewer) is recorded in
  `CONTEXT.md`; ADRs 0001 and 0002 capture the two architectural commitments.
- Repo is the Nova harness under `~/Repos/nova`; the Dashboard is its `dashboard/` room, with a local-markdown issue
  tracker; this spec is the first entry. Future work (decision editor, search, dashboard) should be
  filed as issues against `ready-for-agent`.
- The pipeline was chosen partly for teaching: capture-first gives an immediate visibility win, and
  the decoupled viewer is deliberately replaceable as the user's harness ambitions grow.
