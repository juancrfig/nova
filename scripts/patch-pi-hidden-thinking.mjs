#!/usr/bin/env node
/**
 * Pi renderer patch (Nova) — minimal-terminal fixes to pi's installed, compiled
 * assistant-message renderer:
 *   1. removes the blank placeholder row drawn for hidden reasoning
 *      (hideThinkingBlock) — keeps thinking enabled + reasoning hidden,
 *      without an empty line;
 *   2. removes the leading blank line Pi puts above every assistant message, so
 *      replies start right at the top (no whitespace "appears" after your
 *      message). Horizontal spacing is instead provided by the outputPad setting.
 *
 * This is an ADMITTED exception to Nova's "never touch pi" rule: it edits pi's
 * installed, compiled renderer, so it is overwritten on the next pi update and
 * must be re-applied. Run it again (or after any `pi update`). Idempotent and
 * reversible.
 *
 * Usage:
 *   node scripts/patch-pi-hidden-thinking.mjs [--apply|--revert]
 *
 * Locates the pi package as:
 *   1. $PI_ROOT, else
 *   2. $(npm root -g)/@earendil-works/pi-coding-agent, else
 *   3. the known global install path.
 *
 * The patch is line-based and indentation-agnostic (preserves each line's
 * leading whitespace), so it survives pi re-bundling that re-indents code.
 *
 * Note: pi must be RESTARTED (not just /reload) for the patch to take effect,
 * because the renderer module is already loaded in a running process.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const MARKER = "[Nova hidden-thinking patch]";

// The original line that adds the hidden-thinking placeholder Text.
const ADD_PLACEHOLDER = 'this.contentContainer.addChild(new Text(theme.italic(theme.fg("thinkingText", this.hiddenThinkingLabel)), this.outputPad, 0));';
// The placeholder line replaced by this comment (keeps the surrounding if {}).
const PLACEHOLDER_COMMENT = `// ${MARKER} placeholder removed so no blank line appears for hidden reasoning.`;

const SPACER_IF = "if (hasVisibleContentAfter) {";
const SPACER_IF_PATCHED = "if (!this.hideThinkingBlock && hasVisibleContentAfter) {";

// The leading blank line Pi puts above every assistant message (`Spacer(1)`
// guarded by `if (hasVisibleContent)`). Removed so replies start at the top and
// nothing "appears" as whitespace when the text streams in.
const MARKER_LEAD = "[Nova lead-spacer patch]";
const LEAD_OPENER = /^\s*if \(hasVisibleContent\) \{\s*$/;
const LEAD_ALLOC = /^\s*this\.contentContainer\.addChild\(new Spacer\(1\)\);/;
const LEAD_CLOSE = /^\s*}\s*$/;

/** Remove the leading blank-line block above assistant message content. */
function removeLeadSpacer(buf) {
	const lines = buf.split("\n");
	const out = [];
	let hit = 0;
	for (let i = 0; i < lines.length; i++) {
		if (!LEAD_OPENER.test(lines[i])) {
			out.push(lines[i]);
			continue;
		}
		const inside = lines[i + 1] ?? "";
		const closing = lines[i + 2] ?? "";
		if (LEAD_ALLOC.test(inside) && LEAD_CLOSE.test(closing)) {
			const indent = /^(\s*)/.exec(lines[i])[1];
			out.push(`${indent}// ${MARKER_LEAD} leading blank line above assistant messages removed.`);
			i += 2;
			hit = 1;
		} else {
			out.push(lines[i]);
		}
	}
	return { content: out.join("\n"), hit };
}

/** Restore the leading blank-line block (revert). */
function restoreLeadSpacer(buf) {
	const lines = buf.split("\n");
	let hit = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(MARKER_LEAD)) {
			const indent = /^(\s*)/.exec(lines[i])[1];
			lines[i] = [
				`${indent}if (hasVisibleContent) {`,
				`${indent}\tthis.contentContainer.addChild(new Spacer(1));`,
				`${indent}}`,
			].join("\n");
			hit = 1;
		}
	}
	return { content: lines.join("\n"), hit };
}

/** Replace any whole line containing `needle`, preserving its indentation. */
function lineReplace(buf, needle, replacementText) {
	const lines = buf.split("\n");
	let hit = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(needle)) {
			const m = /^([ \t]*)/.exec(lines[i]);
			lines[i] = `${m[1]}${replacementText}`;
			hit++;
		}
	}
	return { content: lines.join("\n"), hit };
}

function findPiRoot() {
	const candidates = [];
	if (process.env.PI_ROOT) candidates.push(process.env.PI_ROOT);
	try {
		candidates.push(join(execSync("npm root -g", { encoding: "utf8" }).trim(), "@earendil-works/pi-coding-agent"));
	} catch {
		/* no npm */
	}
	candidates.push(
		"/home/juanes/.local/share/mise/installs/node/26.2.0/lib/node_modules/@earendil-works/pi-coding-agent",
	);
	const probe = (root) =>
		root && existsSync(join(root, "dist", "modes", "interactive", "components", "assistant-message.js"));
	for (const c of candidates) {
		if (probe(c)) return c;
	}
	return null;
}

function applyPatch(buf) {
	let out = buf;
	let changed = false;

	// Reasoning placeholder (line replaces) — skip if already applied.
	if (!out.includes(MARKER)) {
		const r1 = lineReplace(out, ADD_PLACEHOLDER, PLACEHOLDER_COMMENT);
		out = r1.content;
		const r2 = lineReplace(out, SPACER_IF, SPACER_IF_PATCHED);
		out = r2.content;
		if (r1.hit !== 1 || r2.hit !== 1) {
			return { ok: false, changed: false, message: `expected 1 match each, got placeholder=${r1.hit}, spacer=${r2.hit} — pi version changed? Refusing to guess.` };
		}
		changed = true;
	}

	// Leading blank line above assistant messages — skip if already applied.
	if (!out.includes(MARKER_LEAD)) {
		const r3 = removeLeadSpacer(out);
		out = r3.content;
		if (r3.hit !== 1) {
			return { ok: false, changed: false, message: `expected 1 lead-spacer block, got ${r3.hit} — pi version changed? Refusing to guess.` };
		}
		changed = true;
	}

	if (!changed) return { ok: true, changed: false, message: "already patched" };
	return { ok: true, changed: true, message: "patched", content: out };
}

function revertPatch(buf) {
	let out = buf;
	let hitAny = false;

	if (out.includes(MARKER)) {
		const r1 = lineReplace(out, PLACEHOLDER_COMMENT, ADD_PLACEHOLDER);
		out = r1.content;
		const r2 = lineReplace(out, SPACER_IF_PATCHED, SPACER_IF);
		out = r2.content;
		if (r1.hit !== 1 || r2.hit !== 1) {
			return { ok: false, changed: false, message: `expected 1 match each, got placeholder=${r1.hit}, spacer=${r2.hit} — patched state changed? Refusing to guess.` };
		}
		hitAny = true;
	}

	if (out.includes(MARKER_LEAD)) {
		const r3 = restoreLeadSpacer(out);
		out = r3.content;
		if (r3.hit !== 1) {
			return { ok: false, changed: false, message: `expected 1 lead-spacer block, got ${r3.hit} — patched state changed? Refusing to guess.` };
		}
		hitAny = true;
	}

	if (!hitAny) return { ok: true, changed: false, message: "not patched (nothing to revert)" };
	return { ok: true, changed: true, message: "reverted", content: out };
}

const mode = process.argv[2] === "--revert" ? "revert" : "apply";
const root = findPiRoot();
if (!root) {
	console.error("Could not locate the pi package. Set $PI_ROOT to its install root.");
	process.exit(1);
}

const assistantFile = join(root, "dist", "modes", "interactive", "components", "assistant-message.js");
console.log(`pi root: ${root}`);

let ok = true;
let changedAny = false;

// --- assistant-message.js (reasoning placeholder + internal leading blank) ---
{
	const buf = readFileSync(assistantFile, "utf8");
	const r = mode === "apply" ? applyPatch(buf) : revertPatch(buf);
	if (!r.ok) {
		console.error(`✗ assistant-message.js: ${r.message}`);
		ok = false;
	} else {
		if (r.changed) {
			writeFileSync(assistantFile, r.content);
			changedAny = true;
		}
		console.log(`${r.changed ? "✓" : "="} assistant-message.js: ${r.message}`);
	}
}

if (!ok) process.exit(1);
if (changedAny) console.log("  Restart pi (not just /reload) for the change to take effect.");
