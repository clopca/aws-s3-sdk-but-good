import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["s3-good", "@s3-good/react", "@s3-good/browser"],
};

export default nextConfig;
