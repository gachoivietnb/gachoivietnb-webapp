import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SITE_FULL_NAME, SITE_URL } from '@/lib/utils/constants'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: {
    default: SITE_FULL_NAME,
    template: `%s | ${SITE_FULL_NAME}`,
  },
  description:
    'Trang trại gà chọi thuần chủng Ninh Bình — gia phả minh bạch, tiêm phòng đầy đủ, cam kết chất lượng.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: SITE_FULL_NAME,
    locale: 'vi_VN',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1e40af',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
