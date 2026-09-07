/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // This renderer reads only focus images. A dynamic public-file resolver
    // otherwise makes Next trace the entire public directory into its function.
    // These exclusions apply only to the newsletter PDF, never other PDFs/CDN assets.
    outputFileTracingExcludes: {
      '/api/reports/monthly-newsletter/pdf': [
        './public/!(newsletter-placeholders)/**/*',
        './public/*.*',
        './public/newsletter-placeholders/reminder-*',
      ],
    },
    serverComponentsExternalPackages: ['sharp', '@react-pdf/renderer', 'pdf-parse', 'pdfjs-dist', 'puppeteer', '@sparticuz/chromium'],
  },
}

module.exports = nextConfig
