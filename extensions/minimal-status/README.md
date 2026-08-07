# Minimal Status

A Pi extension (Nova's "quiet terminal"): while an agent run is active it swaps the status label
between **`Thinking`** (model generating) and **`Working`** (tool executing), keeping **Pi's default
spinner** as the animated indicator instead of a custom one. Purely presentational; it never touches
the session, model context, or capture logging, so observability is unaffected.

## Install

Symlink this directory into your Pi user-extensions dir, then `/reload`:

```bash
ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
```

## How it works

- Uses `ctx.ui.setWorkingMessage(...)` (label) while leaving the indicator at its default, so Pi's
  own spinner animates next to the label.
- **State source**: `before_agent_start` → `thinking`; `tool_execution_start/end` → `working` /
  back to `thinking` (a running-tool counter handles parallel tools); `agent_settled` → `idle`.

## Next step (deferred by design)

Hide tool results from the transcript while keeping them logged. This requires overriding built-in
tools' `renderResult` (returning an empty component) while still wrapping their execution to
preserve the exact result shape — heavy enough to warrant its own change. Tracked as a follow-up.
