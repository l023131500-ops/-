/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/tamlul",
  assetPrefix: "/tamlul",
  images: {
    unoptimized: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb"
    }
  }
};
export default nextConfig;
