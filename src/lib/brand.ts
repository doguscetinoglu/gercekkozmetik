/**
 * Marka sabitleri tek yerden. Sistem başka bir firmaya uyarlanacaksa
 * yalnızca bu dosya değişir.
 */
export const MARKA = {
  firma: 'Gerçek Kozmetik',
  sistem: 'Nakit & Tahsilat Kontrol Sistemi',
  tamAd: 'Gerçek Kozmetik — Nakit & Tahsilat Kontrol Sistemi',
  kisaKod: 'GK',
} as const

/**
 * Demo'nun referans tarihi. Seed verisi bu tarihe göre üretildi; gecikme
 * hesaplarının veriyle tutarlı kalması için gerçek `new Date()` değil bu
 * sabit kullanılır. Canlı sisteme geçildiğinde `new Date()` ile değiştirilir.
 */
export const BUGUN = new Date('2026-07-30T00:00:00.000Z')
