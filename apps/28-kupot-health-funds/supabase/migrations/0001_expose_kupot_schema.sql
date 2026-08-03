-- חושף את סכמת kupot דרך PostgREST ומעניק הרשאות לתפקידי anon/authenticated.
--
-- הקשר: פרויקט ה-Supabase (csjekrvukbdznetsrodj) משותף עם פרויקטים נוספים.
-- אם פרויקט אחר מאפס את pgrst.db_schemas, סכמת kupot נופלת מהרשימה
-- ונקודת הקצה /api/hf/topics מחזירה 502 (בעוד ש-meta מקובץ מקומי ממשיך לעבוד).
-- יש לשמור תמיד את kupot ברשימה החשופה.

ALTER ROLE authenticator
  SET pgrst.db_schemas = 'public, storage, graphql_public, nadlan, kupot';

GRANT USAGE ON SCHEMA kupot TO anon, authenticated, service_role;
GRANT SELECT ON kupot.hf_topics        TO anon, authenticated;
GRANT INSERT ON kupot.hf_switch_leads  TO anon, authenticated;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
