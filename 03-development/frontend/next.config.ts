import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 禁用 Turbopack 以避免与 Console Ninja 冲突
  experimental: {
    turbo: undefined as any,
  },
};

export default nextConfig;
