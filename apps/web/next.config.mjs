import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // unoptimized: true,
  },
  transpilePackages: ["jotai-devtools"],
  output: "standalone",
  // Turbopack is the default in Next 16; keep config lean to avoid opt-outs.
}

export default withBundleAnalyzer(nextConfig)
