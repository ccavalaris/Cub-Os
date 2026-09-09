import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app sits in a subdirectory of a repo that contains another app with
  // its own lockfile. Without this, Next infers the repo root as the workspace
  // and traces the wrong file set when building for deployment.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
