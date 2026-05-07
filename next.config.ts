import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["lodash", "firebase", "firebase/app", "firebase/auth", "firebase/firestore"],
};

export default nextConfig;
