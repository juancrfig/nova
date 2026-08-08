# Minimal Status — Nova's "quiet terminal" module

One home for keeping the **Pi terminal minimal** while the harness runs. Purely presentational: it
never changes the session, the model context, or any captured/logged data — **observability is
preserved** (tool results are still executed and recorded; hiding only affects the transcript).

## What it does

1. **Loader box — bottom-right corner.** A small box `[...]` pinned to the bottom-right of the
   terminal with an animated Pi-style spinner. It's visible whenever the agent is busy (you're
   waiting), **including while the answer is being written**. When idle it's a stable empty line.
   Uses a fixed one-line custom footer (`ctx.ui.setFooter`), so nothing appears/disappears → **no
   layout shift / no flicker**. (Trade-off: it replaces Pi's built-in footer, so pwd/token/model
   info isn't shown.)
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
# then /reload in Pi (or restart: the pi patch needs a restart, not just /reload)
```

## Notes / trade-offs

- Hiding a built-in tool means registering a same-named override; Pi prints a one-time
  "overridden built-in tool" note.
- `createBashTool(cwd)` uses Pi's default local bash (default shell) — matches Pi's defaults unless
  your setup customizes bash (custom shell path, sandboxed operations).
- The custom footer replaces the built-in one. If you want a dim model name on the left (keeping
  the corner box on the right), that's a small addition — say the word.
