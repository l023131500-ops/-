/**
 * §12 in the spec ("construction sites/plans near the property", premium/VIP)
 * needs to place each nearby plan on the map — not just list it. XPLAN returns
 * each plan as a polygon (`geometry.rings`), not a point, so something has to
 * pick one representative location from it.
 *
 * The trap: averaging the vertices is NOT the area centroid for an
 * asymmetric polygon. A polygon with one far-flung vertex pulls a vertex
 * average toward itself far more than the actual shape justifies — which
 * would place the marker somewhere the plan barely touches. `polygonCentroid`
 * in lib/geometry.ts uses the shoelace-based area centroid instead, and this
 * is what would have caught a regression to "just average the points": the
 * asymmetric-quad case below has a vertex average of (2, 2.75) but a true
 * area centroid of about (1.45, 3.36) — different enough that a wrong
 * implementation cannot pass by accident.
 *
 * Runs the real module (lib/geometry.ts), not a reimplementation.
 *
 *   node scripts/qa/nearby-plans-geometry.mjs
 */
import { polygonCentroid, planarDistanceM } from '../../apps/32-nadlan-berega/lib/geometry.ts';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};
const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

console.log('=== known shapes with a known centroid ===');

// Axis-aligned square: centroid is trivially the vertex average too — this
// only proves the sign/scale of the formula are not obviously broken.
const square = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]];
const cSquare = polygonCentroid(square);
ok('square 10x10 at origin -> centroid (5,5)',
  !!cSquare && close(cSquare.x, 5) && close(cSquare.y, 5), JSON.stringify(cSquare));

// Offset rectangle, to check translation is not silently reset to origin.
const rect = [[[100, 200], [110, 200], [110, 205], [100, 205], [100, 200]]];
const cRect = polygonCentroid(rect);
ok('rectangle offset from origin -> centroid (105, 202.5)',
  !!cRect && close(cRect.x, 105) && close(cRect.y, 202.5), JSON.stringify(cRect));

console.log('\n=== the case a vertex-average would get wrong ===');

// Asymmetric quad: one vertex (0,10) sits far from the other three. A vertex
// average is (2, 2.75); the real area centroid, worked out by hand via the
// shoelace formula, is (192/132, 444/132) = (1.4545..., 3.3636...).
const quad = [[[0, 0], [4, 0], [4, 1], [0, 10], [0, 0]]];
const cQuad = polygonCentroid(quad);
const vertexAvg = { x: (0 + 4 + 4 + 0) / 4, y: (0 + 0 + 1 + 10) / 4 };
ok('asymmetric quad -> true area centroid (1.4545, 3.3636), not vertex average',
  !!cQuad && close(cQuad.x, 192 / 132) && close(cQuad.y, 444 / 132),
  JSON.stringify(cQuad));
ok('asymmetric quad -> centroid differs from the naive vertex average',
  !!cQuad && (Math.abs(cQuad.x - vertexAvg.x) > 0.3 || Math.abs(cQuad.y - vertexAvg.y) > 0.3),
  `centroid ${JSON.stringify(cQuad)} vs vertex-average ${JSON.stringify(vertexAvg)}`);

console.log('\n=== refusals: no invented location ===');

ok('no rings at all -> null, not a guessed point', polygonCentroid(null) === null);
ok('empty rings array -> null', polygonCentroid([]) === null);
ok('degenerate ring (a line, zero area) -> null, not a fabricated centroid',
  polygonCentroid([[[0, 0], [5, 0], [0, 0]]]) === null);

// Multipart polygon (two disjoint rings, e.g. a plan split by a road): the
// larger ring should win, since it represents the plan's main body.
const multipart = [
  [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]], // small ring, area 4, centroid (1,1)
  [[100, 100], [110, 100], [110, 110], [100, 110], [100, 100]], // big ring, area 100, centroid (105,105)
];
const cMulti = polygonCentroid(multipart);
ok('multipart geometry -> picks the larger ring, not the first one',
  !!cMulti && close(cMulti.x, 105) && close(cMulti.y, 105), JSON.stringify(cMulti));

console.log('\n=== distance ===');

ok('planar distance between the two centroids above is exact (Pythagoras)',
  close(planarDistanceM({ x: 0, y: 0 }, { x: 3, y: 4 }), 5));
ok('zero distance to self', planarDistanceM({ x: 42, y: 7 }, { x: 42, y: 7 }) === 0);

console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  '\nWhat this does not cover: a live XPLAN radius query, or whether the plans\n' +
    'it returns near the four spec addresses look right on a map. That needs a\n' +
    'network call and is the next step — this only locks down the centroid math\n' +
    'the next step will depend on.',
);
process.exit(fail ? 1 : 0);
