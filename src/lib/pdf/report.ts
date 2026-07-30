/**
 * PDF rapor üretici — TEK giriş noktası: `raporIndir()`.
 *
 * Neden client tarafı? jsPDF'in standart fontları Türkçe glif içermediği için
 * font gömmek zorunlu. Sunucu tarafı render (@react-pdf/renderer) Vercel'de
 * font dosyası izleme/bundling sorunu çıkarıyor. Client tarafı hem yerelde hem
 * production'da birebir aynı davranır ve tıklama → anında indirme olur.
 *
 * Fontlar `await import()` ile TEMBEL yüklenir: 147KB'lık base64 yığını ilk PDF
 * tıklamasına kadar bundle'a girmez.
 *
 * Görsel dil ekrandakiyle aynı ("Kasa Defteri"): gölge yok, saç çizgi ayrımlar,
 * mono rakamlar, sinyal renkleri sadece durum için.
 */

import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { MARKA } from '@/lib/brand'

// ─────────────────────────── Tip sözleşmesi ───────────────────────────

export type PdfTablo = {
  baslik?: string
  basliklar: string[]
  satirlar: (string | number)[][]
  /** Sağa yaslanacak sütun indeksleri (tutar/adet sütunları). */
  sagSutunlar?: number[]
  /** Mono font kullanılacak sütun indeksleri (rakam sütunları). */
  monoSutunlar?: number[]
  /** Tablo altındaki toplam satırı. */
  toplamSatiri?: (string | number)[]
}

export type PdfKpi = {
  etiket: string
  deger: string
  alt?: string
}

export type PdfRapor = {
  baslik: string
  altBaslik?: string
  donem?: string
  kpiler?: PdfKpi[]
  tablolar: PdfTablo[]
  /** Sayfa sonundaki açıklama notları (metodoloji, uyarı vb.). */
  notlar?: string[]
  /** Çok sütunlu raporlar için yatay sayfa. */
  yatay?: boolean
  /** İndirilecek dosya adı (uzantısız). */
  dosyaAdi: string
}

// ─────────────────────────── Tasarım sabitleri ───────────────────────────

/** Ekrandaki paletin PDF karşılığı (RGB). */
const MUREKKEP: [number, number, number] = [21, 23, 27]
const MUREKKEP_SOFT: [number, number, number] = [74, 78, 87]
const MUREKKEP_MUTE: [number, number, number] = [104, 109, 117]
const CIZGI: [number, number, number] = [206, 203, 194]
const CIZGI_GUCLU: [number, number, number] = [150, 147, 138]
const KAGIT_2: [number, number, number] = [243, 241, 234]

const KENAR = 42 // sayfa kenar boşluğu (pt)

const FONT = 'Plex'
const FONT_MONO = 'PlexMono'

/** Base64 yığını bir kez indirilip önbelleğe alınır; her doküman buradan besleniyor. */
let fontVerisi: { normal: string; bold: string; mono: string } | null = null

/** Font base64'lerini bir kez indirir ve bellekte tutar. */
async function fontlariGetir() {
  if (fontVerisi) return fontVerisi
  const [normal, bold, mono] = await Promise.all([
    import('./font-normal'),
    import('./font-bold'),
    import('./font-mono'),
  ])
  fontVerisi = {
    normal: normal.PLEX_NORMAL_BASE64,
    bold: bold.PLEX_BOLD_BASE64,
    mono: mono.PLEX_MONO_BASE64,
  }
  return fontVerisi
}

async function fontlariKaydet(doc: jsPDF) {
  const f = await fontlariGetir()

  doc.addFileToVFS('Plex-normal.ttf', f.normal)
  doc.addFont('Plex-normal.ttf', FONT, 'normal')
  doc.addFileToVFS('Plex-bold.ttf', f.bold)
  doc.addFont('Plex-bold.ttf', FONT, 'bold')
  doc.addFileToVFS('PlexMono-normal.ttf', f.mono)
  doc.addFont('PlexMono-normal.ttf', FONT_MONO, 'normal')

  doc.setFont(FONT, 'normal')
}

// ─────────────────────────── Çizim yardımcıları ───────────────────────────

/** 0.5pt saç çizgi — PDF'teki tüm ayrımlar bununla yapılır, çerçeve/gölge yok. */
function sacCizgi(doc: jsPDF, y: number, x1: number, x2: number, guclu = false) {
  doc.setDrawColor(...(guclu ? CIZGI_GUCLU : CIZGI))
  doc.setLineWidth(guclu ? 0.7 : 0.4)
  doc.line(x1, y, x2, y)
}

/** Harf aralıklı büyük harf bölüm etiketi — ekrandaki .lbl'in karşılığı. */
function etiket(doc: jsPDF, metin: string, x: number, y: number, boyut = 7) {
  doc.setFont(FONT, 'bold')
  doc.setFontSize(boyut)
  doc.setTextColor(...MUREKKEP_MUTE)
  doc.text(metin.toLocaleUpperCase('tr-TR'), x, y, { charSpace: 0.8 })
}

/**
 * Antet — her sayfanın değil, yalnızca ilk sayfanın üstünde.
 * Firma adı + sistem adı + rapor başlığı + dönem.
 */
function antetCiz(doc: jsPDF, rapor: PdfRapor, genislik: number): number {
  let y = KENAR

  // Üst şerit: hafif kağıt dolgusu, çerçevesiz
  doc.setFillColor(...KAGIT_2)
  doc.rect(0, 0, genislik, KENAR - 14, 'F')

  doc.setFont(FONT, 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUREKKEP)
  doc.text(MARKA.firma.toLocaleUpperCase('tr-TR'), KENAR, 18, { charSpace: 1.1 })

  doc.setFont(FONT, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUREKKEP_MUTE)
  doc.text(MARKA.sistem, genislik - KENAR, 18, { align: 'right' })

  y += 6

  // Rapor başlığı — sayfanın en büyük tipografik öğesi
  doc.setFont(FONT, 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...MUREKKEP)
  doc.text(rapor.baslik, KENAR, y)
  y += 15

  if (rapor.altBaslik) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUREKKEP_SOFT)
    doc.text(rapor.altBaslik, KENAR, y)
    y += 12
  }

  // Dönem ve oluşturma zamanı aynı satırda, karşı karşıya
  const olusturma = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  doc.setFont(FONT_MONO, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUREKKEP_MUTE)
  if (rapor.donem) doc.text(rapor.donem, KENAR, y)
  doc.setFont(FONT, 'normal')
  doc.text(`Oluşturma: ${olusturma}`, genislik - KENAR, y, { align: 'right' })

  y += 8
  sacCizgi(doc, y, KENAR, genislik - KENAR, true)

  return y + 20
}

/**
 * KPI şeridi — rakamlar büyük ve mono. Ekrandaki KPI bloğunun karşılığı.
 * Kartlara bölünmez; dikey saç çizgilerle ayrılır.
 */
function kpiCiz(doc: jsPDF, kpiler: PdfKpi[], y: number, genislik: number): number {
  const kullanilabilir = genislik - KENAR * 2
  const sutunGenisligi = kullanilabilir / kpiler.length

  kpiler.forEach((kpi, i) => {
    const x = KENAR + i * sutunGenisligi

    // İlk sütun hariç sol tarafa dikey ayraç
    if (i > 0) {
      doc.setDrawColor(...CIZGI)
      doc.setLineWidth(0.4)
      doc.line(x - 8, y - 8, x - 8, y + 26)
    }

    etiket(doc, kpi.etiket, x, y, 6.5)

    doc.setFont(FONT_MONO, 'normal')
    doc.setFontSize(16)
    doc.setTextColor(...MUREKKEP)
    doc.text(kpi.deger, x, y + 18)

    if (kpi.alt) {
      doc.setFont(FONT, 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...MUREKKEP_MUTE)
      doc.text(kpi.alt, x, y + 28)
    }
  })

  const alt = y + 40
  sacCizgi(doc, alt, KENAR, genislik - KENAR)
  return alt + 18
}

/** Altbilgi: sayfa numarası + demo uyarısı. Tüm sayfalara sonradan basılır. */
function altbilgiCiz(doc: jsPDF, genislik: number, yukseklik: number) {
  const sayfaSayisi = doc.getNumberOfPages()

  for (let s = 1; s <= sayfaSayisi; s++) {
    doc.setPage(s)
    const y = yukseklik - 22

    sacCizgi(doc, y, KENAR, genislik - KENAR)

    doc.setFont(FONT, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUREKKEP_MUTE)
    doc.text(MARKA.tamAd, KENAR, y + 11)

    doc.setFont(FONT_MONO, 'normal')
    doc.text(`${s} / ${sayfaSayisi}`, genislik - KENAR, y + 11, { align: 'right' })
  }
}

// ─────────────────────────────── Ana fonksiyon ───────────────────────────────

export async function raporIndir(rapor: PdfRapor): Promise<void> {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: rapor.yatay ? 'landscape' : 'portrait',
  })

  // Her doküman kendi VFS'ine fontu eklemek zorunda; base64 verisi önbellekten gelir.
  await fontlariKaydet(doc)

  const genislik = doc.internal.pageSize.getWidth()
  const yukseklik = doc.internal.pageSize.getHeight()

  let y = antetCiz(doc, rapor, genislik)

  if (rapor.kpiler?.length) {
    y = kpiCiz(doc, rapor.kpiler, y, genislik)
  }

  for (const tablo of rapor.tablolar) {
    if (tablo.baslik) {
      // Başlık için sayfa sonunda yer kalmadıysa yeni sayfaya geç —
      // yoksa başlık bir sayfada, tablosu diğerinde kalır.
      if (y > yukseklik - 110) {
        doc.addPage()
        y = KENAR
      }
      etiket(doc, tablo.baslik, KENAR, y)
      y += 6
      sacCizgi(doc, y, KENAR, genislik - KENAR, true)
      y += 10
    }

    const sagSet = new Set(tablo.sagSutunlar ?? [])
    const monoSet = new Set(tablo.monoSutunlar ?? [])

    autoTable(doc, {
      startY: y,
      margin: { left: KENAR, right: KENAR, bottom: 46 },
      head: [tablo.basliklar],
      body: tablo.satirlar.map((satir) => satir.map((h) => String(h))),
      foot: tablo.toplamSatiri
        ? [tablo.toplamSatiri.map((h) => String(h))]
        : undefined,
      // "plain" tema + elle çizilen alt çizgiler = saç çizgi dili.
      theme: 'plain',
      styles: {
        font: FONT,
        fontSize: 7.8,
        cellPadding: { top: 4.5, right: 5, bottom: 4.5, left: 5 },
        textColor: MUREKKEP,
        lineColor: CIZGI,
        lineWidth: { bottom: 0.4, top: 0, left: 0, right: 0 },
        overflow: 'linebreak',
      },
      headStyles: {
        font: FONT,
        fontStyle: 'bold',
        fontSize: 6.5,
        textColor: MUREKKEP_MUTE,
        lineColor: CIZGI_GUCLU,
        lineWidth: { bottom: 0.7, top: 0, left: 0, right: 0 },
        cellPadding: { top: 3, right: 5, bottom: 5, left: 5 },
      },
      footStyles: {
        font: FONT,
        fontStyle: 'bold',
        fontSize: 7.8,
        textColor: MUREKKEP,
        lineColor: CIZGI_GUCLU,
        lineWidth: { top: 0.7, bottom: 0, left: 0, right: 0 },
        fillColor: false,
      },
      // Rakam sütunları: sağa yaslı + mono font.
      didParseCell: (veri) => {
        const sutun = veri.column.index
        if (sagSet.has(sutun)) veri.cell.styles.halign = 'right'
        if (monoSet.has(sutun) && veri.section !== 'head') {
          veri.cell.styles.font = FONT_MONO
        }
      },
    })

    const sonY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY
    y = (sonY ?? y) + 24
  }

  if (rapor.notlar?.length) {
    if (y > yukseklik - 80) {
      doc.addPage()
      y = KENAR
    }
    etiket(doc, 'Yöntem ve Notlar', KENAR, y)
    y += 12
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...MUREKKEP_SOFT)
    for (const not of rapor.notlar) {
      const satirlar = doc.splitTextToSize(`•  ${not}`, genislik - KENAR * 2)
      doc.text(satirlar, KENAR, y)
      y += satirlar.length * 9.5 + 3
    }
  }

  altbilgiCiz(doc, genislik, yukseklik)
  doc.save(`${rapor.dosyaAdi}.pdf`)
}
