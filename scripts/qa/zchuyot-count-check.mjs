/**
 * Independent recount of what StatsSection publishes.
 *
 * StatsSection derives its three numbers from `mainCategories` at render time,
 * which is the point — they cannot go stale. But "derived from the data" is
 * only worth something if the data itself holds what the label claims, so this
 * imports the module directly and counts it a second way, without going through
 * the component.
 *
 *   node scripts/qa/zchuyot-count-check.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const APP = join(here, '..', '..', 'apps', '22-get-your-rights');
const DATA = join(APP, 'src', 'data', 'rightsData.ts');

// The declaration is a plain array literal, so evaluating it needs only two
// edits: drop the type annotation, and neutralise the `icon:` values, which
// reference lucide components imported at the top of the file. Nothing counted
// here reads `icon`. Bringing in a transpiler for one file would be more moving
// parts than the check itself.
const src = await readFile(DATA, 'utf8');
const start = src.indexOf('export const mainCategories');
if (start < 0) throw new Error('mainCategories not found in rightsData.ts');
const body = src
  .slice(start)
  .replace('export const mainCategories: MainCategory[] =', 'const mainCategories =')
  .replace(/icon:\s*[A-Z][A-Za-z0-9_]*/g, 'icon: null');

const { mainCategories } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(body + '\nexport { mainCategories };').toString('base64')
);

const categories = mainCategories.length;
const topics = mainCategories.reduce((n, c) => n + c.topics.length, 0);
const questions = mainCategories.reduce(
  (n, c) => n + c.topics.reduce((m, t) => m + t.questions.length, 0),
  0,
);

// Every topic must actually carry questions, otherwise the third number counts
// a field that is only sometimes there and the average reader would still read
// it as "every topic has a questionnaire".
const withoutQuestions = mainCategories.flatMap((c) =>
  c.topics.filter((t) => !Array.isArray(t.questions) || t.questions.length === 0).map((t) => t.id),
);
const duplicateIds = (() => {
  const seen = new Set();
  const dup = [];
  for (const c of mainCategories) for (const t of c.topics) {
    if (seen.has(t.id)) dup.push(t.id);
    seen.add(t.id);
  }
  return dup;
})();

console.log(JSON.stringify({ categories, topics, questions, withoutQuestions, duplicateIds }, null, 2));

if (withoutQuestions.length) {
  console.error(`\n${withoutQuestions.length} topics have no questions — the questionnaire count overstates coverage.`);
  process.exitCode = 1;
}
if (duplicateIds.length) {
  console.error(`\nduplicate topic ids: ${duplicateIds.join(', ')} — the topic count double-counts.`);
  process.exitCode = 1;
}
