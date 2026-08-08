#!/usr/bin/env node
/**
 * Pi hidden-thinking patch — removes the blank placeholder row that Pi draws
 * for hidden reasoning (hideThinkingBlock). Keeps thinking enabled and
 * reasoning hidden, without the empty line.
 *
 * This is an ADMITTED exception to Nova's "never touch pi" rule: it edits pi's
 * installed, compiled renderer, so it is overwritten on the next pi update and
 * must be re-applied. Run it again (or after any `pi update`).
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
	if (buf.includes(MARKER)) return { ok: true, changed: false, message: "already patched" };
	let out = buf;
	const r1 = lineReplace(out, ADD_PLACEHOLDER, PLACEHOLDER_COMMENT);
	out = r1.content;
	const r2 = lineReplace(out, SPACER_IF, SPACER_IF_PATCHED);
	out = r2.content;
	if (r1.hit !== 1 || r2.hit !== 1) {
		return { ok: false, changed: false, message: `expected 1 match each, got placeholder=${r1.hit}, spacer=${r2.hit} — pi version changed? Refusing to guess.` };
	}
	return { ok: true, changed: true, message: "patched", content: out };
}

function revertPatch(buf) {
	if (!buf.includes(MARKER)) return { ok: true, changed: false, message: "not patched (nothing to revert)" };
	let out = buf;
	const r1 = lineReplace(out, PLACEHOLDER_COMMENT, ADD_PLACEHOLDER);
	out = r1.content;
	const r2 = lineReplace(out, SPACER_IF_PATCHED, SPACER_IF);
	out = r2.content;
	if (r1.hit !== 1 || r2.hit !== 1) {
		return { ok: false, changed: false, message: `expected 1 match each, got placeholder=${r1.hit}, spacer=${r2.hit} — patched state changed? Refusing to guess.` };
	}
	return { ok: true, changed: true, message: "reverted", content: out };
}

const mode = process.argv[2] === "--revert" ? "revert" : "apply";
const root = findPiRoot();
if (!root) {
	console.error("Could not locate the pi package. Set $PI_ROOT to its install root.");
	process.exit(1);
}
const file = join(root, "dist", "modes", "interactive", "components", "assistant-message.js");
console.log(`pi root: ${root}`);
console.log(`target:  ${file}`);

const original = readFileSync(file, "utf8");
const result = mode === "apply" ? applyPatch(original) : revertPatch(original);

if (!result.ok) {
	console.error(`✗ ${result.message}`);
	process.exit(1);
}
if (result.changed) writeFileSync(file, result.content);
console.log(`✓ ${result.message}`);
if (result.changed) console.log("  Restart pi (not just /reload) for the change to take effect.");
