import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("../../../apps/31-hebrew-bridge-crm/.env","utf8").split(/\r?\n/).filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,"")];}));
const r0 = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,"content-type":"application/json"},body:JSON.stringify({email:"test@more30.com",password:"More30Test2026"})});
const s = await r0.json();
const r = await fetch(`${env.SUPABASE_URL}/rest/v1/partner_assignments?select=id,treatment_status`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${s.access_token}`}});
console.log("assignments visible to test@more30.com:", r.status, await r.text());
