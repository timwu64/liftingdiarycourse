import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Project lives in OneDrive, which holds file locks during sync and
    // collides with Turbopack's LMDB-style filesystem cache writes
    // ("Another write batch or compaction is already active"). Turn it off
    // for dev; HMR speed is unaffected (in-memory cache still applies).
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
