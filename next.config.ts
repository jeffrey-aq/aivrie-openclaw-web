import type { NextConfig } from "next";
import { execSync } from "child_process";

const commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  || (() => {
    try { return execSync("git rev-parse --short=7 HEAD").toString().trim(); }
    catch { return "unknown"; }
  })();

const environment = process.env.VERCEL_GIT_COMMIT_REF === "main"
  ? "production"
  : process.env.VERCEL_GIT_COMMIT_REF === "staging"
    ? "staging"
    : "develop";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: "0.0.1",
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_ENVIRONMENT: environment,
  },
};

export default nextConfig;
