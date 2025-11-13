import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ServiceWorkerRegistration } from "@/components/service-worker"
import "./globals.css"

export const metadata: Metadata = {
  title: "3rdEye - Visual Aid Assistant",
  description: "AI-powered visual assistance app for visually impaired users - Seeing beyond limits",
  generator: "v0.app",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#56066C",
  icons: {
    icon: "/thirdeye-logo.png",
    apple: "/thirdeye-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3rdEye",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "3rdEye",
    title: "3rdEye - Visual Aid Assistant",
    description: "AI-powered visual assistance app for visually impaired users - Seeing beyond limits",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
