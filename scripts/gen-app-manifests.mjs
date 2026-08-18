// Generates apps/<NN>-<slug>/app.json for every registry entry.
// Manifests DOCUMENT each system's connection; they do not vendor private source
// into this public repo (see CONNECTIONS.md "Migration note"). Re-run after
// editing the registry below. Plain Node, no dependencies.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Verified/inferred Supabase project per system number. Systems are NOT all on
// one project. Anything not listed here is null (not yet verified).
const KNOWN_PROJECT = {
  "01": "uhnrgujbdxhhmoxcjria", // inferred (shared hub DB)
  "15": "uhnrgujbdxhhmoxcjria", // inferred (shared hub DB)
  "02": "bieebmnmkffwbqlsfozh", // VERIFIED (igud-transcribe's own project)
};

// number, slug, repo, name, category, stage, live, schema, deploy, protected, note,
// [overrides] — optional 12th element, merged last. Use it only for a system whose
// deploy provenance has actually been MEASURED (see "18" below); the defaults in
// this table describe the public-repo baseline, not verified reality.
const R = [
  ["01","torah-platform","torah-platform","Torah Platform (HUB, +egod)","hub","live",true,"public","lovable",false,"Main hub; billing via Nedarim."],
  ["02","igud-transcribe","igud-transcribe","Igud Transcribe","transcription","beta",true,"public","vercel",false,"VERIFIED: Next.js 14 + OpenAI Whisper-1/GPT-4 on own project. MISSING token = OPENAI_API_KEY."],
  ["03","igud-ads","igud-ads","Igud Ads","advertising","live",true,null,"unknown",false,"Revenue system."],
  ["04","imud-torani","imud-torani","Imud Torani","torah","beta",true,null,"railway",false,"Known bug: X-Visitor-Id header."],
  ["05","financial-marketing-site","03-financial-marketing-site","Financial Marketing Site","finance","wip",false,null,"unknown",false,null],
  ["06","kupot-holim","kupot-holim","Kupot Holim","health","wip",false,null,"unknown",false,null],
  ["07","zol","zol","Zol","commerce","wip",false,null,"unknown",false,null],
  ["08","bkalut-app","bkalut-app","Bkalut App","commerce","protected",true,null,"unknown",true,"PROTECTED — do not touch."],
  ["09","bkalot-admin","bkalot-admin","Bkalot Admin","commerce","protected",true,null,"unknown",true,"PROTECTED — do not touch."],
  ["10","bkalot-rights","bkalot-rights","Bkalot Rights","rights","wip",false,null,"unknown",false,null],
  ["11","bkalut-marketing2","bkalut-marketing2","Bkalut Marketing 2","marketing","wip",false,null,"unknown",false,null],
  ["12","smel-ndln","smel-ndln","Smel Ndln","other","wip",false,null,"unknown",false,null],
  ["13","property-identity","property-identity","Property Identity","realestate","wip",false,null,"unknown",false,null],
  ["14","bsmachot-plus","bsmachot-plus","Bsmachot Plus","events","wip",false,null,"unknown",false,null],
  ["15","egod","egod","egod (HUB pair with 01)","hub","live",true,"public","lovable",false,"Born in Lovable; shares Supabase with torah-platform."],
  ["16","chatzor-connect","chatzor-connect","Chatzor Connect","other","wip",false,null,"unknown",false,null],
  ["17","chizukim-transcribe","chizukim-transcribe","Chizukim Transcribe","transcription","wip",false,null,"unknown",false,"Verify transcription token."],
  ["18","torah-editor-mvp","torah-editor-mvp","Torah Editor MVP","torah","live",true,null,"vercel",false,
    "Live at more30.com/orech. Deploy source MEASURED 18/08/2026, not assumed - see overrides.",
    { isDeployed: true, liveUrl: "https://more30.com/orech", vercelProject: "orech-more30",
      source: "vendored", deploySource: "apps/18-torah-editor-mvp",
      deployCommand: "vercel deploy --prod --yes --scope l023131500-ops-projects (from the app dir; never --prebuilt - it drops next.config.js basePath '/orech')",
      provenanceNote: "The 'repo' field is NOT the deploy path: all 16 orech-more30 deployments were created by the CLI with no git metadata. Proof this tree is the source: the string 'more30-auth', introduced by monorepo commit c32dd84, is present in the live /orech/documents chunk." }],
  ["19","igud-shiurim-portal","igud-shiurim-portal","Igud Shiurim Portal","torah","wip",false,null,"unknown",false,null],
  ["20","igud-portal","igud-portal","Igud Portal","torah","wip",false,null,"unknown",false,null],
  ["21","mthbram","mthbram","Mthbram","other","wip",false,null,"unknown",false,null],
  ["22","get-your-rights","get-your-rights","Get Your Rights","rights","wip",false,null,"unknown",false,null],
  ["23","haorech-torani","haorech-torani","Haorech Torani","torah","wip",false,null,"unknown",false,null],
  ["24","galilee-connect-hub","galilee-connect-hub","Galilee Connect Hub","other","wip",false,null,"unknown",false,null],
  ["25","mor1-main-site","mor1-main-site","Mor1 Main Site","marketing","wip",false,null,"unknown",false,null],
  ["26","modaot-studio","modaot-studio","Modaot Studio","advertising","wip",false,null,"unknown",false,null],
  ["27","bkalut-price","bkalut-price","Bkalut Price","commerce","wip",false,null,"unknown",false,null],
  ["28","kupot-health-funds","kupot-health-funds","Kupot Health Funds","health","wip",false,null,"unknown",false,null],
  ["29","bkalot-design","bkalot-design","Bkalot Design","marketing","wip",false,null,"unknown",false,null],
  ["30","zchuyotpro-crm","zchuyotpro-crm","ZchuyotPro CRM","crm","wip",false,null,"unknown",false,null],
  ["31","hebrew-bridge-crm","hebrew-bridge-crm","Hebrew Bridge CRM","crm","wip",false,null,"unknown",false,null],
];

for (const [number, slug, repo, name, category, stage, live, schema, deploy, prot, note, over] of R) {
  const dir = resolve(ROOT, "apps", `${number}-${slug}`);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    number, slug, name, category, stage, live,
    repo: `l023131500-ops/${repo}`,
    basePath: `/${number}`,
    supabase: { project: KNOWN_PROJECT[number] ?? null, schema },
    deployTarget: deploy,
    protected: prot,
    source: "not-vendored", // see CONNECTIONS.md — private source not copied into public repo yet
    note: note ?? undefined,
    ...(over ?? {}),
  };
  writeFileSync(resolve(dir, "app.json"), JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`Wrote ${R.length} app manifests.`);
