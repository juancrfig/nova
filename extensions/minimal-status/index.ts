/**
 * Minimal status — Nova's "quiet terminal" module.
 *
 * One home for the "keep the Pi terminal minimal" behavior:
 *
 *   1. LOADER BOX — a small box pinned to the BOTTOM-RIGHT corner of the terminal
 *      showing an animated spinner. Visible whenever the agent is busy (the user
 *      is waiting), including while the answer is being written. Hidden (or
 *      reduced to a dim line) when idle. A fixed one-line custom footer keeps
 *      the layout stable — no added/removed blank lines.
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
import { Container, visibleWidth } from "@earendil-works/pi-tui";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Spinner (animated frame owned by the loader box)
// ---------------------------------------------------------------------------

// Eleven phase-shifted cells. A trailing space gives each cell a two-column
// footprint: terminal glyphs cannot be scaled by 42%, so this is the closest
// stable approximation without increasing the footer height.
const SPINNER_GLYPHS = ["◴", "◷", "◶", "◵"];
const SPINNER_CELL_COUNT = 11;
const SPINNER_FRAMES = Array.from({ length: SPINNER_GLYPHS.length }, (_, frame) =>
	Array.from({ length: SPINNER_CELL_COUNT }, (_, cell) => {
		const glyph = SPINNER_GLYPHS[(frame + cell) % SPINNER_GLYPHS.length];
		return `${glyph} `;
	}).join(""),
);
const SPINNER_MS = 100;

class Spinner {
	private index = 0;
	private timer: ReturnType<typeof setInterval> | undefined;
	// We only animate when idle — a static glyph otherwise keeps the box from
	// chewing CPU and stops it from "spinning" at the wrong times.
	animate = false;

	start(): void {
		this.animate = true;
		if (!this.timer) {
			this.timer = setInterval(() => {
				this.index = (this.index + 1) % SPINNER_FRAMES.length;
				this.ping?.();
			}, SPINNER_MS);
		}
	}
	stop(): void {
		this.animate = false;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}
	dispose(): void {
		this.stop();
	}
	frame(): string {
		return SPINNER_FRAMES[this.index] ?? "";
	}
	/** Hook for re-rendering whenever the frame advances. */
	ping: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Footer (the bottom-right loader box)
// ---------------------------------------------------------------------------

const spinner = new Spinner();
let active = false; // agent is busy → spinner visible
let workspace = ""; // current working directory (captured at session start)

// Keep the tail of a path so it fits `width`, signalling truncation with "…".
function fitTail(text: string, width: number): string {
	if (visibleWidth(text) <= width) return text;
	let cut = text.length;
	while (cut > 1 && visibleWidth("…" + text.slice(-cut)) > width) cut--;
	return "…" + text.slice(-cut);
}

// Replace the home prefix with "~" for a shorter path.
const HOME = homedir();
function prettyPath(p: string): string {
	if (p === HOME) return "~";
	if (p.startsWith(HOME + "/")) return "~" + p.slice(HOME.length);
	return p;
}

type Freestyle = any;

function makeFooter(theme: Freestyle) {
	return {
		invalidate() {},
		dispose() {
			spinner.dispose();
		},
		render(width: number): string[] {
			// Bottom-right column: spinner above, workspace pinned to the very
			// bottom line (path is always the last row).
			const avail = Math.max(4, width - 4);
			const spinnerStr = active ? spinner.frame() : " ";
			const pathStr = fitTail(prettyPath(workspace), avail);

			const spinnerLine = " ".repeat(Math.max(0, width - visibleWidth(spinnerStr))) + theme.fg("accent", spinnerStr);
			const pathLine = " ".repeat(Math.max(0, width - visibleWidth(pathStr))) + theme.fg("dim", pathStr);

			// Two fixed lines → stable layout regardless of activity. Path is last.
			return [spinnerLine, pathLine];
		},
	};
}

// ---------------------------------------------------------------------------
// Tool output hiding (reuse Pi's real execution; blank the renderers)
// ---------------------------------------------------------------------------

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
	// We replace the built-in working loader entirely with our own corner box, so
	// hide it to stop it appearing/disappearing (the source of the layout shift).
	const hideBuiltinLoader = (ctx: ExtensionContext) => {
		ctx.ui.setWorkingMessage(undefined);
		ctx.ui.setWorkingIndicator(undefined);
		ctx.ui.setWorkingVisible(false);
	};

	pi.on("session_start", async (_event, ctx) => {
		active = false;
		workspace = ctx.cwd;
		spinner.stop();
		hideBuiltinLoader(ctx);
		registerToolHiding(pi, ctx.cwd);
		ctx.ui.setFooter((tui, theme) => {
			// Capture the TUI so the spinner tick can re-render the footer.
			spinner.ping = () => tui.requestRender?.();
			return makeFooter(theme);
		});
	});

	const setBusy = (ctx: ExtensionContext, busy: boolean) => {
		if (active === busy) return;
		active = busy;
		if (busy) spinner.start();
		else spinner.stop();
		spinner.ping?.();
	};

	pi.on("before_agent_start", async (_event, ctx) => setBusy(ctx, true));
	pi.on("agent_settled", async (_event, ctx) => setBusy(ctx, false));
}
