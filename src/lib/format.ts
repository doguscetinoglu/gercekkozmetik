/**
 * Biçimlendirme yardımcıları.
 * Elle format kurulmaz; her şey Intl üzerinden geçer — böylece binlik ayracı,
 * ondalık virgülü ve ay isimleri Türkçe yerel ayarına uyar.
 */

const tlBiciml = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

const sayiBicimi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const tarihUzun = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const saatBicimi = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/** ₺1.234.567 — kuruş gösterilmez, finans panelinde gürültü yapar. */
export const tl = (n: number) => tlBiciml.format(n)

/** Kısa gösterim: ₺4,3 M / ₺318 B — KPI rakamlarında yer kazandırır. */
export function tlKisa(n: number): string {
  const mutlak = Math.abs(n)
  if (mutlak >= 1_000_000) return `₺${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} M`
  if (mutlak >= 1_000) return `₺${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} B`
  return tl(n)
}

export const sayi = (n: number) => sayiBicimi.format(n)
export const yuzde = (n: number) => `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`

export const tarih = (d: Date | string) => tarihBicimi.format(new Date(d))
export const tarihAcik = (d: Date | string) => tarihUzun.format(new Date(d))
export const saat = (d: Date | string) => saatBicimi.format(new Date(d))

/** ISO gün anahtarı (YYYY-MM-DD) — gün bazlı gruplamalarda kullanılır. */
export const gunAnahtari = (d: Date) => d.toISOString().slice(0, 10)

/** Prisma Decimal → number. Client bileşenlerine Decimal geçirilemez. */
export const ondalik = (d: unknown): number => Number(d)

const KANAL_ADLARI: Record<string, string> = {
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-posta',
  CALL: 'Telefon',
}

const DURUM_ADLARI: Record<string, string> = {
  GONDERILDI: 'Gönderildi',
  ILETILDI: 'İletildi',
  OKUNDU: 'Okundu',
  BASARISIZ: 'Başarısız',
  CEVAPLANDI: 'Cevaplandı',
  CEVAPSIZ: 'Cevapsız',
}

const YONTEM_ADLARI: Record<string, string> = {
  HAVALE: 'Havale/EFT',
  KREDI_KARTI: 'Kredi Kartı',
  CEK: 'Çek',
  NAKIT: 'Nakit',
  SENET: 'Senet',
}

const SEGMENT_ADLARI: Record<string, string> = {
  BAYI: 'Bayi',
  ZINCIR: 'Zincir Mağaza',
  ECZANE: 'Eczane',
  ONLINE: 'Online Satış',
  IHRACAT: 'İhracat',
}

const FATURA_DURUM_ADLARI: Record<string, string> = {
  ACIK: 'Açık',
  KISMI: 'Kısmi Ödendi',
  ODENDI: 'Ödendi',
}

export const kanalAdi = (k: string) => KANAL_ADLARI[k] ?? k
export const durumAdi = (d: string) => DURUM_ADLARI[d] ?? d
export const yontemAdi = (y: string) => YONTEM_ADLARI[y] ?? y
export const segmentAdi = (s: string) => SEGMENT_ADLARI[s] ?? s
export const faturaDurumAdi = (d: string) => FATURA_DURUM_ADLARI[d] ?? d
