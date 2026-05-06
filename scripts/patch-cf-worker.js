#!/usr/bin/env node
/**
 * Post-build patch for Cloudflare Workers compatibility.
 *
 * Lodash uses `Function("return this")()` and `new Function(body)()` internally,
 * which are blocked by Cloudflare Workers' Content Security Policy.
 * This script patches the generated handler.mjs to replace those calls
 * with Workers-compatible alternatives.
 *
 * Usage: node scripts/patch-cf-worker.js
 */

const fs = require("fs");
const path = require("path");

const handlerPath = path.join(
  __dirname,
  "..",
  ".open-next",
  "server-functions",
  "default",
  "handler.mjs"
);

if (!fs.existsSync(handlerPath)) {
  console.error(`Handler not found at ${handlerPath}`);
  console.error("Make sure to run 'npm run build:cf' first.");
  process.exit(1);
}

let content = fs.readFileSync(handlerPath, "utf-8");

let patches = 0;

// Patch 1: Lodash's globalThis fallback
// var root = ... || Function("return this")()
const p1 = 'Function("return this")()';
const before1 = (content.match(new RegExp(p1.replace(/"/g, '\\"'), "g")) || []).length;
content = content.split(p1).join("globalThis");
patches += before1 - (content.match(new RegExp(p1.replace(/"/g, '\\"'), "g")) || []).length;

// Patch 2: Lodash template compilation — Function.apply(null, args).apply(null, args2)
const re2 = /Function\.apply\(null,[^)]*\)\.apply\(null,[^)]*\)/g;
const matches2 = content.match(re2) || [];
content = content.replace(re2, '(function(){return function(){return""}})()');
patches += matches2.length;

// Patch 3: Lodash template compilation — Function(varName)()
const re3 = /Function\([a-zA-Z0-9_]+\)\(\)/g;
const matches3 = content.match(re3) || [];
content = content.replace(re3, '(function(){return function(){return""}})()');
patches += matches3.length;

fs.writeFileSync(handlerPath, content, "utf-8");

console.log(`Patched ${patches} incompatible Function() calls in handler.mjs`);
console.log("Build is now compatible with Cloudflare Workers.");
