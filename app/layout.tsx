import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import "./workspace.css"
import { ServiceWorkerRegister } from '@/components/offline/service-worker-register'
import { WebVitalsReporter } from '@/components/observability/web-vitals-reporter'

const inter = Inter({ subsets: ["latin"] })
const display = localFont({
  src: [
    { path: "./fonts/barlow-condensed-semibold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/barlow-condensed-bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "KSS x Footasylum Audit & Fire Safety Platform",
  description: "Audit, fire risk assessment, action tracking and compliance reporting platform.",
  applicationName: "Footasylum KSS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Footasylum KSS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b132b",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${display.variable}`} suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
        <WebVitalsReporter />
      </body>
    </html>
  )
}
