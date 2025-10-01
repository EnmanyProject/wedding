import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wedding App - 웨딩 매칭 앱',
  description: 'A&B Meeting and Wedding Info App with Photo-based Quiz System',
  keywords: ['wedding', 'dating', 'matching', 'quiz', 'photo'],
  authors: [{ name: 'Wedding App Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/images/icon_ios(600).png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/icon_ios(600).png" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div id="app-root" className="app-container">
          {children}
        </div>
        <div id="modal-root"></div>
        <div id="toast-root"></div>
      </body>
    </html>
  )
}