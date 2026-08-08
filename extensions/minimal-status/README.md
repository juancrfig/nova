# Minimal Status — Nova's "quiet terminal" module

One home for keeping the **Pi terminal minimal** while the harness runs. Purely presentational: it
never changes the session, the model context, or any captured/logged data — **observability is
preserved** (tool results are still executed and recorded; hiding only affects the transcript).

## What it does

1. **Status — two labels, Pi's default spinner:**
   - `Working` — at least one tool is executing
   - `Waiting` — the run is active and there's nothing else to do right now
   - While a response is actually rendering on screen, **no indicator is shown** — you can see it
     being written. Idle → nothing.
2. **Hide tool output** — blanks the transcript renderer of the built-in tools (`bash`, `read`,
   `edit`, `write`, `grep`, `find`, `ls`) while **reusing Pi's real `execute`** (via the exported
   `create*Tool` factories), so tools behave identically — only what the transcript shows changes.
   Flip `HIDE_TOOLS` to `false` to turn this off.

## The reasoning placeholder (blank line)

The blank "hidden thinking" row comes from Pi's `hideThinkingBlock: true`, which renders a
placeholder row for hidden reasoning. That row is removed by a **separate, re-applicable patch**:
`scripts/patch-pi-hidden-thinking.mjs` (an admitted exception to the "never touch pi" rule). It
keeps `hideThinkingBlock: true` (reasoning used but not shown) and deletes the placeholder row, so
no blank line appears. Re-run it after any pi update:

```bash
node scripts/patch-pi-hidden-thinking.mjs        # apply
node scripts/patch-pi-hidden-thinking.mjs --revert  # undo
```

## Install

```bash
ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
# then /reload in Pi
```

## Notes / trade-offs

- Hiding a built-in tool means registering a same-named override; Pi prints a one-time
  "overridden built-in tool" note.
- `createBashTool(cwd)` uses Pi's default local bash (default shell) — matches Pi's defaults unless
  your setup customizes bash (custom shell path, sandboxed operations).
- "Waiting" shows in active gaps (between turns/tools) and keys off queued follow-up work being
  done; a future background-task extension can push a precise `Waiting` when needed.
