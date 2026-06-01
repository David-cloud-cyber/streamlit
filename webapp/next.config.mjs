import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/streamlit",
        assetPrefix: "/streamlit/",
        images: {
          unoptimized: true
        }
      }
    : {})
};

export default nextConfig;
