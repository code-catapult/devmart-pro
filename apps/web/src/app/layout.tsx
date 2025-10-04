import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { TRPCProvider } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DevMart Pro - E-commerce Learning Platform',
  description:
    'Professional e-commerce platform built with Next.js, TypeScript, and modern web technologies',
  keywords: ['e-commerce', 'nextjs', 'typescript', 'shopping', 'online store'],
  authors: [{ name: 'DevMart Pro Team' }],
  creator: 'DevMart Pro',
  metadataBase: new URL('https://devmart-pro.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://devmart-pro.com',
    siteName: 'DevMart Pro',
    title: 'DevMart Pro - E-commerce Learning Platform',
    description:
      'Professional e-commerce platform built with Next.js, TypeScript, and modern web technologies',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'DevMart Pro - E-commerce Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@devmartpro',
    creator: '@devmartpro',
    title: 'DevMart Pro - E-commerce Learning Platform',
    description:
      'Professional e-commerce platform built with Next.js, TypeScript, and modern web technologies',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  )
}
