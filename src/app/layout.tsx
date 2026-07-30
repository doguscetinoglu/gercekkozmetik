import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { MARKA } from '@/lib/brand'
import './globals.css'

// "latin-ext" alt kümesi ZORUNLU — Türkçe ğ/ş/ı/İ glifleri yalnızca orada.
// Sadece "latin" ile yazılar bozuk görünür.
//
// Inter, SF Pro'ya en yakın web fontu ve YEDEK olarak duruyor: Apple
// cihazlarda --font-sans zincirinin başındaki -apple-system gerçek SF Pro'yu
// getirir, Windows/Android'de Inter devralır.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
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
    <html lang="tr" className={`${inter.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
