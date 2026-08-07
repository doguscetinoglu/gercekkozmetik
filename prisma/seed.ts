/**
 * Doğal Katkı — demo verisi üretici
 *
 * Bu dosya rastgele gürültü üretmez; gerçek bir tahsilat operasyonunun DAVRANIŞINI
 * modeller. Raporların ("bildirim etkinliği", "yaşlandırma", "ödeme disiplini")
 * anlamlı çıkmasının tek sebebi buradaki nedensellik zinciridir:
 *
 *   cari profili → hedef gecikme → eskalasyon takvimi → cari tepkisi → tahsilat
 *
 * PRNG sabit tohumlu (deterministik): her çalıştırmada AYNI tablo üretilir.
 * Demo tekrarlanabilir olsun, müşteriye her açılışta farklı rakam gitmesin diye.
 *
 * NOT: Tüm firma isimleri hayalidir. Gerçek şirketlere borç/gecikme verisi
 * atfetmemek için bilinçli olarak uydurma isimler kullanılmıştır.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { hash } from 'bcryptjs'
import { DEMO_GIRIS } from '../src/lib/brand'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─────────────────────────────────────────────────────────────────────────────
// Deterministik rastgelelik (mulberry32)
// ─────────────────────────────────────────────────────────────────────────────

let tohum = 20260730 // bugünün tarihi = sabit tohum

function rnd(): number {
  tohum |= 0
  tohum = (tohum + 0x6d2b79f5) | 0
  let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** [min, max] aralığında tam sayı */
const aralik = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))

/** Diziden rastgele öğe */
const sec = <T>(dizi: readonly T[]): T => dizi[Math.floor(rnd() * dizi.length)]

/** %olasilik ihtimalle true */
const sans = (olasilik: number) => rnd() < olasilik

// ─────────────────────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────────────────────

/** Demo'nun "bugün"ü. Tüm gecikme hesapları bu tarihe göre. */
const BUGUN = new Date('2026-07-30T00:00:00.000Z')
const BASLANGIC = new Date('2025-12-01T00:00:00.000Z')

const GUN_MS = 86_400_000

const gunEkle = (tarih: Date, gun: number) => new Date(tarih.getTime() + gun * GUN_MS)
const gunFarki = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / GUN_MS)

const SEHIRLER = [
  'İstanbul', 'İstanbul', 'İstanbul', 'Ankara', 'Ankara', 'İzmir', 'İzmir',
  'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Samsun',
  'Trabzon', 'Eskişehir', 'Denizli', 'Sakarya', 'Mersin', 'Diyarbakır',
] as const

const TEMSILCILER = [
  'Elif Yurdakul', 'Burak Şensoy', 'Merve Altundağ',
  'Kerem Doğanay', 'Sibel Karaağaç', 'Onur Beyazıt',
] as const

// Hayali firma ismi parçaları — segment bazlı birleştirilir.
const ISIM_ONEK = [
  'Nazar', 'Lale', 'Ege', 'Anadolu', 'Deniz', 'Gülbahar', 'Zümrüt', 'Safir',
  'Papatya', 'Mercan', 'Yıldız', 'Altınbaş', 'Bereket', 'Şafak', 'Işıl',
  'Nilüfer', 'Karanfil', 'Sedef', 'Firuze', 'Manolya', 'Reyhan', 'Akasya',
  'Çınaraltı', 'Gökkuşağı', 'Menekşe', 'Zeytindalı', 'Turkuaz', 'Beyaz Gül',
  'Sultan', 'Ihlamur',
] as const

const SEGMENT_SONEK: Record<string, readonly string[]> = {
  BAYI: ['Kozmetik Bayii', 'Kozmetik Ltd. Şti.', 'Güzellik Ürünleri', 'Kozmetik Tic.'],
  ZINCIR: ['Marketleri A.Ş.', 'Mağazacılık A.Ş.', 'Perakende A.Ş.'],
  ECZANE: ['Ecza Deposu', 'Eczanesi', 'Ecza Ticaret'],
  ONLINE: ['Online Kozmetik', 'E-Ticaret Ltd.', 'Dijital Satış'],
  IHRACAT: ['Dış Ticaret A.Ş.', 'İhracat Ltd. Şti.', 'Global Tic.'],
}

const SABLONLAR: Record<string, readonly string[]> = {
  ONCESI: ['Vade Hatırlatma', 'Yaklaşan Ödeme Bildirimi'],
  ILK: ['Nazik Hatırlatma', 'Vade Geçti Bildirimi'],
  ORTA: ['Gecikme Uyarısı', 'Ödeme Talebi'],
  SON: ['Son Uyarı', 'Hukuki Süreç Öncesi Bildirim'],
}

/**
 * Ödeme disiplini profilleri.
 * `hedefGecikme` = cari, hiç hatırlatma yapılmasaydı kaç gün gecikirdi.
 * `tepkiVerir` = hatırlatmadan sonra 1-5 gün içinde ödemeye geçer mi.
 */
const PROFILLER = [
  // "iyi" profilin alt sınırı NEGATİF: bu cariler faturayı vadesinden önce de
  // öder. Alt sınır 0 olduğunda hiç kimse vadesinde ödemiyordu ve vade uyumu
  // %5'te kalıyordu — gerçek bir müşteri portföyünü temsil etmiyordu.
  { ad: 'iyi', agirlik: 34, gecikmeMin: -7, gecikmeMax: 6, tepkiVerir: true },
  { ad: 'orta', agirlik: 41, gecikmeMin: 4, gecikmeMax: 40, tepkiVerir: true },
  { ad: 'kotu', agirlik: 25, gecikmeMin: 35, gecikmeMax: 130, tepkiVerir: false },
] as const

/**
 * Eskalasyon takvimi: vade gününe göre KAÇINCI günde HANGİ kanaldan gidilir.
 * Negatif gün = vade öncesi önleyici hatırlatma (gerçek sistemlerde vardır ve
 * etkinlik raporunun en değerli satırıdır — ucuz kanal, yüksek dönüşüm).
 * Gecikme büyüdükçe kanal sertleşir: SMS → WhatsApp → Mail → Telefon.
 */
const ESKALASYON = [
  { gun: -3, kanal: 'SMS', grup: 'ONCESI' },
  { gun: 3, kanal: 'SMS', grup: 'ILK' },
  { gun: 10, kanal: 'WHATSAPP', grup: 'ILK' },
  { gun: 20, kanal: 'EMAIL', grup: 'ORTA' },
  { gun: 35, kanal: 'CALL', grup: 'ORTA' },
  { gun: 55, kanal: 'WHATSAPP', grup: 'SON' },
  { gun: 75, kanal: 'CALL', grup: 'SON' },
  { gun: 100, kanal: 'CALL', grup: 'SON' },
] as const

/** Kanal bazlı gerçekçi teslim durumu dağılımı. */
function bildirimDurumu(kanal: string): string {
  if (kanal === 'SMS') return sans(0.88) ? 'ILETILDI' : 'BASARISIZ'
  if (kanal === 'WHATSAPP') {
    const r = rnd()
    return r < 0.68 ? 'OKUNDU' : r < 0.94 ? 'ILETILDI' : 'BASARISIZ'
  }
  if (kanal === 'EMAIL') {
    const r = rnd()
    return r < 0.34 ? 'OKUNDU' : r < 0.95 ? 'ILETILDI' : 'BASARISIZ'
  }
  return sans(0.63) ? 'CEVAPLANDI' : 'CEVAPSIZ' // CALL
}

/** Segment bazlı fatura tutarı aralığı ve aylık fatura sıklığı. */
const SEGMENT_PROFIL: Record<string, { min: number; max: number; aylikMin: number; aylikMax: number; vade: number }> = {
  BAYI:    { min: 12_000,  max: 85_000,  aylikMin: 1, aylikMax: 3, vade: 45 },
  ZINCIR:  { min: 90_000,  max: 420_000, aylikMin: 1, aylikMax: 2, vade: 60 },
  ECZANE:  { min: 8_000,   max: 45_000,  aylikMin: 1, aylikMax: 3, vade: 30 },
  ONLINE:  { min: 20_000,  max: 140_000, aylikMin: 2, aylikMax: 4, vade: 30 },
  IHRACAT: { min: 150_000, max: 650_000, aylikMin: 1, aylikMax: 1, vade: 90 },
}

const SEGMENT_DAGILIM = [
  ...Array(38).fill('BAYI'),
  ...Array(12).fill('ZINCIR'),
  ...Array(26).fill('ECZANE'),
  ...Array(16).fill('ONLINE'),
  ...Array(8).fill('IHRACAT'),
]

const ODEME_YONTEMLERI = [
  ...Array(52).fill('HAVALE'),
  ...Array(18).fill('CEK'),
  ...Array(14).fill('KREDI_KARTI'),
  ...Array(10).fill('SENET'),
  ...Array(6).fill('NAKIT'),
]

// ─────────────────────────────────────────────────────────────────────────────
// Üretim
// ─────────────────────────────────────────────────────────────────────────────

type CariKaydi = {
  id: string
  kod: string
  ad: string
  sehir: string
  segment: string
  telefon: string
  email: string
  temsilci: string
  krediLimiti: number
  vadeGunu: number
  aktif: boolean
}

/** Profili ağırlıklarına göre seçer. */
function profilSec() {
  const toplam = PROFILLER.reduce((t, p) => t + p.agirlik, 0)
  let esik = rnd() * toplam
  for (const p of PROFILLER) {
    esik -= p.agirlik
    if (esik <= 0) return p
  }
  return PROFILLER[1]
}

function cariUret(): { cariler: CariKaydi[]; profiller: Map<string, ReturnType<typeof profilSec>> } {
  const cariler: CariKaydi[] = []
  const profiller = new Map<string, ReturnType<typeof profilSec>>()
  const kullanilanIsimler = new Set<string>()

  SEGMENT_DAGILIM.forEach((segment, i) => {
    // İsim çakışmasını önle — aynı isimli iki cari kafa karıştırır.
    let ad = ''
    do {
      ad = `${sec(ISIM_ONEK)} ${sec(SEGMENT_SONEK[segment])}`
    } while (kullanilanIsimler.has(ad))
    kullanilanIsimler.add(ad)

    const sp = SEGMENT_PROFIL[segment]
    const id = `cari_${String(i + 1).padStart(4, '0')}`

    cariler.push({
      id,
      kod: `CH-${String(i + 1).padStart(4, '0')}`,
      ad,
      sehir: sec(SEHIRLER),
      segment,
      telefon: `0${aralik(500, 559)} ${aralik(100, 999)} ${aralik(10, 99)} ${aralik(10, 99)}`,
      email: `muhasebe@${ad.toLowerCase()
        .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]!)
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 18)}.com.tr`,
      temsilci: sec(TEMSILCILER),
      // Kredi limiti, tipik fatura tutarının 3-6 katı olacak şekilde kurulur.
      krediLimiti: Math.round((sp.min + sp.max) / 2 * aralik(3, 6) / 1000) * 1000,
      vadeGunu: sp.vade,
      aktif: sans(0.96),
    })
    profiller.set(id, profilSec())
  })

  return { cariler, profiller }
}

type FaturaKaydi = {
  id: string
  customerId: string
  faturaNo: string
  kesimTarihi: Date
  vadeTarihi: Date
  tutar: number
  odenenTutar: number
  durum: string
  kapanmaTarihi: Date | null
}
type TahsilatKaydi = {
  id: string
  customerId: string
  invoiceId: string | null
  odemeTarihi: Date
  tutar: number
  yontem: string
  aciklama: string | null
}
type BildirimKaydi = {
  id: string
  customerId: string
  invoiceId: string | null
  kanal: string
  gonderimZamani: Date
  durum: string
  gonderimdekiGecikmeGunu: number
  sablon: string
}

function hareketUret(cariler: CariKaydi[], profiller: Map<string, ReturnType<typeof profilSec>>) {
  const faturalar: FaturaKaydi[] = []
  const tahsilatlar: TahsilatKaydi[] = []
  const bildirimler: BildirimKaydi[] = []

  let faturaSayac = 0
  let tahsilatSayac = 0
  let bildirimSayac = 0

  const toplamAy = 8 // Aralık 2025 → Temmuz 2026

  for (const cari of cariler) {
    const profil = profiller.get(cari.id)!
    const sp = SEGMENT_PROFIL[cari.segment]

    for (let ay = 0; ay < toplamAy; ay++) {
      const ayBasi = new Date(Date.UTC(2025, 11 + ay, 1))
      const faturaAdedi = aralik(sp.aylikMin, sp.aylikMax)

      for (let f = 0; f < faturaAdedi; f++) {
        const kesimTarihi = gunEkle(ayBasi, aralik(0, 27))
        if (kesimTarihi > BUGUN) continue

        const vadeTarihi = gunEkle(kesimTarihi, cari.vadeGunu)
        const tutar = Math.round(aralik(sp.min, sp.max) / 100) * 100

        faturaSayac++
        const faturaId = `fat_${String(faturaSayac).padStart(5, '0')}`

        // 1) Cari kendi başına kaç gün gecikirdi?
        const hedefGecikme = aralik(profil.gecikmeMin, profil.gecikmeMax)

        // 2) Eskalasyon takvimindeki hangi adımlar ödeme öncesine denk gelir?
        const adaylar = ESKALASYON.filter((e) => e.gun < hedefGecikme)
        const gecikmeAdaylari = adaylar.filter((e) => e.gun > 0)

        // 3) Cari tepki verirse son hatırlatmadan 1-5 gün sonra öder.
        //    Etkinlik raporundaki "bildirim → tahsilat" ilişkisi buradan doğar.
        let gercekGecikme = hedefGecikme
        if (profil.tepkiVerir && gecikmeAdaylari.length > 0) {
          const sonAdim = gecikmeAdaylari[gecikmeAdaylari.length - 1]
          gercekGecikme = Math.min(hedefGecikme, sonAdim.gun + aralik(1, 5))
        }

        const odemeTarihi = gunEkle(vadeTarihi, gercekGecikme)
        const odendi = odemeTarihi <= BUGUN

        // 4) Bildirimleri yaz — ödeme gününden sonrasına gönderim yapılmaz.
        //    Koşul vade öncesi adımlar için de geçerli: cari vadesinden 5 gün
        //    önce ödediyse, -3. günün hatırlatması artık gönderilmez.
        for (const adim of ESKALASYON) {
          if (adim.gun >= gercekGecikme) continue
          const gonderim = gunEkle(vadeTarihi, adim.gun)
          if (gonderim > BUGUN) continue
          // Vade öncesi hatırlatma her faturaya gitmez (sistem ayarı gibi davranır).
          if (adim.gun < 0 && !sans(0.72)) continue

          bildirimSayac++
          bildirimler.push({
            id: `bil_${String(bildirimSayac).padStart(6, '0')}`,
            customerId: cari.id,
            invoiceId: faturaId,
            kanal: adim.kanal,
            // Mesai içi rastgele saat — günlük raporda saat dağılımı gerçekçi olsun.
            gonderimZamani: new Date(gonderim.getTime() + (aralik(9, 17) * 60 + aralik(0, 59)) * 60_000),
            durum: bildirimDurumu(adim.kanal),
            gonderimdekiGecikmeGunu: adim.gun,
            sablon: sec(SABLONLAR[adim.grup]),
          })
        }

        // 5) Fatura ve tahsilat kayıtları
        if (odendi) {
          // %18 ihtimalle iki taksitte kapanır (çek/senet karışımı gerçekçiliği).
          const taksitli = sans(0.18)
          if (taksitli) {
            const ilkTutar = Math.round(tutar * (0.3 + rnd() * 0.4))
            const ilkTarih = gunEkle(vadeTarihi, Math.max(0, gercekGecikme - aralik(5, 20)))
            tahsilatSayac++
            tahsilatlar.push({
              id: `tah_${String(tahsilatSayac).padStart(5, '0')}`,
              customerId: cari.id,
              invoiceId: faturaId,
              odemeTarihi: ilkTarih,
              tutar: ilkTutar,
              yontem: sec(ODEME_YONTEMLERI),
              aciklama: 'Kısmi ödeme',
            })
            tahsilatSayac++
            tahsilatlar.push({
              id: `tah_${String(tahsilatSayac).padStart(5, '0')}`,
              customerId: cari.id,
              invoiceId: faturaId,
              odemeTarihi: odemeTarihi,
              tutar: tutar - ilkTutar,
              yontem: sec(ODEME_YONTEMLERI),
              aciklama: 'Kapanış ödemesi',
            })
          } else {
            tahsilatSayac++
            tahsilatlar.push({
              id: `tah_${String(tahsilatSayac).padStart(5, '0')}`,
              customerId: cari.id,
              invoiceId: faturaId,
              odemeTarihi,
              tutar,
              yontem: sec(ODEME_YONTEMLERI),
              aciklama: null,
            })
          }

          faturalar.push({
            id: faturaId,
            customerId: cari.id,
            faturaNo: `GK-2026-${String(faturaSayac).padStart(5, '0')}`,
            kesimTarihi,
            vadeTarihi,
            tutar,
            odenenTutar: tutar,
            durum: 'ODENDI',
            kapanmaTarihi: odemeTarihi,
          })
        } else {
          // Henüz kapanmamış fatura. Bir kısmı kısmi tahsilat almış olur —
          // yaşlandırma raporunda "kalan bakiye" mantığı böyle test edilir.
          const kismi = vadeTarihi < BUGUN && sans(0.22)
          const odenen = kismi ? Math.round(tutar * (0.2 + rnd() * 0.45)) : 0

          if (kismi) {
            tahsilatSayac++
            tahsilatlar.push({
              id: `tah_${String(tahsilatSayac).padStart(5, '0')}`,
              customerId: cari.id,
              invoiceId: faturaId,
              odemeTarihi: gunEkle(vadeTarihi, aralik(1, Math.max(1, gunFarki(BUGUN, vadeTarihi)))),
              tutar: odenen,
              yontem: sec(ODEME_YONTEMLERI),
              aciklama: 'Kısmi ödeme',
            })
          }

          faturalar.push({
            id: faturaId,
            customerId: cari.id,
            faturaNo: `GK-2026-${String(faturaSayac).padStart(5, '0')}`,
            kesimTarihi,
            vadeTarihi,
            tutar,
            odenenTutar: odenen,
            durum: kismi ? 'KISMI' : 'ACIK',
            kapanmaTarihi: null,
          })
        }
      }
    }
  }

  return { faturalar, tahsilatlar, bildirimler }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yazma
// ─────────────────────────────────────────────────────────────────────────────

/** createMany'yi parçalara böler — tek seferde binlerce satır Neon'da timeout eder. */
async function parcaliYaz<T>(ad: string, kayitlar: T[], yaz: (parca: T[]) => Promise<unknown>) {
  const PARCA = 500
  for (let i = 0; i < kayitlar.length; i += PARCA) {
    await yaz(kayitlar.slice(i, i + PARCA))
  }
  console.log(`  ${ad}: ${kayitlar.length}`)
}

async function main() {
  console.log('Demo verisi üretiliyor...')

  const { cariler, profiller } = cariUret()
  const { faturalar, tahsilatlar, bildirimler } = hareketUret(cariler, profiller)

  console.log('Mevcut veri temizleniyor...')
  await prisma.reminder.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  console.log('Yazılıyor:')

  const sifreHash = await hash(DEMO_GIRIS.sifre, 10)
  await prisma.user.createMany({
    data: [
      {
        kullaniciAdi: DEMO_GIRIS.kullaniciAdi,
        adSoyad: 'Demo Kullanıcı',
        unvan: 'Finans Müdürü',
        sifreHash,
      },
      { kullaniciAdi: 'dogus', adSoyad: 'Doğuş Çetinoğlu', unvan: 'Sistem Yöneticisi', sifreHash },
    ],
  })
  console.log('  Kullanıcı: 2')

  await parcaliYaz('Cari', cariler, (p) =>
    prisma.customer.createMany({ data: p as never }),
  )
  await parcaliYaz('Fatura', faturalar, (p) =>
    prisma.invoice.createMany({ data: p as never }),
  )
  await parcaliYaz('Tahsilat', tahsilatlar, (p) =>
    prisma.payment.createMany({ data: p as never }),
  )
  await parcaliYaz('Bildirim', bildirimler, (p) =>
    prisma.reminder.createMany({ data: p as never }),
  )

  // Özet — verinin gerçekten "raporlanabilir" olduğunu burada doğruluyoruz.
  const acik = faturalar.filter((f) => f.durum !== 'ODENDI')
  const vadesiGecen = acik.filter((f) => f.vadeTarihi < BUGUN)
  const bugunBildirim = bildirimler.filter(
    (b) => b.gonderimZamani.toISOString().slice(0, 10) === '2026-07-30',
  )
  const bugunTahsilat = tahsilatlar.filter(
    (t) => t.odemeTarihi.toISOString().slice(0, 10) === '2026-07-30',
  )

  console.log('\nÖzet:')
  console.log(`  Açık fatura: ${acik.length}, vadesi geçen: ${vadesiGecen.length}`)
  console.log(
    `  Vadesi geçen tutar: ${vadesiGecen
      .reduce((t, f) => t + (f.tutar - f.odenenTutar), 0)
      .toLocaleString('tr-TR')} TL`,
  )
  console.log(`  Bugün bildirim: ${bugunBildirim.length}, bugün tahsilat: ${bugunTahsilat.length}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
