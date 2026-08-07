# Nova

A personal agent harness. Nova reshapes how the user runs and watches coding agents, built on top
of the pi agent harness rather than forked from it.

## Language

**Nova**:
The harness the user is building. A collection of pi *extensions* plus the *surfaces* that show
what they do. Lives at `~/Repos/nova`.

**Pi**:
The open-source agent harness Nova rides on. Pi provides the agent loop, the session model, and the
extension seam. Nova does **not** fork pi; it extends it from the user-owned layer so custom work
survives pi updates.
_Avoid_: "the framework", "the underyling tool" — name pi.

**Extension**:
A pi extension: TypeScript module(s) in a user-owned directory that hooks pi events, registers
tools, commands, or providers. The unit Nova is built from. Auto-discovered, hot-reloadable,
update-safe.
_Avoid_: plugin (pi's own term is extension).

**Seam**:
A named pi extension hook at which Nova observes or mutates pi behavior — e.g. `context`,
`before_provider_request`, `before_agent_start`, `tool_call`, `tool_result`.
_Avoid_: "event" when referring to a point of control; seam is the control/observation point.

**Room**:
A component of the Nova harness: one or more extensions plus any supporting surface (a webapp, a
command, a visual). Nova is a house; rooms are its functional spaces.
_Avoid_: module, component — room is the organizing unit of Nova.

**Pipes room (Dashboard)**:
The observability room of Nova. Shows live, per API call, exactly what the harness sends to the
model provider, rendered with elegant, minimal visuals. See `dashboard/CONTEXT.md` for its internal
vocabulary (payload, context, injectable, seam, capture log, render surface).
_Avoid_: prompt inspector, logs-only view — it is a live room, not an archive.

**Status**:
Nova builds pi extensions first; forking or re-embedding pi via the SDK is deferred (see
`dashboard/docs/adr/`).
