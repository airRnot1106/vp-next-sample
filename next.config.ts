import type { NextConfig } from 'next';

// @keep-sorted
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  cacheLife: {
    infinite: {
      stale: Number.MAX_VALUE,
      revalidate: Number.MAX_VALUE,
      expire: Number.MAX_VALUE,
    },
  },
  // @keep-sorted
  logging: {
    browserToTerminal: true,
    fetches: {
      fullUrl: true,
    },
  },
  reactCompiler: true,
  typedRoutes: true,
};

export default nextConfig;
