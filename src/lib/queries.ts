import 'server-only'
import { prisma } from './prisma'
import { BUGUN } from './brand'
import {
  bakiyeOzeti,
  gecikmeGunu,
  gunFarki,
  kalanBakiye,
  kanalEtkinligi,
  odemeGecikmesi,
  tahsilatAtiflari,
  vadeUyumOrani,
  yaslandirma,
} from './metrics'

/**
 * Veri erişim katmanı.
 *
 * Prisma Decimal alanları burada Number'a çevrilir — Decimal nesnesi client
 * bileşenlerine serialize edilemez, sınırda dönüştürmek zorunlu.
 *
 * Veri hacmi küçük (~1.600 fatura, ~4.500 bildirim) olduğu için toplamlar SQL
 * yerine bellekte hesaplanıyor: metrics.ts'teki mantığın tek kopya kalması,
 * SQL'de tekrar yazılmasından daha değerli.
 */

// ─────────────────────────── Ortak yükleyiciler ───────────────────────────

async function tumFaturalar() {
  const kayitlar = await prisma.invoice.findMany({
    select: {
      id: true,
      customerId: true,
      faturaNo: true,
      kesimTarihi: true,
      vadeTarihi: true,
      tutar: true,
      odenenTutar: true,
      durum: true,
      kapanmaTarihi: true,
    },
  })
  return kayitlar.map((f) => ({
    ...f,
    tutar: Number(f.tutar),
    odenenTutar: Number(f.odenenTutar),
  }))
}

async function tumTahsilatlar() {
  const kayitlar = await prisma.payment.findMany({
    select: {
      id: true,
      customerId: true,
      invoiceId: true,
      odemeTarihi: true,
      tutar: true,
      yontem: true,
      aciklama: true,
    },
  })
  return kayitlar.map((t) => ({ ...t, tutar: Number(t.tutar) }))
}

async function tumBildirimler() {
  return prisma.reminder.findMany({
    select: {
      id: true,
      customerId: true,
      invoiceId: true,
      kanal: true,
      gonderimZamani: true,
      durum: true,
      gonderimdekiGecikmeGunu: true,
      sablon: true,
    },
  })
}

type Fatura = Awaited<ReturnType<typeof tumFaturalar>>[number]
type Tahsilat = Awaited<ReturnType<typeof tumTahsilatlar>>[number]
type Bildirim = Awaited<ReturnType<typeof tumBildirimler>>[number]

/** Gün bazında sayım/toplam üretir — grafik ve matris tabloların ortak girdisi. */
function gunlereDagit<T>(
  kayitlar: T[],
  tarihAl: (k: T) => Date,
  baslangic: Date,
  bitis: Date,
): Map<string, T[]> {
  const harita = new Map<string, T[]>()
  for (
    let g = new Date(baslangic);
    g <= bitis;
    g = new Date(g.getTime() + 86_400_000)
  ) {
    harita.set(g.toISOString().slice(0, 10), [])
  }
  for (const k of kayitlar) {
    const anahtar = tarihAl(k).toISOString().slice(0, 10)
    harita.get(anahtar)?.push(k)
  }
  return harita
}

// ──────────────────────────────── Dashboard ────────────────────────────────

export async function dashboardVerisi() {
  const [faturalar, tahsilatlar, bildirimler, cariler] = await Promise.all([
    tumFaturalar(),
    tumTahsilatlar(),
    tumBildirimler(),
    prisma.customer.findMany({ select: { id: true, kod: true, ad: true, sehir: true, segment: true, temsilci: true } }),
  ])

  const ozet = bakiyeOzeti(faturalar)
  const kovalar = yaslandirma(faturalar)

  const bugunAnahtar = BUGUN.toISOString().slice(0, 10)
  const bugunBildirimler = bildirimler.filter(
    (b) => b.gonderimZamani.toISOString().slice(0, 10) === bugunAnahtar,
  )
  const bugunTahsilatlar = tahsilatlar.filter(
    (t) => t.odemeTarihi.toISOString().slice(0, 10) === bugunAnahtar,
  )

  // Son 30 günün günlük bildirim ↔ tahsilat seyri
  const otuzGunOnce = new Date(BUGUN.getTime() - 29 * 86_400_000)
  const bildirimGunleri = gunlereDagit(bildirimler, (b) => b.gonderimZamani, otuzGunOnce, BUGUN)
  const tahsilatGunleri = gunlereDagit(tahsilatlar, (t) => t.odemeTarihi, otuzGunOnce, BUGUN)

  const seyir = [...bildirimGunleri.entries()].map(([gun, bList]) => ({
    gun,
    bildirim: bList.length,
    tahsilat: (tahsilatGunleri.get(gun) ?? []).reduce((t, x) => t + x.tutar, 0),
  }))

  // Kanal dağılımı (bugün)
  const kanalSayim = new Map<string, number>()
  for (const b of bugunBildirimler) {
    kanalSayim.set(b.kanal, (kanalSayim.get(b.kanal) ?? 0) + 1)
  }

  // En riskli 20 cari: vadesi geçen bakiyeye göre
  const cariHarita = new Map(cariler.map((c) => [c.id, c]))
  const riskliHarita = new Map<string, { vadesiGecen: number; enYuksekGecikme: number }>()
  for (const f of faturalar) {
    const gun = gecikmeGunu(f)
    if (gun <= 0) continue
    const mevcut = riskliHarita.get(f.customerId) ?? { vadesiGecen: 0, enYuksekGecikme: 0 }
    mevcut.vadesiGecen += kalanBakiye(f)
    mevcut.enYuksekGecikme = Math.max(mevcut.enYuksekGecikme, gun)
    riskliHarita.set(f.customerId, mevcut)
  }

  const enRiskli = [...riskliHarita.entries()]
    .map(([id, v]) => ({
      id,
      kod: cariHarita.get(id)?.kod ?? '',
      ad: cariHarita.get(id)?.ad ?? '',
      sehir: cariHarita.get(id)?.sehir ?? '',
      temsilci: cariHarita.get(id)?.temsilci ?? '',
      ...v,
    }))
    .sort((a, b) => b.vadesiGecen - a.vadesiGecen)
    .slice(0, 20)

  // Dönem tahsilatı (bu ay) ve tahsilat oranı
  const ayBasi = new Date(Date.UTC(BUGUN.getUTCFullYear(), BUGUN.getUTCMonth(), 1))
  const ayTahsilat = tahsilatlar
    .filter((t) => t.odemeTarihi >= ayBasi)
    .reduce((toplam, t) => toplam + t.tutar, 0)

  return {
    ozet,
    kovalar,
    bugun: {
      bildirimAdedi: bugunBildirimler.length,
      tahsilatAdedi: bugunTahsilatlar.length,
      tahsilatTutari: bugunTahsilatlar.reduce((t, x) => t + x.tutar, 0),
      kanallar: [...kanalSayim.entries()].map(([kanal, adet]) => ({ kanal, adet })),
    },
    seyir,
    enRiskli,
    ayTahsilat,
    vadeUyumu: vadeUyumOrani(faturalar),
    cariAdedi: cariler.length,
  }
}

// ───────────────────────────── Cari listesi ─────────────────────────────

export type CariOzet = {
  id: string
  kod: string
  ad: string
  sehir: string
  segment: string
  temsilci: string
  aktif: boolean
  acikBakiye: number
  vadesiGecen: number
  enYuksekGecikme: number
  sonBildirim: Date | null
  sonTahsilat: Date | null
  sonTahsilatTutari: number
}

export async function cariOzetleri(): Promise<CariOzet[]> {
  const [cariler, faturalar, tahsilatlar, bildirimler] = await Promise.all([
    prisma.customer.findMany({ orderBy: { kod: 'asc' } }),
    tumFaturalar(),
    tumTahsilatlar(),
    tumBildirimler(),
  ])

  const faturaGrup = grupla(faturalar, (f) => f.customerId)
  const tahsilatGrup = grupla(tahsilatlar, (t) => t.customerId)
  const bildirimGrup = grupla(bildirimler, (b) => b.customerId)

  return cariler.map((c) => {
    const cf = faturaGrup.get(c.id) ?? []
    const ct = tahsilatGrup.get(c.id) ?? []
    const cb = bildirimGrup.get(c.id) ?? []

    const ozet = bakiyeOzeti(cf)
    const enYuksekGecikme = cf.reduce((m, f) => Math.max(m, gecikmeGunu(f)), 0)

    const sonTahsilat = ct.reduce<Tahsilat | null>(
      (en, t) => (!en || t.odemeTarihi > en.odemeTarihi ? t : en),
      null,
    )
    const sonBildirim = cb.reduce<Bildirim | null>(
      (en, b) => (!en || b.gonderimZamani > en.gonderimZamani ? b : en),
      null,
    )

    return {
      id: c.id,
      kod: c.kod,
      ad: c.ad,
      sehir: c.sehir,
      segment: c.segment,
      temsilci: c.temsilci,
      aktif: c.aktif,
      acikBakiye: ozet.acikBakiye,
      vadesiGecen: ozet.vadesiGecen,
      enYuksekGecikme,
      sonBildirim: sonBildirim?.gonderimZamani ?? null,
      sonTahsilat: sonTahsilat?.odemeTarihi ?? null,
      sonTahsilatTutari: sonTahsilat?.tutar ?? 0,
    }
  })
}

function grupla<T>(kayitlar: T[], anahtarAl: (k: T) => string): Map<string, T[]> {
  const harita = new Map<string, T[]>()
  for (const k of kayitlar) {
    const a = anahtarAl(k)
    const liste = harita.get(a)
    if (liste) liste.push(k)
    else harita.set(a, [k])
  }
  return harita
}

/** Filtre seçenekleri için mevcut şehir/temsilci listeleri. */
export async function filtreSecenekleri() {
  const cariler = await prisma.customer.findMany({
    select: { sehir: true, temsilci: true },
  })
  return {
    sehirler: [...new Set(cariler.map((c) => c.sehir))].sort((a, b) => a.localeCompare(b, 'tr')),
    temsilciler: [...new Set(cariler.map((c) => c.temsilci))].sort((a, b) => a.localeCompare(b, 'tr')),
  }
}

// ────────────────────────────── Cari detay ──────────────────────────────

export async function cariDetay(id: string) {
  const cari = await prisma.customer.findUnique({ where: { id } })
  if (!cari) return null

  const [faturaKayitlari, tahsilatKayitlari, bildirimKayitlari] = await Promise.all([
    prisma.invoice.findMany({ where: { customerId: id }, orderBy: { vadeTarihi: 'desc' } }),
    prisma.payment.findMany({ where: { customerId: id }, orderBy: { odemeTarihi: 'desc' } }),
    prisma.reminder.findMany({
      where: { customerId: id },
      orderBy: { gonderimZamani: 'desc' },
      include: { invoice: { select: { faturaNo: true } } },
    }),
  ])

  const faturalar = faturaKayitlari.map((f) => ({
    ...f,
    tutar: Number(f.tutar),
    odenenTutar: Number(f.odenenTutar),
    gecikme: gecikmeGunu({ ...f, tutar: Number(f.tutar), odenenTutar: Number(f.odenenTutar) }),
    odemeGecikmesi: odemeGecikmesi({
      ...f,
      tutar: Number(f.tutar),
      odenenTutar: Number(f.odenenTutar),
    }),
  }))

  const tahsilatlar = tahsilatKayitlari.map((t) => ({ ...t, tutar: Number(t.tutar) }))

  return {
    cari: { ...cari, krediLimiti: Number(cari.krediLimiti) },
    ozet: bakiyeOzeti(faturalar),
    kovalar: yaslandirma(faturalar),
    faturalar,
    tahsilatlar,
    bildirimler: bildirimKayitlari,
    vadeUyumu: vadeUyumOrani(faturalar),
    toplamTahsilat: tahsilatlar.reduce((t, x) => t + x.tutar, 0),
  }
}

// ─────────────────────────── Bildirim kaydı ───────────────────────────

/** Gün × kanal matrisinin bir satırı. Kanal anahtarları sabit — indekslenebilir olsun. */
export type MatrisSatiri = {
  gun: string
  SMS: number
  WHATSAPP: number
  EMAIL: number
  CALL: number
  toplam: number
}

export async function bildirimSayfasi(opts: {
  kanal?: string
  gun?: string
  sayfa?: number
  sayfaBoyu?: number
}) {
  const sayfaBoyu = opts.sayfaBoyu ?? 50
  const sayfa = Math.max(1, opts.sayfa ?? 1)

  // Filtre: kanal ve/veya tek gün
  const where: Record<string, unknown> = {}
  if (opts.kanal) where.kanal = opts.kanal
  if (opts.gun) {
    const bas = new Date(`${opts.gun}T00:00:00.000Z`)
    where.gonderimZamani = { gte: bas, lt: new Date(bas.getTime() + 86_400_000) }
  }

  const [kayitlar, toplam, tumBild] = await Promise.all([
    prisma.reminder.findMany({
      where,
      orderBy: { gonderimZamani: 'desc' },
      skip: (sayfa - 1) * sayfaBoyu,
      take: sayfaBoyu,
      include: {
        customer: { select: { kod: true, ad: true } },
        invoice: { select: { faturaNo: true } },
      },
    }),
    prisma.reminder.count({ where }),
    tumBildirimler(),
  ])

  // Gün × kanal matrisi — son 14 gün
  const onDortGunOnce = new Date(BUGUN.getTime() - 13 * 86_400_000)
  const gunler = gunlereDagit(tumBild, (b) => b.gonderimZamani, onDortGunOnce, BUGUN)
  const matris: MatrisSatiri[] = [...gunler.entries()]
    .map(([gun, liste]) => {
      const sayim: Record<string, number> = { SMS: 0, WHATSAPP: 0, EMAIL: 0, CALL: 0 }
      for (const b of liste) sayim[b.kanal] = (sayim[b.kanal] ?? 0) + 1
      return {
        gun,
        SMS: sayim.SMS,
        WHATSAPP: sayim.WHATSAPP,
        EMAIL: sayim.EMAIL,
        CALL: sayim.CALL,
        toplam: liste.length,
      }
    })
    .reverse()

  return { kayitlar, toplam, sayfa, sayfaBoyu, matris }
}

// ────────────────────────── Tahsilat listesi ──────────────────────────

export async function tahsilatSayfasi(opts: {
  yontem?: string
  sayfa?: number
  sayfaBoyu?: number
}) {
  const sayfaBoyu = opts.sayfaBoyu ?? 50
  const sayfa = Math.max(1, opts.sayfa ?? 1)
  const where = opts.yontem ? { yontem: opts.yontem as never } : {}

  const [kayitlar, toplam, hepsi] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { odemeTarihi: 'desc' },
      skip: (sayfa - 1) * sayfaBoyu,
      take: sayfaBoyu,
      include: {
        customer: { select: { kod: true, ad: true } },
        invoice: { select: { faturaNo: true, vadeTarihi: true } },
      },
    }),
    prisma.payment.count({ where }),
    tumTahsilatlar(),
  ])

  // Yönteme göre dağılım (tüm dönem)
  const yontemHarita = new Map<string, { adet: number; tutar: number }>()
  const tumKayitlar = await prisma.payment.findMany({ select: { yontem: true, tutar: true } })
  for (const t of tumKayitlar) {
    const mevcut = yontemHarita.get(t.yontem) ?? { adet: 0, tutar: 0 }
    mevcut.adet += 1
    mevcut.tutar += Number(t.tutar)
    yontemHarita.set(t.yontem, mevcut)
  }

  // Son 30 günün günlük tahsilat toplamı
  const otuzGunOnce = new Date(BUGUN.getTime() - 29 * 86_400_000)
  const gunler = gunlereDagit(hepsi, (t) => t.odemeTarihi, otuzGunOnce, BUGUN)
  const gunluk = [...gunler.entries()].map(([gun, liste]) => ({
    gun,
    tutar: liste.reduce((t, x) => t + x.tutar, 0),
    adet: liste.length,
  }))

  return {
    kayitlar: kayitlar.map((k) => ({ ...k, tutar: Number(k.tutar) })),
    toplam,
    sayfa,
    sayfaBoyu,
    yontemler: [...yontemHarita.entries()]
      .map(([yontem, v]) => ({ yontem, ...v }))
      .sort((a, b) => b.tutar - a.tutar),
    gunluk,
    genelToplam: hepsi.reduce((t, x) => t + x.tutar, 0),
  }
}

// ──────────────────────────────── Raporlar ────────────────────────────────

/** 1) Günlük Faaliyet Raporu — "bugün kaç hatırlatma, kaç ödeme". */
export async function gunlukFaaliyet(gun: string) {
  const bas = new Date(`${gun}T00:00:00.000Z`)
  const bit = new Date(bas.getTime() + 86_400_000)

  const [bildirimler, tahsilatlar] = await Promise.all([
    prisma.reminder.findMany({
      where: { gonderimZamani: { gte: bas, lt: bit } },
      orderBy: { gonderimZamani: 'asc' },
      include: {
        customer: { select: { kod: true, ad: true } },
        invoice: { select: { faturaNo: true } },
      },
    }),
    prisma.payment.findMany({
      where: { odemeTarihi: { gte: bas, lt: bit } },
      orderBy: { odemeTarihi: 'asc' },
      include: {
        customer: { select: { kod: true, ad: true } },
        invoice: { select: { faturaNo: true, vadeTarihi: true } },
      },
    }),
  ])

  const kanalSayim = new Map<string, number>()
  for (const b of bildirimler) kanalSayim.set(b.kanal, (kanalSayim.get(b.kanal) ?? 0) + 1)

  const durumSayim = new Map<string, number>()
  for (const b of bildirimler) durumSayim.set(b.durum, (durumSayim.get(b.durum) ?? 0) + 1)

  const yontemSayim = new Map<string, { adet: number; tutar: number }>()
  for (const t of tahsilatlar) {
    const m = yontemSayim.get(t.yontem) ?? { adet: 0, tutar: 0 }
    m.adet += 1
    m.tutar += Number(t.tutar)
    yontemSayim.set(t.yontem, m)
  }

  return {
    gun,
    bildirimler,
    tahsilatlar: tahsilatlar.map((t) => ({ ...t, tutar: Number(t.tutar) })),
    // Kaç FARKLI cariye ulaşıldı — "kaç kişiye hatırlatma yaptık" sorusunun
    // doğru cevabı bildirim adedi değil, tekil cari adedidir.
    ulasilanCari: new Set(bildirimler.map((b) => b.customerId)).size,
    odeyenCari: new Set(tahsilatlar.map((t) => t.customerId)).size,
    tahsilatToplami: tahsilatlar.reduce((t, x) => t + Number(x.tutar), 0),
    kanallar: [...kanalSayim.entries()].map(([kanal, adet]) => ({ kanal, adet })),
    durumlar: [...durumSayim.entries()].map(([durum, adet]) => ({ durum, adet })),
    yontemler: [...yontemSayim.entries()].map(([yontem, v]) => ({ yontem, ...v })),
  }
}

/** 2) Cari Yaşlandırma Raporu — kova × segment kırılımı. */
export async function yaslandirmaRaporu() {
  const [faturalar, cariler] = await Promise.all([
    tumFaturalar(),
    prisma.customer.findMany({ select: { id: true, kod: true, ad: true, segment: true, sehir: true, temsilci: true } }),
  ])

  const cariHarita = new Map(cariler.map((c) => [c.id, c]))
  const kovalar = yaslandirma(faturalar)

  // Segment × kova matrisi
  const segmentler = [...new Set(cariler.map((c) => c.segment))]
  const segmentSatirlari = segmentler.map((segment) => {
    const segFaturalar = faturalar.filter(
      (f) => cariHarita.get(f.customerId)?.segment === segment,
    )
    const sOzet = bakiyeOzeti(segFaturalar)
    return {
      segment,
      cariAdedi: cariler.filter((c) => c.segment === segment).length,
      acikBakiye: sOzet.acikBakiye,
      vadesiGecen: sOzet.vadesiGecen,
      agirlikliGecikme: sOzet.agirlikliGecikmeGunu,
      kovalar: yaslandirma(segFaturalar),
    }
  })

  // Vadesi geçen bakiyesi olan tüm cariler, gecikmeye göre
  const cariSatirlari = cariler
    .map((c) => {
      const cf = faturalar.filter((f) => f.customerId === c.id)
      const o = bakiyeOzeti(cf)
      return {
        ...c,
        acikBakiye: o.acikBakiye,
        vadesiGecen: o.vadesiGecen,
        agirlikliGecikme: o.agirlikliGecikmeGunu,
        enYuksekGecikme: cf.reduce((m, f) => Math.max(m, gecikmeGunu(f)), 0),
      }
    })
    .filter((c) => c.vadesiGecen > 0)
    .sort((a, b) => b.vadesiGecen - a.vadesiGecen)

  return {
    ozet: bakiyeOzeti(faturalar),
    kovalar,
    segmentSatirlari,
    cariSatirlari,
  }
}

/** 3) Bildirim Etkinlik Raporu — hangi kanal para getiriyor. */
export async function etkinlikRaporu(baslangic: string, bitis: string) {
  const bas = new Date(`${baslangic}T00:00:00.000Z`)
  const bit = new Date(`${bitis}T23:59:59.999Z`)

  const [bildirimler, tahsilatlar] = await Promise.all([
    prisma.reminder.findMany({
      where: { gonderimZamani: { gte: bas, lte: bit } },
      select: { customerId: true, kanal: true, gonderimZamani: true, durum: true, gonderimdekiGecikmeGunu: true },
    }),
    prisma.payment.findMany({
      where: { odemeTarihi: { gte: bas, lte: new Date(bit.getTime() + 5 * 86_400_000) } },
      select: { customerId: true, odemeTarihi: true, tutar: true },
    }),
  ])

  const tahsilatSayilar = tahsilatlar.map((t) => ({ ...t, tutar: Number(t.tutar) }))

  // Atıf BİR KEZ, bildirimlerin tamamı üzerinden hesaplanır. Her gruplama bu
  // sonucu böler — dilim başına yeniden hesaplanırsa her dilim aynı tahsilatı
  // kendine yazar ve dilim oranları genel orandan büyük çıkar.
  const atiflar = tahsilatAtiflari(bildirimler, tahsilatSayilar)
  const kanallar = kanalEtkinligi(bildirimler, atiflar)

  // Gecikme aralığına göre etkinlik: "kaç gün gecikmede vurmak işe yarıyor"
  const araliklar = [
    { etiket: 'Vade öncesi', alt: -999, ust: -1 },
    { etiket: '1-10 gün', alt: 0, ust: 10 },
    { etiket: '11-30 gün', alt: 11, ust: 30 },
    { etiket: '31-60 gün', alt: 31, ust: 60 },
    { etiket: '60+ gün', alt: 61, ust: 9999 },
  ]

  const aralikta = (gecikme: number | undefined, alt: number, ust: number) =>
    gecikme !== undefined && gecikme >= alt && gecikme <= ust

  const aralikSatirlari = araliklar.map((a) => {
    const gonderim = bildirimler.filter((b) =>
      aralikta(b.gonderimdekiGecikmeGunu, a.alt, a.ust),
    ).length
    const dilimAtiflari = atiflar.filter((x) =>
      aralikta(x.bildirim.gonderimdekiGecikmeGunu, a.alt, a.ust),
    )
    return {
      etiket: a.etiket,
      gonderim,
      donusen: dilimAtiflari.length,
      atfedilenTutar: dilimAtiflari.reduce((t, x) => t + x.tutar, 0),
      donusumOrani:
        gonderim === 0 ? 0 : Math.round((dilimAtiflari.length / gonderim) * 1000) / 10,
    }
  })

  // Teslim durumu dağılımı
  const durumSayim = new Map<string, number>()
  for (const b of bildirimler) durumSayim.set(b.durum, (durumSayim.get(b.durum) ?? 0) + 1)

  return {
    baslangic,
    bitis,
    toplamBildirim: bildirimler.length,
    kanallar,
    aralikSatirlari,
    durumlar: [...durumSayim.entries()].map(([durum, adet]) => ({ durum, adet })),
  }
}

/** 4) Tahsilat Performans Raporu — dönem tahsilatı ve vade uyumu. */
export async function performansRaporu(baslangic: string, bitis: string) {
  const bas = new Date(`${baslangic}T00:00:00.000Z`)
  const bit = new Date(`${bitis}T23:59:59.999Z`)

  const [tahsilatlar, faturalar, cariler] = await Promise.all([
    prisma.payment.findMany({
      where: { odemeTarihi: { gte: bas, lte: bit } },
      select: { customerId: true, tutar: true, yontem: true, odemeTarihi: true },
    }),
    tumFaturalar(),
    prisma.customer.findMany({ select: { id: true, kod: true, ad: true, segment: true, temsilci: true } }),
  ])

  const cariHarita = new Map(cariler.map((c) => [c.id, c]))

  // Dönem içinde KAPANAN faturalar — vade uyumu bunlardan ölçülür.
  const kapanan = faturalar.filter(
    (f) => f.kapanmaTarihi && f.kapanmaTarihi >= bas && f.kapanmaTarihi <= bit,
  )

  const gecikmeler = kapanan
    .map((f) => odemeGecikmesi(f))
    .filter((g): g is number => g !== null)

  const donemTahsilat = tahsilatlar.reduce((t, x) => t + Number(x.tutar), 0)

  // Cari bazında dönem performansı
  const cariPerformans = new Map<string, { tahsilat: number; kapanan: number; gecikmeToplam: number }>()
  for (const t of tahsilatlar) {
    const m = cariPerformans.get(t.customerId) ?? { tahsilat: 0, kapanan: 0, gecikmeToplam: 0 }
    m.tahsilat += Number(t.tutar)
    cariPerformans.set(t.customerId, m)
  }
  for (const f of kapanan) {
    const m = cariPerformans.get(f.customerId) ?? { tahsilat: 0, kapanan: 0, gecikmeToplam: 0 }
    m.kapanan += 1
    m.gecikmeToplam += odemeGecikmesi(f) ?? 0
    cariPerformans.set(f.customerId, m)
  }

  const cariSatirlari = [...cariPerformans.entries()]
    .map(([id, v]) => ({
      kod: cariHarita.get(id)?.kod ?? '',
      ad: cariHarita.get(id)?.ad ?? '',
      segment: cariHarita.get(id)?.segment ?? '',
      temsilci: cariHarita.get(id)?.temsilci ?? '',
      tahsilat: v.tahsilat,
      kapananFatura: v.kapanan,
      ortGecikme: v.kapanan === 0 ? null : Math.round(v.gecikmeToplam / v.kapanan),
    }))
    .sort((a, b) => b.tahsilat - a.tahsilat)

  // Temsilci bazında toplam — satış ekibi performansı
  const temsilciHarita = new Map<string, number>()
  for (const t of tahsilatlar) {
    const temsilci = cariHarita.get(t.customerId)?.temsilci ?? '—'
    temsilciHarita.set(temsilci, (temsilciHarita.get(temsilci) ?? 0) + Number(t.tutar))
  }

  return {
    baslangic,
    bitis,
    donemTahsilat,
    tahsilatAdedi: tahsilatlar.length,
    kapananFatura: kapanan.length,
    vadeUyumu: vadeUyumOrani(kapanan),
    ortGecikme:
      gecikmeler.length === 0
        ? 0
        : Math.round(gecikmeler.reduce((t, g) => t + g, 0) / gecikmeler.length),
    cariSatirlari,
    temsilciler: [...temsilciHarita.entries()]
      .map(([temsilci, tutar]) => ({ temsilci, tutar }))
      .sort((a, b) => b.tutar - a.tutar),
  }
}

export { gunFarki }
