// Node's native TS support strips types but still enforces strict ESM
// resolution, which rejects the extensionless relative imports app code
// writes under `moduleResolution: "bundler"` (e.g. `from './http'` in
// apps/32-nadlan-berega/lib/geocode.ts). This hook retries a failed bare
// resolution with a `.ts` suffix so QA scripts can import real app modules
// unmodified instead of re-implementing their logic. Registered via
// `--import ./scripts/qa/_register-ts-loader.mjs`.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[a-z]+$/i.test(specifier) &&
      err?.code === 'ERR_MODULE_NOT_FOUND'
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
