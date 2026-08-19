// smel (12) · core.issues #158 — does the typed city constrain the address match?
//
// The report's numbers are computed for whatever locality the geocoder lands on.
// «יפו 30 ירושלים» landed on דרך יפו-ת"א 30 in תל אביב-יפו, so score, average
// price, yield and trend all described a different city. The banner shipped on
// 12/08 tells the customer that happened; this measures the match itself.
//
// Runs against the real govmap autocomplete endpoint — no fixtures. It imports
// the shipped geocodeAddress() from the edge function source, so what it proves
// is the code that would run, not a re-implementation of it.
//
//   node scripts/qa/smel-geocode-city.mjs
//
// Exit 0 = every case matched in the city that was typed.

import {
  geocodeAddress,
  resolveArea,
  resolveLocalityByName,
} from "../../apps/13-property-identity/smart-research/functions/nadlan-smart-research/geo.ts";

// Each case is street/number/city exactly as the three fields on more30.com/smel
// are filled in; Home.tsx joins them "street num city" before the call.
const CASES = [
  { street: "יפו", num: "30", city: "ירושלים", why: "#158's own case — יפו is a street in both cities" },
  { street: "דיזנגוף", num: "100", city: "תל אביב", why: "the control: already correct before the change" },
  { street: "הרצל", num: "10", city: "חיפה", why: "הרצל exists in dozens of cities" },
  { street: "ויצמן", num: "5", city: "באר שבע", why: "a city deal-info has no neighbourhood record for" },
  { street: "בן גוריון", num: "20", city: "רמת גן", why: "a name shared with a boulevard in תל אביב" },
];

function norm(s) {
  return String(s || "")
    .replace(/["'׳״]/g, "")
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Same one-sided rule the client uses in research.ts localityMismatch():
// containment either way is a match, so "תל אביב" vs "תל אביב-יפו" is not a miss.
function sameCity(typed, matched) {
  const a = norm(typed);
  const b = norm(matched);
  if (!a || !b) return null; // unknown, not a mismatch
  return a.includes(b) || b.includes(a);
}

const results = [];
let failed = 0;

for (const c of CASES) {
  const address = [c.street, c.num, c.city].join(" ");
  let geo = null;
  let error = null;
  try {
    geo = await geocodeAddress(address, c.city);
  } catch (e) {
    error = String(e);
  }
  const ok = geo ? sameCity(c.city, geo.cityName) : null;

  // The city on the pin is only half the claim. Every number in the report is
  // keyed by locality_code, so resolve it the same way engine.ts does —
  // deal-info first, city name as fallback — and check the code lands in the
  // city that was typed. A coordinate is worthless if the code beside it isn't.
  let area = null;
  let localityName = null;
  let localityCode = null;
  if (geo) {
    area = await resolveArea(geo.addressId).catch(() => null);
    localityCode = area?.settlementId ?? null;
    localityName = area?.settlementName ?? null;
    if (!localityCode && geo.cityName) {
      const loc = await resolveLocalityByName(geo.cityName).catch(() => null);
      if (loc) {
        localityCode = loc.localityCode;
        localityName = loc.localityName;
      }
    }
  }
  const localityOk = localityName ? sameCity(c.city, localityName) : null;
  const hasCoords = !!(geo && geo.lat && geo.lon);
  if (ok !== true || localityOk !== true || !hasCoords) failed++;

  results.push({
    typed: address,
    typed_city: c.city,
    why: c.why,
    matched_text: geo?.matchedText ?? null,
    matched_city: geo?.cityName ?? null,
    matched_street: geo?.streetName ?? null,
    address_id: geo?.addressId ?? null,
    lat: geo?.lat ?? null,
    lon: geo?.lon ?? null,
    has_coords: hasCoords,
    locality_code: localityCode,
    locality_name: localityName,
    locality_source: area?.settlementId ? "nadlan deal-info" : localityCode ? "cbs locality list (fallback)" : null,
    city_matches_typed: ok,
    locality_matches_typed: localityOk,
    error,
  });
  const pass = ok === true && localityOk === true && hasCoords;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${address}  ->  ${geo?.matchedText ?? error ?? "no match"}` +
      `  [city: ${geo?.cityName ?? "—"} · locality: ${localityName ?? "—"} (${localityCode ?? "—"}) · coords: ${hasCoords ? "yes" : "no"}]`,
  );
}

console.log(`\n${CASES.length - failed} passed · ${failed} failed`);
console.log(JSON.stringify({ measured_against: "https://www.govmap.gov.il/api/search-service/autocomplete", results }, null, 2));
process.exit(failed === 0 ? 0 : 1);
