# 31 gesher — the document vault now keeps the document (issue #173)

**12/08/2026 · §8ב / §1ג · gesher-more30 · production**

## The bug, in one line

A client uploaded a file, the screen said *"עדיין לא הועלו מסמכים"*, and nothing was
wrong anywhere you would look: storage returned 200, the serverFn returned
`ok:true` with the full record, there was no toast, no console error, and a full
reload changed nothing.

## Why nothing looked wrong

`client.functions.ts:131` wrote to `client_profiles.uploaded_documents` as the
client. `client_profiles` has RLS with `"Clients read own client profile"` for
SELECT only — there is no policy letting a client UPDATE their own row. RLS
filtered the UPDATE to **zero rows**, and an UPDATE that matches zero rows is not
an error in PostgREST. So `if (upErr) throw` never fired and the function
reported success on a write that never happened.

The `GRANT UPDATE (uploaded_documents)` in migration `20260605003212` is what
makes this read as fine in a code review. A GRANT is not an RLS policy.

## The fix

The right table already existed and was unused: migration `20260610185015`
created `public.documents` with `doc_all FOR ALL USING/WITH CHECK
owner_client_id = auth.uid()` — which the client *does* pass — and even
backfilled the old jsonb into it ("kept for one release"). Three functions were
left behind on the old column. The admin side (`client-profile.functions.ts:187`)
had already moved.

All three now use `public.documents` (`path`→`storage_path`,
`uploaded_at`→`created_at`), and **both write paths carry a zero-row guard**:
`.select()` on the insert and on the delete, and a Hebrew error when zero rows
come back. An RLS-blocked write cannot report success here again.

`removeUploadedDocument` also had its order swapped — it deletes the row first
and the storage object second. Before, it removed the file and *then* failed to
update the record.

## Verified

Typecheck clean, build ok, deployed to production
(`dpl_CmAEDD6Ed7JJU8AUmZ2tEjmfsHGz`, READY, from source), then walked in a
browser on more30.com as `test@more30.com`:

| # | step | result |
|---|------|--------|
| 01 | vault before | empty |
| 02 | upload a 199-byte PDF | row appears with name, timestamp, "במתנה לבדיקה" |
| 03 | **full reload** | still there — this is the step that failed before |
| 04 | status page | "הועלו 1 מסמכים" |
| 05 | delete + confirm + reload | empty again, deletion persisted |

## Left open, on purpose

- `public.documents` was not queried directly — project `ygaqqnuyfnumezxxmtbh` is
  not reachable over MCP from here and there is no `SUPABASE_ACCESS_TOKEN`. The
  evidence is the browser and the shipped code.
- The admin screen was not opened to see the same document from the other side.
- The orphan file from 11/08
  (`client-documents/1458bb7c-.../df064ea8-...-sample.pdf`) has no `documents`
  row, so it is still stuck in storage with no screen that shows or deletes it.
- `/gesher/client/consents` is still an empty "בקרוב" screen.

Test mode throughout: no user created, no message sent, no charge.
