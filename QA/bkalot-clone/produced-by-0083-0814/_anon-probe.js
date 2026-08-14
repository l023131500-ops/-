// ה-revoke של 0083 אינו טקס: drop+create מחק את ה-ACL, ובלעדיו כל מחזיק מפתח
// anon היה מפיק מסמך על כל פנייה במערכת ומקבל בתשובה שם, טלפון ומייל של פונה
// אמיתי. נמדד מעל HTTP עם מפתח anon, בשתי החתימות — עם ארגומנט שני ובלעדיו.
const RPC = "https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/bkalot_clone_render";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

async function call(label, body) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify(body),
  });
  // סטטוס האמת יושב בגוף: NetFree מחזיר 400 על שגיאות Supabase.
  console.log(label, res.status, (await res.text()).slice(0, 300));
}

(async () => {
  await call("one_arg ", { p: { case_id: "200" } });
  await call("two_args", { p: { case_id: "200" }, p_admin_id: 55 });
})();
