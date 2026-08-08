# Minimal Status — Nova's "quiet terminal" module

One home for keeping the **Pi terminal minimal** while the harness runs. Purely presentational: it
never changes the session, the model context, or any captured/logged data — **observability is
preserved** (tool results are still executed and recorded; hiding only affects the transcript).

## What it does

1. **HUD grid — bottom-right corner.** A bordered panel with two cells, right-aligned at the very
   bottom corner:
   ```
   ┌───────────────┐
   │ ⠋             │   spinner (border persists even when idle)
   ├───────────────┤
   │ ~/nova        │   current workspace
   └───────────────┘
   ```
   The spinner cell animates whenever the agent is busy (including while writing); its **border
   stays even when idle**, so the HUD never appears/disappears → no layout shift / no flicker.
   Uses `ctx.ui.setFooter` (replaces Pi's built-in footer).
2. **Hide tool output** — blanks the transcript renderer of the built-in tools (`bash`, `read`,
   `edit`, `write`, `grep`, `find`, `ls`) while **reusing Pi's real `execute`** (via the exported
   `create*Tool` factories), so tools behave identically — only what the transcript shows changes.
   Flip `HIDE_TOOLS` to `false` to turn this off.

## The reasoning placeholder (blank row)

The blank row where hidden reasoning sits comes from Pi's `hideThinkingBlock: true`, which renders a
placeholder row for it. A **separate, re-applicable patch** (`scripts/patch-pi-hidden-thinking.mjs`,
an admitted exception to the "never touch pi" rule) removes that placeholder row while keeping
`hideThinkingBlock: true` — reasoning is used but not shown, with no stray blank row. The normal
small leading space above an assistant message is preserved, so your message and the reply keep a
small gap. Re-run the patch after any pi update:

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

- The custom HUD footer replaces the built-in footer (pwd/token/model info isn't shown).
- **No vertical gap between messages now**: the patch removes Pi's leading blank line above each
  assistant reply (so no whitespace "appears" when text streams). Breathing room instead comes from
  the `outputPad` setting, set to `2` for a comfortable left margin (see `config/settings.defaults.json`).
- Hiding a built-in tool means registering a same-named override; Pi prints a one-time
  "overridden built-in tool" note.
- `createBashTool(cwd)` uses Pi's default local bash (default shell) — matches Pi's defaults unless
  your setup customizes bash (custom shell path, sandboxed operations).
