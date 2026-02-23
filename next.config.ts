import type { NextConfig } from "next";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

const commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  || (() => {
    try { return execSync("git rev-parse --short=7 HEAD").toString().trim(); }
    catch { return "unknown"; }
  })();

const commitDate = (() => {
  try { return execSync("git log -1 --format=%cI").toString().trim(); }
  catch { return new Date().toISOString(); }
})();

const environment = process.env.VERCEL_GIT_COMMIT_REF === "main"
  ? "production"
  : process.env.VERCEL_GIT_COMMIT_REF === "staging"
    ? "staging"
    : "develop";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_COMMIT_DATE: commitDate,
    NEXT_PUBLIC_ENVIRONMENT: environment,
  },
};

export default nextConfig;
