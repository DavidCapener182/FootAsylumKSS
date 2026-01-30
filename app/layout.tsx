import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KSS x Footasylum Audit Platform",
  description: "KSS Internal - Incident Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/print.css" media="print" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}


