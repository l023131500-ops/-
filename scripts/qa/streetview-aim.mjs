/**
 * Does the property photo point at the right building?
 *
 * more30-fixes-and-features.txt opens its property section with this, marked
 * critical: the Street View shot showed *the house across the road*. The camera
 * stood in the right place and faced the wrong way, and the rule attached to it
 * is absolute — if the correct building cannot be shown, say "accurate photo
 * not available" and show nothing, never a wrong photo.
 *
 * The fix is in lib/googlemaps.ts and it reads correctly. That is not the same
 * as being correct, and the spec asks for verification rather than a reading.
 * The failure mode is unusually easy to reintroduce: `bearingDeg` takes four
 * loose numbers, and swapping the pair — building→pano instead of pano→building
 * — compiles, type-checks, runs, and produces a photo of the far pavement every
 * single time. Nothing downstream would notice. So the direction is asserted
 * here against geometry that a person can check by eye.
 *
 * Runs the real module, not a copy of the formula. A test that reimplements the
 * thing it is testing passes even when the shipped code is wrong.
 *
 *   node scripts/qa/streetview-aim.mjs
 */
// From lib/aim.ts, not lib/googlemaps.ts. The geometry was moved into its own
// module precisely so it can be imported without dragging in the network, the
// API key and the environment — googlemaps.ts cannot even be loaded here.
import { bearingDeg, aimQuality } from '../../apps/32-nadlan-berega/lib/aim.ts';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};
const near = (a, b, tol = 2) => Math.abs(((a - b + 540) % 360) - 180) <= tol;

console.log('=== bearing points from the camera to the building ===');

// Cardinals from a fixed origin. If the arguments are ever swapped these all
// invert by 180°, which is exactly the reported symptom.
const [oLat, oLng] = [32.0853, 34.7818]; // Tel Aviv, arbitrary but real
ok('north  is   0°', near(bearingDeg(oLat, oLng, oLat + 0.01, oLng), 0),
   String(bearingDeg(oLat, oLng, oLat + 0.01, oLng)));
ok('east   is  90°', near(bearingDeg(oLat, oLng, oLat, oLng + 0.01), 90),
   String(bearingDeg(oLat, oLng, oLat, oLng + 0.01)));
ok('south  is 180°', near(bearingDeg(oLat, oLng, oLat - 0.01, oLng), 180),
   String(bearingDeg(oLat, oLng, oLat - 0.01, oLng)));
ok('west   is 270°', near(bearingDeg(oLat, oLng, oLat, oLng - 0.01), 270),
   String(bearingDeg(oLat, oLng, oLat, oLng - 0.01)));

// The actual scene: a street running east–west, the camera on the roadway, the
// building on the north side. The camera must look north. If it looks south it
// photographs whatever is opposite — the original bug, reproduced exactly.
const building = { lat: 32.0860, lng: 34.7818 };
const panoOnRoad = { lat: 32.0858, lng: 34.7818 }; // ~22 m south of it
const aim = aimQuality(
  { available: true, lat: panoOnRoad.lat, lng: panoOnRoad.lng, date: '2024-05' },
  building.lat, building.lng,
);
ok('a shot is allowed for a normal kerbside panorama', aim.ok, aim.reason);
ok('camera faces the building (north), not across the road',
   aim.ok && near(aim.heading, 0, 5), `heading ${aim.heading}`);
ok('distance is measured, not guessed',
   aim.ok && aim.panoMeters >= 15 && aim.panoMeters <= 30, `panoMeters ${aim.panoMeters}`);

console.log('\n=== when it cannot be aimed, it refuses ===');

// Each of these returned a photo before the fix, and each would have been a
// photo of something other than the property.
const noPano = aimQuality({ available: false, lat: null, lng: null, date: null }, 32.09, 34.78);
ok('no panorama at all -> refuses', !noPano.ok && !!noPano.reason, JSON.stringify(noPano));

const noPosition = aimQuality({ available: true, lat: null, lng: null, date: null }, 32.09, 34.78);
ok('panorama with no position -> refuses (cannot compute a bearing)',
   !noPosition.ok && !!noPosition.reason, JSON.stringify(noPosition));

const onTop = aimQuality(
  { available: true, lat: 32.0860, lng: 34.7818, date: null }, 32.08601, 34.78181);
ok('panorama sitting on the property -> refuses (bearing is noise)',
   !onTop.ok, `heading ${onTop.heading}, ${onTop.panoMeters} m`);

const tooFar = aimQuality(
  { available: true, lat: 32.0860, lng: 34.7818, date: null }, 32.0880, 34.7818);
ok('panorama ~220 m away -> refuses (building not identifiable)',
   !tooFar.ok, `${tooFar.panoMeters} m`);

// The refusal has to be usable by the page, not just truthy.
const reasons = [noPano, noPosition, onTop, tooFar];
ok('every refusal carries a reason in Hebrew for the customer',
   reasons.every((r) => typeof r.reason === 'string' && /[֐-׿]/.test(r.reason)),
   'a refusal without a reason renders as a blank space');

console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  '\nWhat this does not cover: whether Google returns the panorama we expect for\n' +
    'a given address. That needs a Maps key and a live call, and the four\n' +
    'addresses in the spec should be checked by eye once before release.',
);
process.exit(fail ? 1 : 0);
