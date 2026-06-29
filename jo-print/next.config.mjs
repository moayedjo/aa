/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Keep heavy Node-only libs out of the webpack bundle; load them at runtime
  // from node_modules on the server (JO Study: PDF render + document parsing).
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', 'pdfjs-dist', 'mammoth'],
  },
  async headers() {
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : '*.supabase.co'

    const csp = [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts (strict-dynamic preferred but needs nonce in full implementation)
      "script-src 'self' 'unsafe-inline'",
      // Styles: self + inline (Tailwind generates inline styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + Supabase storage + data URIs
      `img-src 'self' data: https://${supabaseHost} https://lh3.googleusercontent.com`,
      // Connections: self + Supabase API + Supabase realtime
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
      // Frames: deny embedding
      "frame-ancestors 'none'",
      // Form submissions: self only
      "form-action 'self'",
      // Base URI: self only (prevents base-tag injection)
      "base-uri 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',   value: csp },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
export default nextConfig
