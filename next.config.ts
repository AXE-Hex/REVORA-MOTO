import type { NextConfig } from 'next';
import path from 'node:path';

const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageUrl = storageOrigin ? new URL(storageOrigin) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: path.resolve(process.cwd()),
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...(storageUrl
        ? [
            {
              protocol: storageUrl.protocol.slice(0, -1) as 'http' | 'https',
              hostname: storageUrl.hostname,
              port: storageUrl.port,
              pathname: '/storage/v1/object/public/catalog-media/**',
            },
          ]
        : []),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '9mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
