# Dashboard — the pipes room of Nova

A room of the Nova harness: watch, in real time and per API call, exactly what the harness sends to
its model provider, and apply an opinionated layer that decides what is allowed to go out. Rendered
live with elegant, minimal visuals.

The Dashboard is one room; use Nova's vocabulary from the repo root `CONTEXT.md` for everything
outside this room.

## Language

**Payload**:
The exact, serialized request sent to the model provider on a single API call — system prompt,
injected skill/template text, tool schemas, full message history, and per-call options. One
payload per API call.
_Avoid_: prompt (overloaded — can mean a message, the system prompt, or the whole request)

**Context**:
The running conversation state (the sequence of messages) the harness holds and mutates across a
session, before it is serialized into any particular payload.

**Injectable**:
A discrete, user-controlled unit of text that the harness can inject into context — a skill, a
prompt template, a custom instruction. The set of things the user can decide to send or drop.
_Avoid_: prompt, block

**Seam**:
A pi extension hook at which the Dashboard observes or mutates what reaches the provider. The active
seams are `context` (filter messages), `before_agent_start` (decide injectables / system prompt),
and `before_provider_request` (see and rewrite the final payload).

**Capture log**:
The append-only JSONL stream where the Dashboard records one entry per payload, as the decoupled
contract between the capture half and the render half.

**Render surface**:
The webapp that reads the capture log and renders each payload record live — the visual face of the
Dashboard. (Earlier docs call this the "viewer".)
_Avoid_: TUI
