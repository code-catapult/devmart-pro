import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  transpilePackages: ['@repo/ui', '@repo/shared'],
}

export default nextConfig
