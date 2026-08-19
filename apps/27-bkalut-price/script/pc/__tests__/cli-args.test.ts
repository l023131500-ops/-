/**
 * Unit tests for the importer CLI helpers (script/pc/cli-args.ts):
 *  - parseArgs recognises --adapters / --adapter and the PC_ADAPTERS env var
 *  - parseAdapterList normalises (trim, lowercase, de-dupe, drop empties)
 *  - filterFeedsByAdapter keeps only feeds whose effective adapter matches,
 *    falling back to source_type when `adapter` is null (no filter = keep all)
 *
 * These guard the VPS-import path that runs ONLY the geo-blocked chains
 * (matrix/web/laibcatalog) via `npm run pc:import -- --adapters=...`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, parseAdapterList, filterFeedsByAdapter, effectiveAdapter } from "../cli-args.ts";

const noEnv = {} as NodeJS.ProcessEnv;

test("parseAdapterList normalises, de-dupes and drops empties", () => {
  assert.deepEqual(parseAdapterList("matrix,web,laibcatalog"), ["matrix", "web", "laibcatalog"]);
  assert.deepEqual(parseAdapterList("  Matrix , WEB ,, matrix "), ["matrix", "web"]);
  assert.equal(parseAdapterList(""), null);
  assert.equal(parseAdapterList(undefined), null);
  assert.equal(parseAdapterList(null), null);
});

test("parseArgs reads --adapters=... (comma-separated)", () => {
  const args = parseArgs(["--adapters=matrix,web,laibcatalog"], noEnv);
  assert.deepEqual(args.adapters, ["matrix", "web", "laibcatalog"]);
});

test("parseArgs accepts the singular --adapter alias", () => {
  const args = parseArgs(["--adapter=matrix"], noEnv);
  assert.deepEqual(args.adapters, ["matrix"]);
});

test("parseArgs falls back to the PC_ADAPTERS env var", () => {
  const args = parseArgs([], { PC_ADAPTERS: "web, matrix" } as NodeJS.ProcessEnv);
  assert.deepEqual(args.adapters, ["web", "matrix"]);
});

test("parseArgs has no adapter filter by default, and a bare --adapters is ignored", () => {
  assert.equal(parseArgs([], noEnv).adapters, null);
  assert.equal(parseArgs(["--adapters"], noEnv).adapters, null);
});

test("parseArgs still parses the existing flags alongside --adapters", () => {
  const args = parseArgs(["--dry-run", "--adapters=matrix", "--feed=12"], noEnv);
  assert.equal(args.dryRun, true);
  assert.equal(args.feedId, 12);
  assert.deepEqual(args.adapters, ["matrix"]);
});

test("effectiveAdapter prefers adapter, then source_type, then 'url'", () => {
  assert.equal(effectiveAdapter({ adapter: "matrix", source_type: "web" }), "matrix");
  assert.equal(effectiveAdapter({ adapter: null, source_type: "Cerberus" }), "cerberus");
  assert.equal(effectiveAdapter({ adapter: null, source_type: null }), "url");
});

test("filterFeedsByAdapter keeps only matching adapters", () => {
  const feeds = [
    { id: 1, adapter: "matrix", source_type: "matrix" },
    { id: 2, adapter: "web", source_type: "web" },
    { id: 3, adapter: "cerberus", source_type: "cerberus" },
    { id: 4, adapter: null, source_type: "laibcatalog" }, // falls back to source_type
    { id: 5, adapter: "shufersal", source_type: "shufersal" },
  ];
  const kept = filterFeedsByAdapter(feeds, ["matrix", "web", "laibcatalog"]);
  assert.deepEqual(kept.map((f) => f.id), [1, 2, 4]);
});

test("filterFeedsByAdapter is a no-op when the allow-list is null or empty (keep all)", () => {
  const feeds = [
    { id: 1, adapter: "matrix", source_type: "matrix" },
    { id: 2, adapter: "cerberus", source_type: "cerberus" },
  ];
  assert.equal(filterFeedsByAdapter(feeds, null).length, 2);
  assert.equal(filterFeedsByAdapter(feeds, []).length, 2);
});

test("filterFeedsByAdapter matching is case-insensitive", () => {
  const feeds = [{ id: 1, adapter: "Matrix", source_type: "Matrix" }];
  assert.equal(filterFeedsByAdapter(feeds, ["MATRIX"]).length, 1);
});
