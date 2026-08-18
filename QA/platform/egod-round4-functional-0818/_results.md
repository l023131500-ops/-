# 15 egod — round-4 functional pass (2026-08-18)

System: איגוד מגידי השיעורים (egod), apps/15-egod, mounted at https://more30.com/egod.

## Login
Shared auth pill (floating bottom control) already reads "לקוח" (customer logged in) on
/egod/find-lesson — same shared-session pattern as torah/tamlul/modaot/imud/briut/bkalot/smel/smachot.
Home page (/egod) itself shows the app's own nav with a separate "התחברות"/"הצטרף כמגיד שיעור"
pair (this app has its own magid-shiur login, distinct from the shared customer session), but the
shared customer pill is present and correctly logged-in across the mount.

## Core action
"מצא שיעור" (find a lesson) at /egod/find-lesson: search form with area/topic/day filters.
Submitted with all fields empty (search-all): returned "נמצאו 13 שיעורים" (13 lessons found),
matching exactly the home page's own "13 שיעורים פעילים" stat tile. Results are real rows, not
placeholders — real rabbi names (הרב משה לוי, הרב יעקב כהן), real organization (ארגון תורת חיים),
real cities/neighborhoods (בני ברק רמת אלחנן, ירושלים גאולה, תל אביב מרכז), real lesson topics
(דף היומי, חושן משפט, פרשת השבוע, עין יעקב, תניא, גמרא מסכת ברכות), real times and days.

## Network trace
GET https://hkkkynyoigzlttpynoeo.supabase.co/rest/v1/lessons?select=*,profiles!inner(full_name,city,neighborhood)&is_active=eq.true
  -> 200 OK (the real search backend, a project distinct from the shared more30 auth project)
POST https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/more30_join_app -> 200 OK
  (shared customer-session join call, same pattern as other apps' shared auth pill)

## Verdict
No bug found, no code change, no deploy needed — clears the round-4 bar (login + core action +
real data + deployed 200). Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) —
hkkkynyoigzlttpynoeo is this app's own Supabase project, reached only via its own public
find-lesson search request.

Evidence: egod-find-lesson-results.png (full-page screenshot of the 13-result search).

Next in round-4 ROUTES order: chatzor (16).
