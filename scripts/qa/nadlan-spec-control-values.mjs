// NADLAN_SPEC §6 states what the report for "הבעל שם טוב 9, רחובות" MUST reflect:
// a haredi population, a building that is only a few years old, and many recent
// sales there. Presence of the fields is not the claim — the VALUES are. This reads
// them off the live VIP report and prints them for eyeballing against §6.
//
//   node scripts/qa/nadlan-spec-control-values.mjs

const CASES = [
  { q: 'הבעל שם טוב 9 רחובות', expect: 'אוכלוסייה חרדית · בניין חדש · הרבה עסקאות אחרונות' },
  { q: 'הדקל 22 חצור הגלילית', expect: 'כל השכבות מלאות ומדויקות' },
];

for (const c of CASES) {
  const url = `https://more30.com/nadlan/api/report?q=${encodeURIComponent(c.q)}&tier=vip&cachebust=vals0818`;
  const j = await (await fetch(url, { headers: { accept: 'application/json' } })).json();

  console.log(`\n=== ${c.q}  (§6 מצפה: ${c.expect})`);
  console.log(`כותרת          : ${j.title?.headline ?? 'לא זמין'}`);
  console.log(`אוכלוסייה      : ${j.background?.population?.headline ?? 'לא זמין'}`);
  const bd = j.background?.population?.breakdown;
  if (bd) console.log(`  פילוח        : ${JSON.stringify(bd).slice(0, 200)}`);
  console.log(`אופי בנייה     : ${j.background?.buildingCharacter?.headline ?? 'לא זמין'}`);
  console.log(`גיל בניין      : ${j.buildingAge?.headline ?? 'לא זמין (null)'}`);
  if (j.buildingAge) {
    console.log(`  שנת בנייה    : ${j.buildingAge.buildYear} · גיל ${j.buildingAge.ageYears} · isNew=${j.buildingAge.isNew} · מקור ${j.buildingAge.basis}`);
    console.log(`  מכירות בבניין: ${j.buildingAge.homeSalesCount} (${j.buildingAge.firstHomeSaleYear}–${j.buildingAge.lastHomeSaleYear})`);
  }
  console.log(`עסקאות שנמכרו  : ${j.soldDeals?.length ?? 0} · בבניין ${j.building?.dealsInBuilding ?? 0}`);
  console.log(`צילום בניין    : available=${j.streetView?.available} precise=${j.streetView?.precise} date=${j.streetView?.date} aimReason=${j.streetView?.aimReason ?? '-'}`);
  console.log(`הערכת שווי     : ${j.valuation?.notEnoughData ? 'אין מספיק נתונים — ' + (j.valuation?.regional ? 'הוצג אזורי' : 'לא זמין') : `${j.valuation?.low}–${j.valuation?.high} (חציון למ״ר ${j.valuation?.medianPerSqm}, ודאות ${j.valuation?.certainty})`}`);
  console.log(`אזהרות         : ${(j.warnings ?? []).join(' | ') || '-'}`);
}
