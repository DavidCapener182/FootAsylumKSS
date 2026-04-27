import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ScreenZoomNormalizer } from "@/components/layout/screen-zoom-normalizer"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KSS x Footasylum Audit Platform",
  description: "Secure audit, fire risk assessment and compliance tracking platform for KSS x Footasylum.",
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
  maximumScale: 1,
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
      <body className={inter.className} suppressHydrationWarning>
        <ScreenZoomNormalizer />
        {children}
      </body>
    </html>
  )
}
