/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@react-pdf/renderer', 'pdf-parse', 'pdfjs-dist', 'puppeteer', '@sparticuz/chromium'],
  },
}

module.exports = nextConfig

