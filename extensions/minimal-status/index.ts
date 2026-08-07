/**
 * Minimal status — Nova's "quiet terminal" extension
 *
 * Keeps the Pi terminal minimal while an agent run is active:
 *  - shows an animated three-dot throbber on "Thinking..." while the model
 *    is generating, and "Working..." while a tool is executing
 *  - replaces Pi's default spinner with a plain animated-dots indicator
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

/** Trailing dots that grow 0 → 3, then reset. */
const DOT_FRAMES = ["", ".", "..", "..."];

const INTERVAL_MS = 200;

/** Build the animated frames for a phase: "Thinking", "Thinking.", "Thinking..", "Thinking..." */
function framesFor(phase: ActivePhase): string[] {
	return DOT_FRAMES.map((dots) => `${LABEL[phase]}${dots}`);
}

function apply(ctx: ExtensionContext, phase: Phase): void {
	if (phase === "idle") {
		ctx.ui.setWorkingMessage(undefined);
		ctx.ui.setWorkingIndicator(undefined);
		return;
	}
	// Dots are animated inside the frames; keep the message empty so the loader
	// shows only the animated label.
	ctx.ui.setWorkingMessage("");
	ctx.ui.setWorkingIndicator({ frames: framesFor(phase), intervalMs: INTERVAL_MS });
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
	});

	// User submitted a prompt: the model is about to reason.
	pi.on("before_agent_start", async (_event, ctx) => setPhase(ctx, "thinking"));

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
