/**
 * PDF fontu üretici — bir kez çalıştırılır, çıktısı repoya commit edilir.
 *
 * jsPDF'in standart 14 fontu Türkçe glifleri (ğ ş ı İ) içermez; Türkçe metin
 * bozuk basılır. Çözüm: TTF'i base64 gömmek. Tam TTF 200KB olduğu için
 * harfbuzz (subset-font) ile yalnızca kullandığımız karakter kümesine indirilir.
 *
 * Kullanım: node scripts/font-uret.mjs
 */
import subsetFont from 'subset-font'
import { writeFile } from 'node:fs/promises'

const SANS = 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/ttf'
const MONO = 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-mono/fonts/complete/ttf'

/**
 * Alt kümede tutulacak karakterler.
 * Türkçe küçük/büyük harfler + para birimi + tipografik işaretler dahil.
 * Eksik bir karakter PDF'te sessizce kaybolur, o yüzden liste cömert tutuldu.
 */
const KARAKTERLER = [
  // ASCII yazdırılabilir
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  // Türkçe
  'ğĞüÜşŞıİöÖçÇâÂîÎûÛ',
  // Para birimi ve semboller
  '₺€$₼',
  // Tipografik
  '–—‘’“”•·…°±≥≤→',
].join('')

/**
 * Mono yalnızca RAKAM ve işaret basar (tutar/tarih/yüzde sütunları). Harf
 * gerekmediği için alt kümesi çok daha küçük tutulabilir.
 */
const MONO_KARAKTERLER = '0123456789.,%-–—/₺€ ()+:'

const URETILECEKLER = [
  { kaynak: SANS, dosya: 'IBMPlexSans-Regular.ttf', ad: 'normal', karakterler: KARAKTERLER },
  { kaynak: SANS, dosya: 'IBMPlexSans-SemiBold.ttf', ad: 'bold', karakterler: KARAKTERLER },
  { kaynak: MONO, dosya: 'IBMPlexMono-Regular.ttf', ad: 'mono', karakterler: MONO_KARAKTERLER },
]

for (const { kaynak, dosya, ad, karakterler } of URETILECEKLER) {
  const yanit = await fetch(`${kaynak}/${dosya}`)
  if (!yanit.ok) throw new Error(`${dosya} indirilemedi: ${yanit.status}`)

  const tam = Buffer.from(await yanit.arrayBuffer())
  const kucuk = await subsetFont(tam, karakterler, { targetFormat: 'truetype' })

  const base64 = kucuk.toString('base64')
  const cikti = `// OTOMATİK ÜRETİLDİ — scripts/font-uret.mjs ile yenilenir, elle düzenlenmez.
// ${dosya} alt kümesi (Latin + Türkçe). Lisans: OFL 1.1.
export const PLEX_${ad.toUpperCase()}_BASE64 =
  '${base64}'
`

  await writeFile(`src/lib/pdf/font-${ad}.ts`, cikti, 'utf8')
  console.log(
    `${dosya}: ${(tam.length / 1024).toFixed(0)}KB → ${(kucuk.length / 1024).toFixed(0)}KB ` +
      `(base64 ${(base64.length / 1024).toFixed(0)}KB)`,
  )
}
