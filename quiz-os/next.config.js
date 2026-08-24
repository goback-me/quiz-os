/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Quiz pages are meant to be embedded on ANY third-party client site via embed.js —
        // explicitly allow framing here so a platform-level default (e.g. a reverse proxy adding
        // X-Frame-Options: SAMEORIGIN) can't silently break every embed.
        source: '/q/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
