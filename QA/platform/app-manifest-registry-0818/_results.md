# app.json generator — apps/16 promoted, generator no longer a loaded gun

**Date:** 18/08/2026 · **Branch:** fix/nadlan-a11y · **System:** platform (manifest tooling)

## The problem

`scripts/gen-app-manifests.mjs` rewrites **all 31** `apps/<NN>-<slug>/app.json` files from a
registry table in its own source. `apps/16-chatzor-connect/app.json` was **hand-maintained** and
far richer than registry row 16, so any run of the generator would have silently discarded:

| field | hand-written value | registry row 16 (before) |
|---|---|---|
| `name` | `Chatzor Connect — מחוברים` | `Chatzor Connect` |
| `description` | full Hebrew description | *(absent)* |
| `category` | `community` | `other` |
| `repo` | `l023131500-ops/-` | `l023131500-ops/chatzor-connect` |
| `unifies` | `["24-galilee-connect-hub"]` | *(absent)* |
| `supabase.project` | `uhnrgujbdxhhmoxcjria` | `null` |
| `supabase.schema` | `chatzor` | `null` |
| `source` | `in-progress` | `not-vendored` |

The previous step (1d87765) documented this with a warning comment. A comment does not stop the
next run — this step removes the hazard itself.

## What changed

1. **`KNOWN_PROJECT["16"]`** = `uhnrgujbdxhhmoxcjria`.
2. **Registry row 16** now carries every hand-written field: `repo` slot `"-"` (the generator
   prefixes `l023131500-ops/`), `category` `community`, `schema` `chatzor`, and an overrides
   object for `description` / `unifies` / `source`.
3. **Optional-key positioning.** `description` and `unifies` are declared in the manifest literal
   (before `category`, and after `basePath`) rather than only arriving via the overrides spread,
   so they land in the same position as the hand-written file. Rows without them are unaffected —
   `JSON.stringify` drops the absent keys.
4. **`apps/16-chatzor-connect/app.json`** re-wrapped its one-line `unifies` array to the form
   `JSON.stringify(..., 2)` emits. **JSON-identical** — see the deep-equal check below.

## Verification — `scripts/qa/verify-app-manifests.mjs` (new, added by this step)

Copies the generator into a throwaway temp root, runs it **there**, and diffs the bytes back
against the committed files. It never writes into the real tree.

```
$ node scripts/qa/verify-app-manifests.mjs
EOL-ONLY 01-torah-platform — content identical, line endings differ
...
EOL-ONLY 16-chatzor-connect — content identical, line endings differ
OK       17-chizukim-transcribe
OK       18-torah-editor-mvp
...
16 Hebrew round-trip: OK

Compared 31 manifests, 0 differing.
EXIT=0
```

- **31/31 reproduce.** Before the fix the same harness reported `DIFFERS 16-chatzor-connect`, so
  it distinguishes a clobbered manifest from a safe one rather than passing everything.
- **`EOL-ONLY` is the pre-existing baseline,** not a regression: the committed files are CRLF and
  the generator emits LF. Rows 17/18 read `OK` (byte-identical) because they were written by the
  previous step's temp-root round-trip. The harness reports the two classes separately so a real
  content difference can never hide inside a line-ending difference.
- **Hebrew round-trip OK** — no `U+FFFD` in the generated row 16. This is the documented cp1255
  re-encode trap on generator string literals (which is why the previous step stripped em-dashes
  from its own additions); here the em-dash in `Chatzor Connect — מחוברים` and the full Hebrew
  description survive intact, so they could be kept exactly as the hand-written file had them.
- **Key order matches exactly:**
  `number,slug,name,description,category,stage,live,repo,basePath,unifies,supabase,deployTarget,protected,source`
  on both the generated and the committed file.
- **The app.json diff is array re-wrapping only** — every key deep-equal (the harness's per-key
  comparison printed no field lines when it flagged the difference, i.e. the parsed objects were
  already equal and only the serialisation differed).

## Deliberately not done

**Did not run the generator against the real tree.** It is now proven safe for *content*, but it
emits LF and the 31 committed files are CRLF, so a real run would rewrite all 31 files as a
whitespace-only churn. The temp-root harness proves the same property without touching anything.

## Zero regression

Tooling and metadata only. No app code, no deploy, no schema change, no UI touched. No manifest
lost a field — `apps/16` gained none and lost none, and rows 01–15 and 17–31 are byte-for-byte
what they were. Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
Test mode only; no real send, no real charge.
