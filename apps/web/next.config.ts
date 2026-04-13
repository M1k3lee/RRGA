import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
};

export default nextConfig;
