/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  // Allow dev origins for ngrok during local development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'cinamini.ngrok.app'
    ]
  })
}

export default nextConfig
