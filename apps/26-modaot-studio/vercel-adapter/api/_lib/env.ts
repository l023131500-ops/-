/**
 * Env normalisation — must be imported before anything that reads process.env
 * at module scope (server/ai.ts and server/branding.ts both capture their model
 * id in a top-level const, so a sanitiser that runs inside the handler is too
 * late: ESM/CJS evaluates every import first).
 *
 * Values written through a Windows shell pipe can carry a UTF-8 BOM. A BOM in
 * a key becomes an invalid HTTP header byte; a BOM in the model id produced a
 * live `not_found_error: model: claude-opus-5` from the Anthropic API.
 */
for (const k of [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_TEXT_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_IMAGE_MODEL",
  "GEMINI_TEXT_MODEL",
  "RECRAFT_API_KEY",
]) {
  const v = process.env[k];
  if (v) process.env[k] = v.replace(/^\uFEFF+/, "").trim();
}

export {};
