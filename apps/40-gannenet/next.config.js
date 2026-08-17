/** @type {import('next').NextConfig} */
// APP_BASE_PATH lets this app be served under a monorepo subpath (e.g. "/40" on
// more.30.com). Empty = standalone at root (default; current Railway behavior).
const base = process.env.APP_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  ...(base ? { basePath: base } : {}),
  // Exposed to the client so hardcoded internal URLs (fetch, file links, the
  // service worker) can be prefixed consistently.
  env: { NEXT_PUBLIC_APP_BASE_PATH: base },
};

module.exports = nextConfig;
