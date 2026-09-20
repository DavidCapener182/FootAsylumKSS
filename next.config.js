/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config, { webpack }) {
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.thisCompilation.tap('PreservePdfJsModules', (compilation) => {
          compilation.hooks.processAssets.tap({
            name: 'PreservePdfJsModules',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE - 1,
          }, () => {
            for (const asset of compilation.getAssets()) {
              // These native ESM assets are already minified upstream. Next 14's
              // script-mode asset minifier must not re-parse their import/export.
              if (/(?:^|\/)pdfjs-dist\/build\/pdf(?:\.worker)?\.min\.mjs$/.test(asset.info.sourceFilename || '')) {
                compilation.updateAsset(asset.name, asset.source, { minimized: true })
              }
            }
          })
        })
      },
    })
    return config
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/audit-studio/*": ["./docs/audit-studio/*.jpg", "./docs/audit-studio/safetyculture-introduction-v1.pdf"],
      '/api/audit-pdfs/*': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    },
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
