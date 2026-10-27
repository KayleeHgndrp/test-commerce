import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // pdfkit reads its own font metrics from disk, so keep it out of the bundle.
  serverExternalPackages: ["pdfkit"],
  // The PDF fonts are read at runtime; make sure they ship with server code.
  outputFileTracingIncludes: { "/**": ["./assets/fonts/**"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
