# 01 torah-platform — what the multi-tenant migration left behind

The migration on 19/05/2026 (`20260519000001_core_tenants` … `_007`) reshaped this
database around tenants. The application was never brought along with it. This
file records exactly what is still mismatched, so the remaining work can be
picked up without rediscovering it.

**How it was measured.** `scratchpad/audit-queries.mjs` walks every
`supabase.from("…")` chain in `apps/01-torah-platform/src`, collects the column
names the chain mentions — in `.select/.eq/.order/.or/...` **and** in the object
passed to `.insert/.update/.upsert` — and checks them against
`information_schema` on `bieebmnmkffwbqlsfozh`.

A note on reading the numbers: the scan looks 700 characters ahead of each
`.from(`, so a filter belonging to the *next* query in the same function can be
attributed to the previous table. `lessons.lesson_id` and `participants.date` in
`portal/Attendance.tsx` are that kind of false positive — that file is fine.
Treat the list as leads to check, not as a defect count.

## Fixed in this pass (28/07)

Everything the public site touches. Verified in a real browser: 17 routes render
with no failing PostgREST call, and the contact form returns `POST 201 leads`.

| where | was | is |
|---|---|---|
| `public/LessonsDirectory` | `is_public`, `teacher_name`, `location`, `time`, `days_of_week[]` | `is_approved`, `rabbi_name`, `city`/`neighborhood`/`address`, `time_hhmm`, `day_of_week` (int) |
| `public/Home`, `public/HalachaDaily` | `halacha_daily.publish_date` | `date` |
| `public/Home` | `tips.tenant_id`, `tips.title` | shared table, `category` |
| `public/FindLesson` | `leads.type`, `leads.details` | `kind`, `message`, `raw_data` |
| `public/Contact` | `leads.type`, `leads.details` | `kind`, `message`, `raw_data` |
| `public/Kashrut` | `is_active` | `status = 'active'` |
| `public/Mikvaot` | `order("name")` | `title` |
| `public/Synagogues` | `is_active` | (column gone; filter dropped) |
| `shop/ShopCatalog` | `display_order`, `image_url`, `stock_quantity` | `sort_order`, `images[0]`, `stock` |
| `public/FindLesson`, `LessonsDirectory` | `lesson_topics.display_order`, `name_he` | `sort_order`, `name` |
| `components/ContactSection`, `components/Footer` | `contact_messages` (dropped) | `portal_messages` |
| `components/FloatingChatBot` | `seeker_leads`, `teacher_leads` (dropped) | `leads` + `kind` |
| `admin/Dashboard` | `profiles.user_id`, `payment_status = 'paid'` | `profiles.id`, `'captured'` |
| `admin/Messages`, `portal/PortalMessagesTab` | `portal_messages.teacher_id`, `portal_type`, `portal_id` | `to_user_id` |
| `portal/Forums` | `forum_categories.display_order` | `sort_order` |
| `portal/Profile`, `portal/Lessons`, `PortalSidebar` | `profiles.user_id`, `organization_name` | `profiles.id`, `display_name` |
| `portal/Lessons` | `lessons.teacher_id` | `rabbi_user_id` |
| `PublicPrayerTimes` | `synagogues.org_id`, `prayer_times.time` | `tenant_id`, `time_hhmm` |

`FloatingChatBot` also reported success on a failed save (`catch { /* silent */ }`
around the insert). It now reports the failure.

## Still open — needs a schema decision, not a rename

These are **not** typos. The migration dropped the per-rabbi portal model, and
about twenty screens are written against it. Renaming a column cannot fix them;
either the tables come back, or the screens are rebuilt on the tenant model, or
they are retired. That is a product decision.

**14 tables referenced that no longer exist:**
`rabbi_portals`, `org_portals`, `org_rabbis`, `synagogue_portals`,
`synagogue_full_access_requests`, `portal_photos`, `teacher_features`,
`teacher_forum_access`, `teacher_invites`, `teacher_leads`, `seeker_leads`,
`contact_messages`, `study_day_events`, `ivr_submissions`.

Note that `teacher_features`, `teacher_forum_access`, `teacher_invites` and
`portal_photos` all still exist in **15 egod** (`hkkkynyoigzlttpynoeo`). This is
the pre-migration schema; these screens were written for that database.

**Screens affected:** all of `pages/legacy/*` (routed under `/legacy/*`),
`admin/Teachers`, `admin/TeacherFeatures(+Dialog)`, `admin/MatchingGuru`,
`public/RabbiPublic`, `portal/PortalSettings`, `portal/PrayerTimes`,
`components/studyday/*`, `components/synagogue/*`, `components/admin/*`.

**Columns whose replacement is a judgement call**, not a rename — the concept
went away with the portal model: `profiles.is_approved`, `profiles.public_token`,
`profiles.available_for_matching`, `profiles.synagogue_id`, `lessons.status`,
`lessons.is_sent`, `synagogues.teacher_id`, `prayer_times.teacher_id`,
`leads.assigned_teacher_id`, `donations.status`, `tenants.payment_status`.

`lessons.status` deserves a specific note: several screens write
`status: "pending"` alongside `is_approved: false`. The approval flag survived
the migration and the status column did not, so the flag alone now carries the
meaning.

## Re-running the audit

    node scratchpad/audit-queries.mjs <src dir> <schema.json>

where `schema.json` is

    select table_name, string_agg(column_name, ',' order by column_name) as cols
    from information_schema.columns where table_schema='public' group by table_name;
