import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for the container runner (the bidproposal-app image).
  output: "standalone",
  // Pin the file-tracing root to the workspace root so the standalone layout is
  // deterministic (server.js lands at .next/standalone/portals/app/server.js).
  outputFileTracingRoot: join(here, "../.."),
  outputFileTracingIncludes: { "/api/products/\\[product\\]/contract": ["./contract/ruyin.product.yaml"] },
  // The workspace shared package ships TypeScript source; Next transpiles it.
  transpilePackages: ["@bidproposal/shared"],
  reactStrictMode: true,
};

export default nextConfig;
