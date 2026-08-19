/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/modaot",
  assetPrefix: "/modaot",
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["sharp", "pdfkit", "openai"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bieebmnmkffwbqlsfozh.supabase.co" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
};
export default nextConfig;
