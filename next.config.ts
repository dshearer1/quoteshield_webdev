import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use .next (default). If you hit EPERM, close Cursor/other locks, delete .next, then try again.
  distDir: ".next",
  // Don't bundle pdf-parse/pdfjs-dist; use Node require() so the CJS build is loaded (ESM build causes Object.defineProperty on non-object in server bundle).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
