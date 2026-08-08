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

**Context occupancy**:
The portion of the active model's context window occupied by the current context and injected
provider instructions, expressed as tokens and as a percentage of the model's context-window
capacity. It is the primary quantity shown by the context tracker.

**Context composition**:
The non-overlapping, estimated classification of context occupancy into sources such as system
instructions, Skills, Loaded, Context files, Tools, Results, User messages, Assistant messages, Media,
and Others. User messages and assistant messages are separate composition
categories. `Skills` means the compact name, description, location, and related discovery metadata for
available skills that Pi places in the system prompt. `Loaded` means the full content of a recognized
skill file after the model loads it. `Tools` means the complete tool surface offered to the model:
tool descriptions, system-prompt tool guidance, structured tool schemas, and MCP tool definitions and
metadata. Source-specific wrapper text is attributed to its source category: context-file wrappers
count as `Context files`, skill XML and discovery wrappers count as `Skills`, and tool-guidance
wrappers count as `Tools`. Only genuinely unattributed assembled content counts as `System prompt` or
`Others`. `System prompt` therefore means the remaining base and extension instruction content—such as Pi's core behavior instructions, Nova instructions, the working-directory
line, and general guidelines—after recognizable Skills, Loaded content, Context files, and Tools have
been assigned to their own categories. This keeps each category's estimate representative of its full
footprint in the assembled context, not just raw source bodies. `Media` covers images, audio, and
video. `Others` covers remaining content that cannot be confidently assigned to another category.
`Results` means content returned by
tools and included in context; it does not mean the tool implementation itself. For the MVP, non-empty
`Media` is reported with an unknown estimate and item count rather than invented token weight; its
marker appears in the free-capacity zone and its uncertainty remains explicit in the category report.
The minimal bottom bar distinguishes known occupied, unknown potential occupancy, and known free
capacity with `█`, `▒`, and `░` respectively. Media uncertainty is explained in detail by the Context
Visor.
Provider-specific accounting may estimate Media later. When Media is non-empty, total occupancy
is shown as a lower bound: the known estimate is prefixed with `≥~`, and the unknown media contribution
is reported separately. A recognized full skill load belongs to `Loaded` even when it arrived through a
read-tool result, so it is excluded from
ordinary `Results`. Each counted unit belongs to one composition category so the categories add up to
the displayed estimated occupancy. The estimate is intended for clear comparison and context
engineering, not as provider-exact accounting.
MVP attribution is metadata first: known Pi resources are attributed where recognizable, while
unrecognized content remains `Others` so the observed payload is covered without false precision.

The primary bar uses this canonical order: `System prompt`, `Skills`, `Loaded`, `Context files`,
`Tools`, `Results`, `User messages`, `Assistant messages`, `Media`, and `Others`. `Results` always follows `Tools`, even when message categories are also present. Empty categories
remain omitted, but the relative order of all non-empty categories is preserved.

**Context report**:
Nova's clear account of what context is being sent to the model, including estimated occupancy and
its composition by source. A user should be able to inspect this report easily rather than infer
context costs from the conversation alone. The report begins before conversation with the startup
context Pi has actually loaded, such as the system prompt, discovered context files, skill definitions,
loaded resources, and selected tools; empty message categories are omitted. For a new session, the
startup report is provisional: it shows the known system prompt, Skills metadata, Context files, and
Tools, while Loaded, Results, User messages, and Assistant messages are empty and omitted. The first
post-response snapshot replaces it with the next-request context.

**Context tracker**:
The minimal bottom-edge progress bar that answers only how much context is roughly used. It spans the
full terminal width, treats the full active model context window as 100%, and uses a black/white,
theme-derived appearance for occupied versus free context. The MVP uses a solid block for known occupied capacity, a third pattern for unknown potential
occupancy, and a dim track for known free capacity, such as `█`, `▒`, and `░`; it never uses category
colors. It contains no composition labels or
category detail; the Context Visor provides that report. The tracker follows the user's active Omarchy
theme through Pi's semantic theme tokens. When unknown Media exists, the bar renders a single `▒`
marker in the free zone and does not assign that marker an invented proportional width.

**Context Visor**:
The detailed context-composition sidebar, closed by default and opened with `Ctrl+Shift+C`. It is
shown on the right by default and renders over terminal content rather than reflowing the underlying
window. Content behind the open visor is hidden on the right. The MVP visor is fixed at 36 columns and
occupies the full terminal height when open, covering the underlying minimal bar and footer. The visor
displays a vertical graph with one row per non-empty context-composition category, a category label, a
rough estimate where known, and a bar representing that category's percentage of the active model's
full context window. The visor shows only the overall occupancy summary at its top-left corner, such
as `~100k / 1M`; it has no title or legend. When Media is present, it uses the lower-bound form, such
as `≥~100k / 1M`. Each category row uses two lines: the full category name and rough estimate first,
followed by a full-width graph track whose filled portion represents that category's percentage of the
full active-model context window. Each row's graph track spans the full available visor graph width, where the complete track equals
100% of the active model's context window. Tiny categories may have no filled cell but retain their
textual percentage, estimate, and marker. Media is shown with an unknown estimate and item count;
category detail belongs in the visor, not the minimal bottom bar. The open visor uses an opaque
Pi-theme-derived background and a neutral `borderMuted` left edge, fully hiding the terminal content
beneath it. `Ctrl+Shift+C` toggles the visor
open and closed; this presentational action does not alter context or session state. The MVP visor is
read-only and has no scrolling, selection, category controls, source mutations, or context-editing
behavior.

**Delivery role**:
The role under which content reaches the provider, such as `system`, `user`, `assistant`, or `tool`.
Roles are provider-facing semantics and may vary by provider; a source such as a skill or context file
can be delivered inside the system role without becoming part of the base system prompt.

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
