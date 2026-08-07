/**
 * Marka sabitleri tek yerden. Sistem başka bir firmaya uyarlanacaksa
 * yalnızca bu dosya değişir.
 */
export const MARKA = {
  firma: 'Doğal Katkı',
  /** Kısa modül adı — marka adının yanında tekrar etmesin diye ayrı durur. */
  modul: 'Tahsilat Kontrol',
  sistem: 'Doğal Katkı Tahsilat Kontrol',
  tamAd: 'Doğal Katkı Tahsilat Kontrol',
  kisaKod: 'DK',
} as const

/** Demo girişi — ekranda da yazılı olduğu için tek yerden okunur. */
export const DEMO_GIRIS = {
  kullaniciAdi: 'demo',
  sifre: 'dogal2026',
} as const

/**
 * Satış temsilcisi uyarı ekranının adı. Ekran adı tek yerde durur — menü, sayfa
 * başlığı ve PDF hep buradan okur.
 *
 * Sistemin adı "Doğal Katkı Tahsilat Kontrol" olduğu için bu ekran sistem adını taşımaz; menüde
 * ne yaptığıyla anılır.
 */
export const UYARI_EKRANI = {
  ad: 'Temsilci Uyarıları',
  kisaAd: 'Uyarı',
  yol: '/temsilci-uyarilari',
} as const

/**
 * Demo'nun referans tarihi. Seed verisi bu tarihe göre üretildi; gecikme
 * hesaplarının veriyle tutarlı kalması için gerçek `new Date()` değil bu
 * sabit kullanılır. Canlı sisteme geçildiğinde `new Date()` ile değiştirilir.
 */
export const BUGUN = new Date('2026-07-30T00:00:00.000Z')
