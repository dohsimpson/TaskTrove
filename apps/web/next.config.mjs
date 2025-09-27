import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // unoptimized: true,
  },
  transpilePackages: ["jotai-devtools"],
  output: "standalone",
  experimental: {
    nodeMiddleware: true, // Enable Node.js middleware
  }
}

export default withBundleAnalyzer(nextConfig)
