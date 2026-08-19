# Is the deployed site bigger than its committed source? — 2026-08-10

The previous round (`7690819`) proved every import in the tree resolves to a
tracked file, and closed on a question it could not answer:

> `admin/` has 4 tracked sources — `App.tsx`, `main.tsx`, `theme.tsx`,
> `vite.config.ts`. That is a complete import graph with nothing dangling, so
> this check passes it, but "4 files is all the admin SPA is" is a claim this
> tool cannot make: an import scan only proves that what *is* committed hangs
> together. Whether the deployed control centre is larger than its committed
> source is a different question, and not one answered here.

It is not larger. **Production `/admin` is byte-for-byte what those files
build.** Both directions of the question are now closed for that tree.

## What settles it

An import scan reads the source and can only ever conclude things about the
source. The artifact is the other end of the pipe, and it cannot contain code
from a file that was not there: if the deployed control centre had a fifth
component, no build from three files could emit it. So — build from the tree
git has, fetch what the browser gets, compare bytes.

```
$ node scripts/qa/deployed-vs-committed.mjs
admin  https://more30.com/admin/
  built from 7690819 + env VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  index.html          identical
  identical  /admin/assets/index-CinF3ubK.js  404914 bytes  sha 8dbf28ed3703
```

404,914 bytes, sha256 `8dbf28ed3703…`, identical across all three of: the local
`admin/dist`, `admin/deploy/admin/assets/`, and the bytes served from
more30.com. `App.tsx` is 77 KB of the 401 KB bundle; the rest is React and
`@supabase/supabase-js`. All 24 files under `packages/` — the workspace deps the
bundle compiles in — are tracked, with no untracked or modified file among them.

## Two things that would have made the comparison lie

**The working tree is not the commit.** `vite build` reads disk, not HEAD. One
dirty tracked file, or one untracked source sitting next to a tracked one, and
the build consumes it — byte-identity then proves only that production was built
from the same uncommitted file. This is not hypothetical in this repo: it is
exactly the `/apps/**` gitignore trap the previous two rounds were about. So the
check refuses to run on a dirty subtree rather than reporting a pass. Verified
by dropping an untracked `.tsx` into `admin/src`:

```
admin  https://more30.com/admin/
  REFUSED — the working tree is not the commit:
    untracked admin/src/_scratch-probe.tsx
```

(exit 1; probe removed.) Modified and untracked are listed separately because
they mean different things — a local edit versus a file that was never added.

**Injected HTML is not our HTML.** The served page carries two `netfree.link`
script tags appended *after* `</html>` — the ISP proxy, not the deploy. A naive
string compare fails on them forever. Everything from the marker on is dropped
before comparing. The first attempt at this also failed for a second reason
worth naming: PowerShell's `Invoke-WebRequest -UseBasicParsing` hands back the
body decoded as ANSI, so all four Hebrew comment blocks in `index.html` came out
mojibake and the file "differed" in every line that had Hebrew in it. Read as
UTF-8 the two are 4552 characters and identical. The script uses `fetch` and
compares `Buffer`s.

## What byte-identity says about the env, which is not nothing

`.env.local` is untracked, and both of its keys are inlined into the bundle as
string literals — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` both appear
verbatim in the 401 KB of JS. Vercel builds from a clean clone with no
`.env.local` at all; it substitutes its own project env vars.

So the bundle matching is a statement about *two* things at once: the committed
source is complete, **and** the two local env values equal the ones production
was built with. That is why the run prints the key names it inlined. If those
ever drift, this check goes red and the source is the wrong place to look — the
finding would be env, not code. Values are never printed, only key names.

## Coverage, and what it is not

One target. `TARGETS` in the script is deliberately a list of sites whose live
URL is a plain static mount and whose build is a bare `vite build`, and only
`admin` has been verified to be both. The trees that most want this check are
under `apps/` — every source there enters git by hand — but each needs its own
build invocation and mount path, so they get added as they are confirmed, not
assumed. **25 of 26 sites are unchecked by this**, and a green run above says
nothing whatever about them.

It also says nothing about `_deploy/<project>/api/**`. Those are serverless
functions, not bundled assets — they never appear in an HTML reference, so
comparing the built page cannot reach them. Reaching them means invoking the
endpoint and reasoning about the response, which is a different check.
