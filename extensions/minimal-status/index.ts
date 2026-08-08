/**
 * Minimal status — Nova's "quiet terminal" module.
 *
 * One home for all the "keep the Pi terminal minimal" behavior:
 *
 *   1. STATUS LABELS — an animated (default-spinner) status that reads what the
 *      harness is doing:
 *        Thinking…  the model is generating/reasoning
 *        Working…   at least one tool is executing
 *        Waiting…   the run is active with queued follow-up work, nothing else
 *                   to do right now
 *      (falls back to idle → Pi's normal empty status)
 *
 *   2. TOOL OUTPUT — blanks the transcript rendering of built-in tools (call
 *      header + result) while reusing Pi's real execution, so tools still run
 *      exactly as before and their results are still recorded/logged (see
 *      "Observability is a Nova principle"). Set HIDE_TOOLS=false to disable.
 *
 *   3. HIDDEN THINKING — silences Pi's italic "Thinking..." placeholder that
 *      appears when hideThinkingBlock is on, so it doesn't duplicate the
 *      spinner's "Thinking". The hideThinkingBlock setting itself lives in
 *      config/settings.defaults.json (applied by scripts/init.sh).
 *
 * This module is purely presentational: it never changes the session, the
 * model context, or any captured/logged data.
 *
 * Install: symlink into Pi's user extensions dir, then /reload:
 *   ln -s "$PWD/extensions/minimal-status" ~/.pi/agent/extensions/minimal-status
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	createBashTool,
	createEditTool,
	createFindTool,
	createGrepTool,
	createLsTool,
	createReadTool,
	createWriteTool,
} from "@earendil-works/pi-coding-agent";
import { Container } from "@earendil-works/pi-tui";

// ---------------------------------------------------------------------------
// 1. Status labels
// ---------------------------------------------------------------------------

type Phase = "thinking" | "working" | "waiting" | "idle";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
	thinking: "Thinking",
	working: "Working",
	waiting: "Waiting",
};

/**
 * Tracks the harness phase from Pi lifecycle signals.
 *  - working: at least one tool executing (counter handles parallel tools)
 *  - waiting: run active, no tools, but queued follow-up work is pending
 *  - thinking: run active, no tools, no pending work
 *  - idle: no active run
 */
class StatusState {
	private active = false;
	private toolCount = 0;

	beginRun(): void {
		this.active = true;
	}
	endRun(): void {
		this.active = false;
		this.toolCount = 0;
	}
	toolStart(): void {
		this.toolCount++;
	}
	toolEnd(): void {
		this.toolCount = Math.max(0, this.toolCount - 1);
	}
	phase(pending: boolean): Phase {
		if (this.toolCount > 0) return "working";
		if (!this.active) return "idle";
		if (pending) return "waiting";
		return "thinking";
	}
}

function applyPhase(ctx: ExtensionContext, phase: Phase): void {
	if (phase === "idle") {
		ctx.ui.setWorkingMessage(undefined);
		ctx.ui.setWorkingIndicator(undefined);
		return;
	}
	ctx.ui.setWorkingMessage(PHASE_LABEL[phase]);
	ctx.ui.setWorkingIndicator(undefined); // undefined → Pi's default spinner
}

// ---------------------------------------------------------------------------
// 2. Hide tool output (reuse Pi's real execution; blank the renderers)
// ---------------------------------------------------------------------------

// Flip to false to stop blanking tool output.
const HIDE_TOOLS = true;

function registerToolHiding(pi: ExtensionAPI, cwd: string): void {
	if (!HIDE_TOOLS) return;
	const blank = () => new Container(); // renders nothing
	const builtins = [
		createBashTool(cwd),
		createReadTool(cwd),
		createEditTool(cwd),
		createWriteTool(cwd),
		createGrepTool(cwd),
		createFindTool(cwd),
		createLsTool(cwd),
	];
	for (const tool of builtins) {
		pi.registerTool({ ...tool, renderCall: blank, renderResult: blank });
	}
}

// ---------------------------------------------------------------------------
// 3. Hidden-thinking placeholder (paired with hideThinkingBlock in settings)
// ---------------------------------------------------------------------------

// Leave empty so the spinner's "Thinking" is the only one. For a subtle marker
// instead, use e.g. "·", "…", or "(reasoning hidden)".
const HIDDEN_THINKING_LABEL = "";

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	const state = new StatusState();

	const decide = (ctx: ExtensionContext) => applyPhase(ctx, state.phase(ctx.hasPendingMessages()));

	pi.on("session_start", async (_event, ctx) => {
		state.endRun();
		ctx.ui.setHiddenThinkingLabel(HIDDEN_THINKING_LABEL);
		registerToolHiding(pi, ctx.cwd);
		applyPhase(ctx, "idle");
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		ctx.ui.setHiddenThinkingLabel(HIDDEN_THINKING_LABEL);
		state.beginRun();
		decide(ctx);
	});

	pi.on("tool_execution_start", async (_event, ctx) => {
		state.toolStart();
		decide(ctx);
	});

	pi.on("tool_execution_end", async (_event, ctx) => {
		state.toolEnd();
		decide(ctx);
	});

	// A turn finished: if follow-up work is queued we're "waiting", otherwise
	// the run continues "thinking".
	pi.on("turn_end", async (_event, ctx) => decide(ctx));

	pi.on("agent_settled", async (_event, ctx) => {
		state.endRun();
		applyPhase(ctx, "idle");
	});
}
