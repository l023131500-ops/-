-- ============================================================================
-- seed-new-chains.sql
-- ----------------------------------------------------------------------------
-- Idempotent INSERTs of price-transparency feed sources for chains that are not
-- yet in pc_feed_sources. Source list: research/feeds_to_add.json (keys:
-- binaprojects_new_adapter, laibcatalog_new_adapter,
-- publishprice_direct_or_url_adapter, superpharm_multipage_web,
-- direct_web_special).
--
-- Each statement is guarded with WHERE NOT EXISTS on chain_id, so re-running the
-- file never inserts a duplicate (pc_feed_sources has no unique constraint on
-- chain_id, so ON CONFLICT cannot be used here).
--
-- active flag:
--   * binaprojects + matrix + web rows -> active=1 (adapters implemented; the
--     binaprojects adapter is live-proven, while matrix (matrixcatalog.co.il)
--     and web (נתיב החסד bare-IP) geo-block non-Israeli IPs, so they are
--     verified from the IL VPS). The laibcatalog adapter is also implemented and
--     available as an alternative for the matrix chains.
--   * publishprice / super-pharm / haziHinam / wolt -> active=0 (adapters not
--     yet implemented; rows are seeded so an admin can flip active=1 later).
-- verified=0 on every row: an operator confirms a real import before flipping.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- binaprojects portal (per-chain subdomain, MainIO_Hok.aspx JSON API).
-- Files download from `${origin}/Download/<filename>`.
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'שוק העיר', '7290058148776', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://shuk-hayir.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx). הורדה מ-/Download/<filename>. נבדק בשידור חי.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058148776');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'זול ובגדול', '7290058173198', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://zolvebegadol.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058173198');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'סופר ברקת', '7290875100001', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://superbareket.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290875100001');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'קינג סטור', '7290058108879', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://kingstore.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058108879');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'גוד פארם', '7290058197699', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://goodpharm.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058197699');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'מעיין 2000', '7290058159628', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://maayan2000.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058159628');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'שפע ברכת השם', '7290058134977', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://shefabirkathashem.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058134977');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'סופר ספיר', '7290058156016', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://supersapir.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058156016');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'סיטי מרקט קריית גת', '7290058288526', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://citymarketkiryatgat.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058288526');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'משנת יוסף', '5144744100001', 'binaprojects', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://ktshivuk.binaprojects.com/MainIO_Hok.aspx', 0, 1, 'פורטל binaprojects (JSON API ב-MainIO_Hok.aspx).', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '5144744100001');

-- ---------------------------------------------------------------------------
-- Matrix / Nibit portal — open ASP.NET listing at
-- http://matrixcatalog.co.il/NBCompetitionRegulations.aspx (adapter='matrix').
-- The page lists every chain's files; the adapter filters by chain_id and
-- downloads from /CompetitionRegulationsFiles/latest/<filename>. The portal
-- geo-blocks non-Israeli source IPs (TLS reset) — verified from the IL VPS.
-- The laibcatalog adapter (REST /webapi) remains implemented as an alternative:
-- if matrixcatalog is unreachable from the VPS, flip a row's adapter to
-- 'laibcatalog' and discovery_url to
-- 'https://laibcatalog.co.il/webapi/api/getfiles?edi=<chain_id>'.
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'ויקטורי', '7290696200003', 'matrix', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://matrixcatalog.co.il/NBCompetitionRegulations.aspx', 0, 1, 'פורטל Matrix/Nibit (NBCompetitionRegulations.aspx). סינון לפי chain_id, הורדה מ-/CompetitionRegulationsFiles/latest/<filename>. חוסם IP מחוץ לישראל — לאימות מה-VPS.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290696200003');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'מחסני השוק', '7290661400001', 'matrix', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://matrixcatalog.co.il/NBCompetitionRegulations.aspx', 0, 1, 'פורטל Matrix/Nibit (NBCompetitionRegulations.aspx). חוסם IP מחוץ לישראל — לאימות מה-VPS.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290661400001');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'ח. כהן', '7290455000004', 'matrix', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://matrixcatalog.co.il/NBCompetitionRegulations.aspx', 0, 1, 'פורטל Matrix/Nibit (NBCompetitionRegulations.aspx). חוסם IP מחוץ לישראל — לאימות מה-VPS.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290455000004');

-- ---------------------------------------------------------------------------
-- נתיב החסד (incl. ברכל) — publishes on its own bare-IP HTML index (generic
-- WebBase, not binaprojects and not Comex). adapter='web': GET the root, extract
-- .gz/.xml anchors, download from <base>/<href>. The host may be offline on
-- Shabbat/holidays. Verified from the IL VPS.
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'נתיב החסד', '7290058160839', 'web', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://141.226.203.152/', 0, 1, 'אתר שקיפות בכתובת IP (WebBase גנרי). GET לשורש, חילוץ עוגני .gz/.xml, הורדה מ-<base>/<href>. ייתכן מושבת בשבת/חג.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058160839');

-- ---------------------------------------------------------------------------
-- Idempotent re-point of the four large chains to the adapters implemented in
-- this change. INSERT ... WHERE NOT EXISTS never updates an already-seeded row,
-- so these UPDATEs migrate rows created by earlier seed runs (e.g. Victory on
-- the old 'laibcatalog' adapter, נתיב החסד mis-wired as 'binaprojects'). Safe to
-- re-run: they only touch these four chain_ids and are no-ops once applied.
-- ---------------------------------------------------------------------------
UPDATE pc_feed_sources
   SET adapter = 'matrix',
       discovery_url = 'http://matrixcatalog.co.il/NBCompetitionRegulations.aspx',
       updated_at = now()::text
 WHERE chain_id IN ('7290696200003', '7290661400001', '7290455000004')
   AND adapter IS DISTINCT FROM 'matrix';

UPDATE pc_feed_sources
   SET adapter = 'web',
       discovery_url = 'http://141.226.203.152/',
       updated_at = now()::text
 WHERE chain_id = '7290058160839'
   AND adapter IS DISTINCT FROM 'web';

-- ---------------------------------------------------------------------------
-- publishprice portal (Carrefour/Mega/Quik) — adapter NOT yet implemented.
-- Seeded inactive (active=0) so an admin can enable once an adapter exists.
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'מגה / קרפור / יינות ביתן', '7290055700007', 'publishprice', 'regulatory', 'gz', 'pricefull,promofull,stores', 'https://prices.carrefour.co.il/', 0, 0, 'פורטל publishprice. TODO: מתאם publishprice טרם מומש — מושבת עד למימוש.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290055700007');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'קוויק', '7291029710008', 'publishprice', 'regulatory', 'gz', 'pricefull,promofull,stores', 'https://prices.quik.co.il/', 0, 0, 'פורטל publishprice. TODO: מתאם publishprice טרם מומש — מושבת עד למימוש.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7291029710008');

-- ---------------------------------------------------------------------------
-- super-pharm — multi-page web portal. adapter='super-pharm' (NOT shufersal).
-- adapter NOT yet implemented. Seeded inactive (active=0).
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'סופר פארם', '7290172900007', 'super-pharm', 'regulatory', 'gz', 'pricefull,promofull,stores', 'http://prices.super-pharm.co.il/', 0, 0, 'פורטל ווב רב-עמודים. TODO: super-pharm דורש מתאם ייעודי משלו (לא shufersal) — טרם מומש, מושבת.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290172900007');

-- ---------------------------------------------------------------------------
-- direct_web_special — חצי חינם (haziHinam) ו-וולט (wolt): טיפול ייעודי נדרש.
-- adapters NOT yet implemented. Seeded inactive (active=0).
-- ---------------------------------------------------------------------------
INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'חצי חינם', '7290700100008', 'haziHinam', 'regulatory', 'gz', 'pricefull,promofull,stores', 'https://shop.hazi-hinam.co.il/Prices', 0, 0, 'אתר ווב ייעודי. TODO: haziHinam דורש טיפול מותאם — טרם מומש, מושבת.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290700100008');

INSERT INTO pc_feed_sources (chain_name, chain_id, adapter, source_kind, feed_format, feed_kinds, discovery_url, verified, active, notes, source_type, created_at, updated_at)
SELECT 'וולט', '7290058249350', 'wolt', 'regulatory', 'gz', 'pricefull,promofull,stores', 'https://wm-gateway.wolt.com/isr-prices/public/v1/index.html', 0, 0, 'שער Wolt ייעודי. TODO: wolt דורש טיפול מותאם — טרם מומש, מושבת.', 'adapter', now()::text, now()::text
WHERE NOT EXISTS (SELECT 1 FROM pc_feed_sources WHERE chain_id = '7290058249350');
