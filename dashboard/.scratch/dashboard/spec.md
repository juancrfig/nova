Status: ready-for-agent

# Context Visor and Minimal Context Bar

## Problem Statement

The user can see the conversation, but cannot quickly tell how much context Nova/pi is carrying or
what sources are responsible for that context. This makes context engineering difficult: skills,
loaded skill files, repository instructions, tool surfaces, tool results, and conversation messages
can all grow the request without an always-visible explanation of their contribution.

The user needs two levels of context reporting:

- a persistent, nearly invisible capacity signal answering only “how much context is roughly used?”;
- an on-demand composition report explaining which sources occupy that context.

The report must be useful before the first conversation, must remain approximate rather than pretend to
be provider-exact in the MVP, and must live in Nova's user-owned pi extension layer.

## Solution

Extend the existing terminal-status extension with two presentation surfaces:

1. **Minimal context bar** — a monochrome, theme-derived progress bar pinned to the absolute bottom
   edge of the terminal and spanning its full width. The active model's full context window represents
   100% of the width. Known estimated occupancy is rendered with a solid block (`█`), known free
   capacity with a dim track (`░`), and unknown potential occupancy—currently unknown Media—with a
   single marker (`▒`). The bar contains no labels, categories, token counts, or legend.

2. **Context Visor** — a read-only, right-side sidebar closed by default and toggled with
   `Ctrl+Shift+C`. It is a fixed 36-column, full-terminal-height opaque overlay. It renders over the
   existing terminal content rather than reflowing it; content underneath the right side is hidden
   while the visor is open. The visor shows only the overall occupancy summary at its top-left, such
   as `~100k / 1M` or `≥~100k / 1M` when unknown Media is present. Each non-empty composition category
   is shown as a two-line row: full category name and rough estimate, followed by a full-width graph
   track whose filled width represents that category's percentage of the active model's full context
   window.

The MVP estimates text and structured content with `characters / 4`, applies the same deterministic
heuristic to every text category, and updates the next-request context snapshot at pi's
`agent_settled` seam. It also displays a provisional startup estimate from Pi's known baseline inputs
before any conversation exists.

## User Stories

1. As a context-engineering user, I want a persistent bottom bar, so that I can tell at a glance how
   much of the active model's context window is roughly occupied.
2. As a context-engineering user, I want the bottom bar to span the full terminal width, so that its
   geometry directly represents the model's full context window as 100%.
3. As a context-engineering user, I want the occupied portion of the bottom bar to use a solid visual,
   so that known context pressure is immediately legible.
4. As a context-engineering user, I want free capacity to remain visually distinct from occupied
   capacity, so that I can see how much room remains.
5. As a context-engineering user, I want unknown potential occupancy to be marked separately, so that
   the bar does not falsely claim that all unfilled capacity is known to be free.
6. As an Omarchy user, I want the bar's visual tokens to come from the active Pi theme, so that it
   follows my terminal theme without Nova hardcoding colors.
7. As a minimal-interface user, I want the bottom bar to contain no labels or category detail, so that
   it answers only the capacity question without adding visual noise.
8. As a context-engineering user, I want a detailed report available on demand, so that I can inspect
   context composition without permanently occupying terminal space.
9. As a context-engineering user, I want `Ctrl+Shift+C` to open and close the Context Visor, so that
   the detailed report is available through one memorable shortcut.
10. As a context-engineering user, I want the visor closed by default, so that normal agent work keeps
    the existing terminal view.
11. As a context-engineering user, I want the visor to open on the right, so that it behaves like a
    side instrument while preserving the main transcript's orientation.
12. As a context-engineering user, I want the visor to overlay the terminal instead of reflowing it,
    so that opening the report does not change the underlying layout.
13. As a context-engineering user, I want content beneath the visor to be fully hidden, so that the
    report remains readable across terminal backgrounds and themes.
14. As a context-engineering user, I want the visor to occupy the full terminal height, so that it is
    a complete report surface rather than a small transient dialog.
15. As a context-engineering user, I want the visor to have a stable 36-column width, so that its
    layout does not jump as categories change.
16. As a context-engineering user, I want the visor to show the overall known occupancy at the top
    left, so that the category graph has an immediate capacity context.
17. As a context-engineering user, I want the visor to use a lower-bound indicator when unknown Media
    exists, so that the summary does not imply provider-exact total occupancy.
18. As a context-engineering user, I want one graph row for each non-empty category, so that the report
    reflects what is actually present rather than displaying empty placeholders.
19. As a context-engineering user, I want full category names in the visor, so that the report is
    understandable without memorizing abbreviations.
20. As a context-engineering user, I want a rough estimate beside each category, so that I can compare
    the cost of context sources quickly.
21. As a context-engineering user, I want each row's graph track to use the full model context window
    as its denominator, so that row percentages agree with the bottom bar and overall occupancy.
22. As a context-engineering user, I want category rows to use category-specific theme colors, so that
    composition is distinguishable without hardcoded colors.
23. As a context-engineering user, I want the visor to be read-only in the MVP, so that observing
    context cannot accidentally mutate the session.
24. As a context-engineering user, I want the base System prompt reported separately, so that I can
    distinguish core and extension instructions from other injected sources.
25. As a context-engineering user, I want Skills reported separately from Loaded, so that I can see
    the cost of skill discovery independently from full skill contents.
26. As a context-engineering user, I want Context files reported separately, so that I can understand
    the contribution of `AGENTS.md`, `CLAUDE.md`, and other files Pi actually loaded.
27. As a context-engineering user, I want Tools reported separately, so that I can understand the
    context cost of the available tool surface.
28. As a context-engineering user, I want Tools to include descriptions, system-prompt guidance,
    structured schemas, and MCP tool metadata, so that the report covers the complete offered tool
    surface.
29. As a context-engineering user, I want Results reported separately from Tools, so that tool
    definitions are not confused with content returned by tool execution.
30. As a context-engineering user, I want User messages and Assistant messages to be separate, so that
    I can see which side of the conversation is consuming context.
31. As a context-engineering user, I want Media reported separately, so that images, audio, and video
    are not hidden inside a text estimate.
32. As a context-engineering user, I want Others to capture content that cannot be confidently
    classified, so that unknown text remains visible rather than being silently misattributed.
33. As a context-engineering user, I want related categories to remain in a stable order, so that I
    can compare the visor across refreshes.
34. As a context-engineering user, I want Results immediately after Tools, so that the tool surface and
    its returned content remain visually adjacent.
35. As a context-engineering user, I want empty categories omitted, so that the visor stays concise and
    represents only context that exists.
36. As a context-engineering user, I want tiny categories to retain a textual percentage and estimate
    even when their graph has no filled cell, so that small contributions are not lost to terminal
    resolution.
37. As a context-engineering user, I want the report before sending my first message, so that I can
    inspect the startup context before beginning work.
38. As a context-engineering user, I want the startup report to show Pi's known baseline inputs, so
    that it reflects loaded resources rather than every file that merely exists on disk.
39. As a context-engineering user, I want a genuinely new session to omit empty Loaded, Results, User
    messages, and Assistant messages categories, so that the initial report is truthful.
40. As a session-resuming user, I want restored Loaded or Results content to appear in the initial
    report when present, so that the report reflects the resumed context.
41. As a context-engineering user, I want the MVP to refresh after the complete agent run settles,
    so that retries, compaction, and queued continuations do not produce misleading intermediate
    snapshots.
42. As a context-engineering user, I want each refresh to describe the context for the next provider
    request, so that the report includes the assistant response that just completed.
43. As a context-engineering user, I want recognized skill reads attributed to Loaded, so that a
    skill's contribution is not hidden in generic Results.
44. As a context-engineering user, I want ordinary tool-returned content attributed to Results, so
    that skill loads and other tool output remain distinct.
45. As a context-engineering user, I want source-specific injection wrappers counted with their source,
    so that a category reflects its full assembled footprint rather than only the raw file body.
46. As a context-engineering user, I want ambiguous content assigned to Others, so that the report does
    not double-count or falsely classify it.
47. As a context-engineering user, I want the report to remain useful despite approximate token counts,
    so that I can compare context sources without waiting for provider-specific tokenizers.
48. As a context-engineering user, I want the long-term design to support provider-specific accounting,
    so that Nova can eventually approach provider billing accuracy.
49. As a context-engineering user, I want Media to show an item count with an unknown estimate, so
    that I know non-text content exists without receiving a fabricated token number.
50. As a context-engineering user, I want a single unknown-occupancy marker in the bottom bar, so that
    Media uncertainty is visible without assigning it an invented width.
51. As a context-engineering user, I want opening or closing the visor to be purely presentational,
    so that the shortcut cannot change context or session state.
52. As a Nova maintainer, I want the existing spinner/activity and workspace-path metadata to remain
    unchanged, so that adding context reporting does not regress the current quiet-terminal behavior.
53. As a Nova maintainer, I want the context report to remain in the user-owned extension layer, so
    that it survives pi updates and respects Nova's extension-seam architecture.
54. As a Nova maintainer, I want the composition logic separated from footer rendering, so that a future
    live report or dedicated Dashboard extension can reuse the context model.

## Implementation Decisions

- The feature is implemented as a pi extension enhancement, not by modifying pi or re-embedding pi
  through the SDK. This follows the extension-seam architectural commitment.
- The existing custom footer remains the single footer owner. The existing spinner/activity and
  workspace-path rows retain their current appearance, and the minimal context bar is appended as the
  final bottom row. The earlier six-row rectangle design is superseded and is not implemented.
- The minimal context bar is a one-row, full-terminal-width component pinned to the absolute bottom
  edge. Its denominator is the active model's declared full context window. It renders known occupied
  capacity with a solid block, known free capacity with a dim track, and unknown potential occupancy
  with a single marker. It has no text or category detail.
- The Context Visor is a read-only custom overlay toggled by a registered `Ctrl+Shift+C` shortcut. It
  is closed by default, fixed at 36 columns, positioned on the right, full terminal height, opaque,
  and bordered on its left edge with a neutral theme border. Opening it hides the underlying right-side
  terminal content rather than resizing the terminal layout.
- The visor displays only the occupancy summary at its top-left. It has no title and no legend. The
  summary uses the known estimate form `~estimated / contextWindow`; when unknown Media exists it uses
  the lower-bound form `≥~estimated / contextWindow`.
- Each non-empty category is rendered as a two-line visor row: full category name plus rough estimate,
  then a full-width graph track. The track's full width equals 100% of the active model context
  window, and the filled portion represents that category's share of that denominator. Tiny categories
  may have no filled cell but retain textual percentage, estimate, and a marker.
- The canonical category order is: System prompt, Skills, Loaded, Context files, Tools, Results, User
  messages, Assistant messages, Media, Others. Empty categories are omitted. Results always follow
  Tools.
- System prompt is the residual base and extension instruction content after recognizable Skills,
  Loaded, Context files, and Tools content is attributed. It includes content such as Pi's core
  behavior instructions, Nova instructions, the working-directory line, and general guidelines.
- Skills is the compact skill-discovery metadata Pi includes in the system prompt, including names,
  descriptions, locations, and related discovery wrappers. Loaded is the full content of a recognized
  skill file after the model reads it.
- Context files include the content and source-specific wrappers of context files Pi actually loaded,
  including applicable `AGENTS.md` and `CLAUDE.md` files. The tracker does not count files merely
  because they exist on disk.
- Tools includes the complete offered tool surface: tool descriptions, system-prompt tool guidance,
  structured tool schemas, and MCP tool definitions and metadata.
- Results includes ordinary content returned by tools and retained in context. A recognized full skill
  read is removed from ordinary Results and attributed to Loaded.
- Media includes images, audio, and video. Media is shown in the visor with an item count and unknown
  estimate; it receives no invented token weight. When Media is present, the bottom bar shows one
  unknown marker and the occupancy summary is a lower bound.
- Others contains content that cannot be confidently attributed to another category, including
  ambiguous or overlapping parser ranges and unclassified provider-level content. It is never silently
  distributed across known categories.
- Source attribution uses a metadata-first hybrid. Pi's structured system-prompt options provide the
  inventory of known context files, skills, and selected tools. The retained assembled system prompt,
  current logical session messages, active tools, tool metadata, and the final provider payload as a
  validation reference provide the observed content for the next request.
- The extension retains the latest `before_agent_start` snapshot, including both the assembled system
  prompt and structured system-prompt options. At `agent_settled`, it combines that snapshot with Pi's
  current logical session messages, active tools, and tool metadata. It does not patch the completed
  provider payload with the newly received assistant response.
- System-prompt partitioning is best-effort and marker-based, using known metadata rather than fixed
  positional ranges. Recognized Skills, Context files, and Tools ranges are assigned to their source
  categories. Unmatched text is System prompt; ambiguous or overlapping ranges are Others. The parser
  must cover the observed system-prompt text without double-counting.
- Loaded skill recognition tracks read-tool calls, resolves requested paths, and matches them against
  Pi's known skill metadata. The MVP performs this recognition over accumulated session messages after
  `agent_settled`; the same mechanism can support future immediate live updates.
- Text and structured-content estimates use one deterministic heuristic: content characters divided by
  four, rounded to a compact display value and prefixed with `~`. The heuristic is used consistently
  across categories and is explicitly approximate, not provider billing accounting.
- The minimal bar uses Pi's active semantic theme tokens for its occupied, unknown, and free states.
  The visor uses centralized category-to-semantic-token mappings and theme rendering, with no
  hardcoded hex, ANSI, or 256-color palette. Theme changes invalidate and redraw the surfaces.
- Before the first conversation, the tracker shows a provisional estimate from Pi's known startup/base
  inputs without duplicating Pi's system-prompt builder. A new session can show System prompt, Skills,
  Context files, and Tools; empty Loaded, Results, User messages, Assistant messages, and Media are
  omitted. Resumed sessions may have restored non-empty categories.
- The MVP refreshes after `agent_settled`, representing the context that the next provider request
  would inherit. The long-term vision is event-driven live updates after user submission, assistant
  completion, skill loading, and other context changes, but those immediate updates are deferred.
- If no active model or valid context window is available, the surfaces show a neutral unavailable
  state rather than inventing a denominator or using stale capacity data.
- Provider delivery roles (`system`, `user`, `assistant`, and `tool`) are a separate dimension from
  source composition and are deferred to a later feature.

## Testing Decisions

- Good tests exercise observable behavior and invariants rather than implementation details. They
  should verify what the user sees for supplied logical context and metadata, not the internal parser
  functions or class structure in isolation.
- The context-composition estimator/parser is the highest-value pure module to test. Given a retained
  system-prompt snapshot, structured resource metadata, logical messages, tool metadata, and known
  skill paths, tests should verify category attribution, residual accounting, no double-counting,
  canonical ordering, empty-category omission, recognized skill-load handling, Others fallback, and
  `characters / 4` estimates.
- The minimal-bar renderer should be tested with representative context-window sizes, including zero,
  tiny, partial, full, unavailable, and unknown-Media states. Tests should verify full-width geometry,
  `█`/`▒`/`░` semantics, one-marker Media behavior, and no labels in the bar.
- The Context Visor renderer should be tested with fixtures containing all categories, sparse
  categories, tiny categories, unknown Media, unavailable model capacity, and long names. Tests should
  verify the top-left-only summary, fixed-width overlay assumptions, two-line rows, full-window row
  denominator, canonical order, theme application, and read-only presentation.
- A focused footer/extension integration test should verify that the existing spinner and workspace
  path remain unchanged, the minimal bar is the final bottom row, `agent_settled` refreshes the
  snapshot, and the `Ctrl+Shift+C` shortcut toggles the visor without changing context or session
  state.
- Pi's documented extension lifecycle, custom footer, shortcut, overlay, and TUI component behavior
  are the relevant prior art. The existing quiet-terminal footer behavior is the regression baseline.
  The repository currently has no established feature test suite for this extension, so hermetic
  fixtures and pure external-behavior tests should be introduced with the feature.

## Out of Scope

- Provider-exact token counting, provider billing accuracy, or model-specific tokenizers in the MVP.
- Exact token estimates for images, audio, or video; Media remains unknown until a later accounting
  feature.
- Immediate event-driven refreshes after every user message, assistant stream update, tool result, or
  skill load. The MVP refreshes at `agent_settled`.
- A second delivery-role visualization or role strip.
- Interactive visor controls, category selection, scrolling, source inspection, source enable/disable,
  context mutation, or decision editing.
- A responsive or dynamically sized visor. The MVP assumes a full terminal and uses fixed 36-column
  width.
- A title, legend, category labels, token counts, or composition detail in the minimal bottom bar.
- The earlier bordered four-row context rectangle and its overflow legend.
- Changes to the Dashboard webapp render surface, capture-log schema, capture/render decoupling, or
  provider payload capture behavior.
- A reverse proxy, SDK reimplementation, or direct changes to pi source.
- Automatic pressure colors, reserve-token thresholds, or compaction controls.

## Further Notes

- This feature is a terminal HUD surface within the existing quiet-terminal extension. It does not
  replace the Dashboard's webapp render surface and does not contradict the Dashboard capture-log ADR.
- The full model context window is the denominator for both the minimal bar and visor row geometry.
  Pi's reserved response space is not subtracted in the MVP.
- `~` means approximate. `≥~` means the shown known estimate is a lower bound because unknown Media
  may add occupancy.
- The Context Visor is intentionally an observation surface first. Future work may make the context
  report interactive after the read-only composition model proves useful.
