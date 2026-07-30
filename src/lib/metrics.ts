/**
 * İş mantığının TEK kaynağı.
 *
 * Hem ekranlar hem PDF çıktıları buradaki fonksiyonları çağırır. Kural: rapor
 * mantığı asla bir bileşenin içine yazılmaz — yazılırsa panel ile PDF'in
 * rakamları zamanla ayrışır ve müşteri bunu ilk toplantıda yakalar.
 */

import { BUGUN } from './brand'

const GUN_MS = 86_400_000

/** Yalnızca ihtiyaç duyulan alanlar — Prisma sonucu da, seed verisi de uyar. */
export type FaturaBenzeri = {
  vadeTarihi: Date
  tutar: number
  odenenTutar: number
  durum: string
  kapanmaTarihi: Date | null
}

export type TahsilatBenzeri = {
  customerId: string
  odemeTarihi: Date
  tutar: number
}

export type BildirimBenzeri = {
  customerId: string
  kanal: string
  gonderimZamani: Date
  /** Gönderim anındaki gecikme günü; aralık bazlı etkinlik analizinde gerekir. */
  gonderimdekiGecikmeGunu?: number
}

export const gunFarki = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / GUN_MS)

/** Faturanın kapanmamış kısmı. Kısmi ödemeler düşülür. */
export const kalanBakiye = (f: FaturaBenzeri) => f.tutar - f.odenenTutar

/**
 * Ödenmemiş faturanın kaç gün gecikmede olduğu.
 * Vadesi gelmemiş fatura için 0 döner (negatif gün "gecikme" değildir).
 */
export function gecikmeGunu(f: FaturaBenzeri, tarih: Date = BUGUN): number {
  if (f.durum === 'ODENDI') return 0
  const gun = gunFarki(tarih, f.vadeTarihi)
  return gun > 0 ? gun : 0
}

/**
 * Ödenmiş faturanın KAÇ GÜN GECİKMEYLE kapandığı.
 * "Ne zaman ödedi" sorusunun niteliksel cevabı bu — negatif değer vadesinden
 * önce ödendiğini gösterir, o yüzden sıfıra kırpılmaz.
 */
export function odemeGecikmesi(f: FaturaBenzeri): number | null {
  if (!f.kapanmaTarihi) return null
  return gunFarki(f.kapanmaTarihi, f.vadeTarihi)
}

// ─────────────────────────── Yaşlandırma ───────────────────────────

export type KovaAnahtar = 'guncel' | 'g1_30' | 'g31_60' | 'g61_90' | 'g90plus'

export const KOVALAR: { anahtar: KovaAnahtar; etiket: string; sinif: string }[] = [
  { anahtar: 'guncel', etiket: 'Vadesi Gelmemiş', sinif: 'ok' },
  { anahtar: 'g1_30', etiket: '1-30 Gün', sinif: 'warn' },
  { anahtar: 'g31_60', etiket: '31-60 Gün', sinif: 'alert' },
  { anahtar: 'g61_90', etiket: '61-90 Gün', sinif: 'crit' },
  { anahtar: 'g90plus', etiket: '90+ Gün', sinif: 'crit' },
]

export function kovaBul(gecikme: number): KovaAnahtar {
  if (gecikme <= 0) return 'guncel'
  if (gecikme <= 30) return 'g1_30'
  if (gecikme <= 60) return 'g31_60'
  if (gecikme <= 90) return 'g61_90'
  return 'g90plus'
}

/** Gecikme gününe göre sinyal rengi sınıfı (tick / riskband ile paylaşılır). */
export function riskSinifi(gecikme: number): 'ok' | 'warn' | 'alert' | 'crit' {
  if (gecikme <= 0) return 'ok'
  if (gecikme <= 30) return 'warn'
  if (gecikme <= 60) return 'alert'
  return 'crit'
}

export type YaslandirmaSatiri = {
  anahtar: KovaAnahtar
  etiket: string
  sinif: string
  tutar: number
  adet: number
}

/** Açık faturaları yaşlandırma kovalarına dağıtır. */
export function yaslandirma(
  faturalar: FaturaBenzeri[],
  tarih: Date = BUGUN,
): YaslandirmaSatiri[] {
  const kovalar = new Map<KovaAnahtar, { tutar: number; adet: number }>(
    KOVALAR.map((k) => [k.anahtar, { tutar: 0, adet: 0 }]),
  )

  for (const f of faturalar) {
    if (f.durum === 'ODENDI') continue
    const hedef = kovalar.get(kovaBul(gecikmeGunu(f, tarih)))!
    hedef.tutar += kalanBakiye(f)
    hedef.adet += 1
  }

  return KOVALAR.map((k) => ({ ...k, ...kovalar.get(k.anahtar)! }))
}

/**
 * Vadesi geçen bakiyenin ORTALAMA GÜNÜ — tutarla ağırlıklı.
 *
 * Düz ortalama yanıltır: 100 TL'lik 90 günlük fatura ile 500.000 TL'lik 5
 * günlük fatura düz ortalamada "47 gün" verir ama şirketin parası aslında
 * 5 gündür bekliyor. Bu yüzden Σ(tutar × gün) / Σtutar kullanılır.
 */
export function agirlikliGecikme(faturalar: FaturaBenzeri[], tarih: Date = BUGUN): number {
  let tutarGun = 0
  let tutarToplam = 0

  for (const f of faturalar) {
    const gun = gecikmeGunu(f, tarih)
    if (gun <= 0) continue
    const kalan = kalanBakiye(f)
    tutarGun += kalan * gun
    tutarToplam += kalan
  }

  return tutarToplam === 0 ? 0 : Math.round(tutarGun / tutarToplam)
}

// ──────────────────────── Bildirim etkinliği ────────────────────────

export type KanalEtkinlik = {
  kanal: string
  gonderim: number
  donusen: number // ardından tahsilat gelen bildirim sayısı
  atfedilenTutar: number
  ortTahsilGunu: number // bildirim → tahsilat arası ortalama gün
  donusumOrani: number // %
}

/** Bir tahsilatın hangi bildirime yazıldığını taşıyan kayıt. */
export type Atif = {
  bildirim: BildirimBenzeri
  tutar: number
  aradakiGun: number
}

/**
 * Tahsilatları bildirimlere ATFEDER — etkinlik analizinin tek temeli.
 *
 * Atıf kuralı: her TAHSİLAT, kendisinden önceki `pencereGun` gün içinde aynı
 * cariye gönderilmiş EN SON bildirime yazılır. "En son" olması önemli — aksi
 * halde aynı tahsilat 3 farklı bildirime sayılır ve dönüşüm oranları şişer.
 *
 * Bu bir korelasyon ölçümüdür, nedensellik kanıtı değil; müşteriye de böyle
 * sunulmalı. Yine de kanal karşılaştırması için en dürüst yaklaşım budur.
 *
 * ÖNEMLİ: Atıf, bildirimlerin TAMAMI üzerinden bir kez hesaplanmalı ve
 * gruplamalar (kanal, gecikme aralığı) bu sonuç üzerinden yapılmalıdır. Her
 * dilim için ayrı ayrı çağrılırsa her dilim aynı tahsilatı kendine yazar ve
 * dilim oranlarının toplamı genel orandan büyük çıkar.
 */
export function tahsilatAtiflari(
  bildirimler: BildirimBenzeri[],
  tahsilatlar: TahsilatBenzeri[],
  pencereGun = 5,
): Atif[] {
  // Cari bazında bildirimleri zamana göre sırala — her tahsilat için geriye
  // doğru arama yapacağız.
  const cariBildirimleri = new Map<string, BildirimBenzeri[]>()
  for (const b of bildirimler) {
    const liste = cariBildirimleri.get(b.customerId) ?? []
    liste.push(b)
    cariBildirimleri.set(b.customerId, liste)
  }
  for (const liste of cariBildirimleri.values()) {
    liste.sort((a, b) => a.gonderimZamani.getTime() - b.gonderimZamani.getTime())
  }

  const atiflar: Atif[] = []

  for (const t of tahsilatlar) {
    const liste = cariBildirimleri.get(t.customerId)
    if (!liste) continue

    // Tahsilattan önceki en son bildirim
    let sonBildirim: BildirimBenzeri | null = null
    for (const b of liste) {
      if (b.gonderimZamani > t.odemeTarihi) break
      sonBildirim = b
    }
    if (!sonBildirim) continue

    const aradakiGun = gunFarki(t.odemeTarihi, sonBildirim.gonderimZamani)
    if (aradakiGun < 0 || aradakiGun > pencereGun) continue

    atiflar.push({ bildirim: sonBildirim, tutar: t.tutar, aradakiGun })
  }

  return atiflar
}

/** Atıfları kanal bazında toplar. */
export function kanalEtkinligi(
  bildirimler: BildirimBenzeri[],
  atiflar: Atif[],
): KanalEtkinlik[] {
  const kanalToplam = new Map<
    string,
    { gonderim: number; donusen: number; tutar: number; gunToplam: number }
  >()
  const kanalKaydi = (k: string) => {
    if (!kanalToplam.has(k)) {
      kanalToplam.set(k, { gonderim: 0, donusen: 0, tutar: 0, gunToplam: 0 })
    }
    return kanalToplam.get(k)!
  }

  for (const b of bildirimler) kanalKaydi(b.kanal).gonderim += 1

  for (const a of atiflar) {
    const kayit = kanalKaydi(a.bildirim.kanal)
    kayit.donusen += 1
    kayit.tutar += a.tutar
    kayit.gunToplam += a.aradakiGun
  }

  return [...kanalToplam.entries()]
    .map(([kanal, v]) => ({
      kanal,
      gonderim: v.gonderim,
      donusen: v.donusen,
      atfedilenTutar: v.tutar,
      ortTahsilGunu: v.donusen === 0 ? 0 : Math.round((v.gunToplam / v.donusen) * 10) / 10,
      donusumOrani: v.gonderim === 0 ? 0 : Math.round((v.donusen / v.gonderim) * 1000) / 10,
    }))
    .sort((a, b) => b.atfedilenTutar - a.atfedilenTutar)
}

/** Tek adımda kanal etkinliği — atıf ve gruplamayı birlikte yapar. */
export function bildirimEtkinligi(
  bildirimler: BildirimBenzeri[],
  tahsilatlar: TahsilatBenzeri[],
  pencereGun = 5,
): KanalEtkinlik[] {
  return kanalEtkinligi(bildirimler, tahsilatAtiflari(bildirimler, tahsilatlar, pencereGun))
}

// ──────────────────────────── Toplamlar ────────────────────────────

export type BakiyeOzeti = {
  acikBakiye: number
  vadesiGecen: number
  vadesiGelmemis: number
  agirlikliGecikmeGunu: number
  acikFaturaAdedi: number
  vadesiGecenAdedi: number
}

export function bakiyeOzeti(faturalar: FaturaBenzeri[], tarih: Date = BUGUN): BakiyeOzeti {
  let acikBakiye = 0
  let vadesiGecen = 0
  let acikFaturaAdedi = 0
  let vadesiGecenAdedi = 0

  for (const f of faturalar) {
    if (f.durum === 'ODENDI') continue
    const kalan = kalanBakiye(f)
    acikBakiye += kalan
    acikFaturaAdedi += 1
    if (gecikmeGunu(f, tarih) > 0) {
      vadesiGecen += kalan
      vadesiGecenAdedi += 1
    }
  }

  return {
    acikBakiye,
    vadesiGecen,
    vadesiGelmemis: acikBakiye - vadesiGecen,
    agirlikliGecikmeGunu: agirlikliGecikme(faturalar, tarih),
    acikFaturaAdedi,
    vadesiGecenAdedi,
  }
}

/**
 * Vade uyum oranı: kapanan faturaların yüzde kaçı gecikmeden ödendi.
 * Tahsilat performans raporunun ana göstergesi.
 */
export function vadeUyumOrani(faturalar: FaturaBenzeri[]): number {
  const kapanan = faturalar.filter((f) => f.kapanmaTarihi !== null)
  if (kapanan.length === 0) return 0
  const zamaninda = kapanan.filter((f) => (odemeGecikmesi(f) ?? 0) <= 0).length
  return Math.round((zamaninda / kapanan.length) * 1000) / 10
}
