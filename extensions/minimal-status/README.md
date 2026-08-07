# Minimal Status

A Pi extension (Nova's "quiet terminal"): while an agent run is active it shows an
**animated three-dot throbber** — `Thinking…` while the model generates, `Working…` while a tool
executes — replacing Pi's default spinner. Purely presentational; it never touches the session,
model context, or capture logging, so observability is unaffected.

## Install

Symlink this directory into your Pi user-extensions dir, then `/reload`:

```bash
ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
```

## How it works

- Uses `ctx.ui.setWorkingIndicator(...)` / `setWorkingMessage(...)` — Pi shows this loader for the
  whole duration of an agent run (`isStreaming`).
- **State source**: `before_agent_start` → `thinking`; `tool_execution_start/end` → `working` /
  back to `thinking` (a running-tool counter handles parallel tools); `agent_settled` → `idle`.
- **Animation**: frames carry the label + growing dots (`Thinking`, `Thinking.`, `Thinking..`,
  `Thinking...`), so Pi's own loader timer drives the animation.

## Next step (deferred by design)

Hide tool results from the transcript while keeping them logged. This requires overriding built-in
tools' `renderResult` (returning an empty component) while still wrapping their execution to
preserve the exact result shape — heavy enough to warrant its own change. Tracked as a follow-up.
