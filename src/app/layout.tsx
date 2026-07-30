import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { MARKA } from '@/lib/brand'
import './globals.css'

// "latin-ext" alt kümesi ZORUNLU — Türkçe ğ/ş/ı/İ glifleri yalnızca orada.
// Sadece "latin" ile yazılar bozuk görünür.
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: MARKA.tamAd,
  description: 'Cari bakiye, gecikme ve tahsilat kontrol paneli',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${plexSans.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
