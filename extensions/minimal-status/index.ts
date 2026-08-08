/**
 * Minimal status — Nova's "quiet terminal" module.
 *
 * One home for all the "keep the Pi terminal minimal" behavior:
 *
 *   1. STATUS — just two labels, both with Pi's default spinner:
 *        Working…  at least one tool is executing
 *        Waiting…  the run is active and there's nothing else to do right now
 *      While the model is actually rendering a message on screen, no indicator
 *      is shown at all (you can see the response being written). Idle → none.
 *
 *   2. TOOL OUTPUT — blanks the transcript rendering of built-in tools (call
 *      header + result) while reusing Pi's real execution, so tools still run
 *      exactly as before and results are still recorded/logged. Flip
 *      HIDE_TOOLS=false to disable.
 *
 * Purely presentational: never changes the session, the model context, or any
 * captured/logged data — observability is preserved.
 *
 * About the reasoning placeholder: Pi's hideThinkingBlock draws a blank
 * placeholder row for hidden reasoning. That row is removed by the separate,
 * re-applicable patch in scripts/patch-pi-hidden-thinking.mjs (an admitted
 * exception to the "never touch pi" rule). config/settings.defaults.json sets
 * hideThinkingBlock:true so reasoning is used but not shown.
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
// Status
// ---------------------------------------------------------------------------

// "none" = show no status indicator (response rendering on screen, or idle).
type Phase = "working" | "waiting" | "none";

const LABEL: Record<"working" | "waiting", string> = {
	working: "Working",
	waiting: "Waiting",
};

/**
 * Tracks the harness phase from Pi lifecycle signals:
 *  - working:   at least one tool executing (counter handles parallel tools)
 *  - none:      an assistant message is streaming on screen (or idle)
 *  - waiting:   run active, no tool, nothing rendering — nothing else to do
 */
class StatusState {
	private active = false;
	private toolCount = 0;
	private generating = false;

	beginRun(): void {
		this.active = true;
	}
	endRun(): void {
		this.active = false;
		this.toolCount = 0;
		this.generating = false;
	}
	toolStart(): void {
		this.toolCount++;
	}
	toolEnd(): void {
		this.toolCount = Math.max(0, this.toolCount - 1);
	}
	setGenerating(value: boolean): void {
		this.generating = value;
	}

	phase(): Phase {
		if (this.toolCount > 0) return "working";
		if (this.generating) return "none"; // response is rendering on screen
		if (this.active) return "waiting";
		return "none";
	}
}

function applyPhase(ctx: ExtensionContext, phase: Phase): void {
	if (phase === "none") {
		ctx.ui.setWorkingVisible(false);
		return;
	}
	ctx.ui.setWorkingVisible(true);
	ctx.ui.setWorkingMessage(LABEL[phase]);
	ctx.ui.setWorkingIndicator(undefined); // undefined → Pi's default spinner
}

// ---------------------------------------------------------------------------
// Hide tool output (reuse Pi's real execution; blank the renderers)
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
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	const state = new StatusState();

	const decide = (ctx: ExtensionContext) => applyPhase(ctx, state.phase());

	pi.on("session_start", async (_event, ctx) => {
		state.endRun();
		registerToolHiding(pi, ctx.cwd);
		applyPhase(ctx, "none");
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		state.beginRun();
		decide(ctx);
	});

	// Assistant message streaming on screen → hide the indicator.
	pi.on("message_start", async (event, ctx) => {
		if (event.message?.role === "assistant") {
			state.setGenerating(true);
			decide(ctx);
		}
	});
	pi.on("message_end", async (event, ctx) => {
		if (event.message?.role === "assistant") {
			state.setGenerating(false);
			decide(ctx);
		}
	});

	pi.on("tool_execution_start", async (_event, ctx) => {
		state.toolStart();
		decide(ctx);
	});
	pi.on("tool_execution_end", async (_event, ctx) => {
		state.toolEnd();
		decide(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => decide(ctx));

	pi.on("agent_settled", async (_event, ctx) => {
		state.endRun();
		applyPhase(ctx, "none");
	});
}
