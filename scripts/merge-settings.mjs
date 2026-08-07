#!/usr/bin/env node
/**
 * Merge defaults into a Pi settings file without clobbering user values.
 *
 * Usage: node merge-settings.mjs <settingsPath> <defaultsPath>
 *
 * Reads the JSON at <defaultsPath> and adds each key to <settingsPath> only if
 * that key does not already exist. Never removes, reorders, or overwrites a key
 * the user already set, and it creates the settings file if absent.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , settingsPath, defaultsPath] = process.argv;

if (!settingsPath || !defaultsPath) {
	console.error("usage: merge-settings.mjs <settingsPath> <defaultsPath>");
	process.exit(1);
}

const defaults = JSON.parse(readFileSync(defaultsPath, "utf8"));

let settings = {};
try {
	settings = JSON.parse(readFileSync(settingsPath, "utf8"));
} catch (err) {
	if (err.code !== "ENOENT") {
		console.warn(`  (ignoring unparseable settings at ${settingsPath}: ${err.message})`);
	}
}

const added = [];
for (const [key, value] of Object.entries(defaults)) {
	if (!(key in settings)) {
		settings[key] = value;
		added.push(key);
	}
}

mkdirSync(dirname(settingsPath), { recursive: true });
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

if (added.length) {
	console.log(`  + added: ${added.join(", ")}`);
} else {
	console.log("  = up to date (no new keys to add)");
}
