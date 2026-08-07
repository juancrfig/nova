/**
 * Minimal status — Nova's "quiet terminal" extension
 *
 * Keeps the Pi terminal minimal while an agent run is active:
 *  - shows the default spinner on "Thinking" while the model is generating, and
 *    on "Working" while a tool is executing
 *  - the label swaps in-place; Pi's built-in spinner provides the animation
 *  - silences Pi's italic "Thinking..." placeholder (from hideThinkingBlock) so
 *    it doesn't duplicate the spinner's "Thinking"
 *
 * This is purely presentational: it only changes what the terminal shows. It
 * does not touch the session, model context, or capture logging, so
 * observability is preserved (tool output is still logged elsewhere).
 *
 * Install: symlink this directory into your user extensions dir
 *   ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
 *   # then /reload in Pi
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ActivePhase = "thinking" | "working";
type Phase = ActivePhase | "idle";

const LABEL: Record<ActivePhase, string> = {
	thinking: "Thinking",
	working: "Working",
};

// With hideThinkingBlock enabled Pi renders an italic placeholder where the
// reasoning was. Default is "Thinking...". Our status spinner already reads
// "Thinking", so leave this empty to avoid a duplicate. Set it to e.g.
// "·", "…", or "(reasoning hidden)" if you want a marker instead.
const HIDDEN_THINKING_LABEL = "";

function apply(ctx: ExtensionContext, phase: Phase): void {
	if (phase === "idle") {
		ctx.ui.setWorkingMessage(undefined);
		ctx.ui.setWorkingIndicator(undefined);
		return;
	}
	// Hidden indicator (undefined) = Pi's default spinner, which animates next
	// to whatever label we set.
	ctx.ui.setWorkingMessage(LABEL[phase]);
	ctx.ui.setWorkingIndicator(undefined);
}

export default function (pi: ExtensionAPI) {
	let phase: Phase = "idle";
	let runningTools = 0;

	const setPhase = (ctx: ExtensionContext, next: Phase) => {
		if (next === phase) return;
		phase = next;
		apply(ctx, phase);
	};

	pi.on("session_start", async (_event, ctx) => {
		phase = "idle";
		runningTools = 0;
		ctx.ui.setHiddenThinkingLabel(HIDDEN_THINKING_LABEL);
	});

	// User submitted a prompt: the model is about to reason.
	pi.on("before_agent_start", async (_event, ctx) => {
		ctx.ui.setHiddenThinkingLabel(HIDDEN_THINKING_LABEL);
		setPhase(ctx, "thinking");
	});

	// A tool started executing: we're "working".
	pi.on("tool_execution_start", async (_event, ctx) => {
		runningTools++;
		setPhase(ctx, "working");
	});

	// Tool finished: back to thinking (parallel tools may still be running).
	pi.on("tool_execution_end", async (_event, ctx) => {
		runningTools = Math.max(0, runningTools - 1);
		if (runningTools === 0) setPhase(ctx, "thinking");
	});

	// The whole run has settled (no retry/compaction left): go idle.
	pi.on("agent_settled", async (_event, ctx) => {
		runningTools = 0;
		setPhase(ctx, "idle");
	});
}
