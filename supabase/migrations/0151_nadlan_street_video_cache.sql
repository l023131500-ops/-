-- more30 · 32 nadlan-berega — street-video cache (core.build_tasks id=2)
-- ============================================================================
-- P2 FEATURE item 2 ("Street View frames to MP4, cached per property") was
-- deferred round after round (see apps/32-nadlan-berega/CLAUDE.md) because
-- there is no `ffmpeg` binary and no `node_modules` in this build sandbox,
-- and Vercel serverless functions are not a friendly home for a native
-- encoder binary either. Rather than defer again, the encoding moved to
-- where a real encoder already exists for free: the viewer's own browser
-- (`canvas.captureStream()` + `MediaRecorder`, see StreetWalkPanel.tsx).
--
-- This migration adds only the *cache* half of "cached per property": once
-- one VIP viewer's browser has produced a clip for a given property, it is
-- uploaded here and reused by every later viewer — matching the spec's
-- caching requirement without inventing a server-side ffmpeg dependency
-- that could not be verified in this environment anyway.
-- ============================================================================

create table if not exists nadlan.street_video_cache (
  id bigint generated always as identity primary key,
  slug text not null unique,
  storage_path text not null,
  mime_type text not null,
  frame_count int not null,
  created_at timestamptz not null default now()
);

create index if not exists street_video_cache_slug_idx on nadlan.street_video_cache (slug);

alter table nadlan.street_video_cache enable row level security;

-- No policy — matches `saved_reports`/`saved_report_versions` (0143): all
-- access goes through the server's service-role client (lib/store.ts), never
-- the anon key. RLS-enabled-with-no-policy blocks every other role by design.
grant select, insert, update, delete, references, trigger, truncate
  on nadlan.street_video_cache
  to service_role;

-- Public-read bucket: the clip is a re-encoding of the same public Street
-- View frames already served (unauthenticated) via /api/image on this same
-- property — no PII, same posture as `nadlan-pro-media` (0106). Writes only
-- ever happen through the server route with the service key, so no
-- storage.objects policy is needed for anon/authenticated roles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nadlan-street-video', 'nadlan-street-video', true, 15728640,
        array['video/webm', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
