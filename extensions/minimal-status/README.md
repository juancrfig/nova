# Minimal Status — Nova's "quiet terminal" module

One home for keeping the **Pi terminal minimal** while the harness runs. Purely presentational: it
never changes the session, the model context, or any captured/logged data — **observability is
preserved** (tool results are still executed and recorded; hiding only affects the transcript).

## What it does

1. **Status labels** — an animated (Pi's default-spinner) status that says what the harness is doing:
   - `Thinking` — the model is generating/reasoning
   - `Working` — at least one tool is executing
   - `Waiting` — the run is active with queued follow-up work and nothing else to do right now
   - (idle → Pi's normal empty status)
2. **Hide tool output** — blanks the transcript renderer of the built-in tools (`bash`, `read`,
   `edit`, `write`, `grep`, `find`, `ls`) while **reusing Pi's real `execute`** (via the exported
   `create*Tool` factories), so tools behave identically — only what the transcript shows changes.
   Flip `HIDE_TOOLS` to `false` to turn this off.
3. **Silence hidden-thinking placeholder** — when `hideThinkingBlock` is on, Pi shows an italic
   `Thinking...` placeholder in the transcript; this blanks it so it doesn't duplicate the status.
   The `hideThinkingBlock` setting itself lives in `config/settings.defaults.json` (applied by
   `scripts/init.sh`) — they are two halves of the same "hide reasoning display" decision,
   intentionally kept together here.

## Install

```bash
ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
# then /reload in Pi
```

## Notes / trade-offs

- Hiding a built-in tool means registering a same-named override; Pi prints a one-time
  "overridden built-in tool" note.
- `createBashTool(cwd)` uses Pi's default local bash (default shell) — matches Pi's defaults unless
  your setup customizes bash (custom shell path, sandboxed operations). If that matters, the hiding
  can be scoped to the tools you actually want quiet.
- "Waiting" keys off queued follow-up messages (`ctx.hasPendingMessages()`). It covers the native
  "work pending" case; a future background-task extension can push a precise `Waiting` when needed.
