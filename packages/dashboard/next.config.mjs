/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rcf/core"],
  experimental: { serverComponentsExternalPackages: ["@rcf/analytics", "better-sqlite3"] },
};
export default nextConfig;
