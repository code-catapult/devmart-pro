import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  transpilePackages: ['@repo/ui', '@repo/shared'],
}

export default nextConfig
