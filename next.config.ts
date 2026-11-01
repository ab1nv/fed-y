import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL ships native bindings; keep it outside the server bundle so Vercel
  // deploys resolve the right platform package at runtime.
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
};

export default nextConfig;
