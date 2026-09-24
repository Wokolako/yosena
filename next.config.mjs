import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Without this, Next walks up past the repo looking for a lockfile and warns
  // that it is ignoring one in the parent directory. Pinning the root also
  // keeps file tracing scoped to this project — uploads.ts writes to a path
  // built from an env var, which Turbopack cannot resolve statically and which
  // otherwise widens tracing to everything above us.
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
