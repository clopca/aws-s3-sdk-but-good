import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@s3-good/core", "@s3-good/react", "@s3-good/shared"],
};

export default nextConfig;
