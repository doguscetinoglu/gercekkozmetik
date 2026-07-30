import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import { BUGUN } from '@/lib/brand'
import { sayi, segmentAdi, tarih, tarihAcik, tl, tlKisa } from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { cariOzetleri, filtreSecenekleri, type CariOzet } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: 'Cari Hesaplar — Gerçek Kozmetik' }

const SEGMENTLER = ['BAYI', 'ZINCIR', 'ECZANE', 'ONLINE', 'IHRACAT'] as const

const GECIKME_ARALIKLARI = [
  { deger: '', etiket: 'Tümü' },
  { deger: 'guncel', etiket: 'Gecikmesi yok' },
  { deger: '1-30', etiket: '1-30 gün' },
  { deger: '31-60', etiket: '31-60 gün' },
  { deger: '61-90', etiket: '61-90 gün' },
  { deger: '90+', etiket: '90+ gün' },
] as const

/** Seçilen gecikme aralığına göre cariyi süzer. */
function gecikmeUyuyor(cari: CariOzet, aralik: string): boolean {
  const g = cari.enYuksekGecikme
  switch (aralik) {
    case 'guncel': return g === 0
    case '1-30': return g >= 1 && g <= 30
    case '31-60': return g >= 31 && g <= 60
    case '61-90': return g >= 61 && g <= 90
    case '90+': return g > 90
    default: return true
  }
}

const SIRALAMALAR = {
  vadesiGecen: (a: CariOzet, b: CariOzet) => b.vadesiGecen - a.vadesiGecen,
  bakiye: (a: CariOzet, b: CariOzet) => b.acikBakiye - a.acikBakiye,
  gecikme: (a: CariOzet, b: CariOzet) => b.enYuksekGecikme - a.enYuksekGecikme,
  kod: (a: CariOzet, b: CariOzet) => a.kod.localeCompare(b.kod, 'tr'),
  ad: (a: CariOzet, b: CariOzet) => a.ad.localeCompare(b.ad, 'tr'),
} as const

type SiralamaAnahtar = keyof typeof SIRALAMALAR

export default async function CarilerSayfasi(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Next 16: searchParams artık Promise.
  const sp = await props.searchParams
  const tek = (a: string) => (Array.isArray(sp[a]) ? sp[a]![0] : (sp[a] as string | undefined)) ?? ''

  const segment = tek('segment')
  const sehir = tek('sehir')
  const temsilci = tek('temsilci')
  const gecikme = tek('gecikme')
  const arama = tek('q').trim().toLocaleLowerCase('tr-TR')
  const sirala = (tek('sirala') || 'vadesiGecen') as SiralamaAnahtar

  const [hepsi, secenekler] = await Promise.all([cariOzetleri(), filtreSecenekleri()])

  const suzulmus = hepsi
    .filter((c) => !segment || c.segment === segment)
    .filter((c) => !sehir || c.sehir === sehir)
    .filter((c) => !temsilci || c.temsilci === temsilci)
    .filter((c) => gecikmeUyuyor(c, gecikme))
    .filter(
      (c) =>
        !arama ||
        c.ad.toLocaleLowerCase('tr-TR').includes(arama) ||
        c.kod.toLocaleLowerCase('tr-TR').includes(arama),
    )
    .sort(SIRALAMALAR[sirala] ?? SIRALAMALAR.vadesiGecen)

  const toplamBakiye = suzulmus.reduce((t, c) => t + c.acikBakiye, 0)
  const toplamGecen = suzulmus.reduce((t, c) => t + c.vadesiGecen, 0)
  const gecikmeliAdet = suzulmus.filter((c) => c.enYuksekGecikme > 0).length

  const rapor: PdfRapor = {
    baslik: 'Cari Hesap Listesi',
    altBaslik:
      [segment && segmentAdi(segment), sehir, temsilci, gecikme && `Gecikme: ${gecikme}`]
        .filter(Boolean)
        .join(' · ') || 'Tüm cari hesaplar',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `cari-listesi-${BUGUN.toISOString().slice(0, 10)}`,
    yatay: true,
    kpiler: [
      { etiket: 'Cari Sayısı', deger: sayi(suzulmus.length) },
      { etiket: 'Açık Bakiye', deger: tl(toplamBakiye) },
      { etiket: 'Vadesi Geçen', deger: tl(toplamGecen) },
      { etiket: 'Gecikmeli Cari', deger: sayi(gecikmeliAdet) },
    ],
    tablolar: [
      {
        basliklar: [
          'Kod', 'Cari Adı', 'Segment', 'Şehir', 'Temsilci',
          'Açık Bakiye', 'Vadesi Geçen', 'Gecikme', 'Son Bildirim', 'Son Tahsilat',
        ],
        sagSutunlar: [5, 6, 7],
        monoSutunlar: [0, 5, 6, 7, 8, 9],
        satirlar: suzulmus.map((c) => [
          c.kod,
          c.ad,
          segmentAdi(c.segment),
          c.sehir,
          c.temsilci,
          tl(c.acikBakiye),
          c.vadesiGecen > 0 ? tl(c.vadesiGecen) : '—',
          c.enYuksekGecikme > 0 ? `${c.enYuksekGecikme} gün` : '—',
          c.sonBildirim ? tarih(c.sonBildirim) : '—',
          c.sonTahsilat ? tarih(c.sonTahsilat) : '—',
        ]),
        toplamSatiri: [
          'TOPLAM', `${suzulmus.length} cari`, '', '', '',
          tl(toplamBakiye), tl(toplamGecen), '', '', '',
        ],
      },
    ],
    notlar: [
      '"Gecikme" sütunu, carinin en uzun süre gecikmiş açık faturasının gün sayısıdır.',
      'Vadesi geçen tutar, kısmi ödemeler düşüldükten sonra kalan bakiyedir.',
    ],
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="lbl block">Cari Hesaplar</span>
          <h1 className="mt-1 text-xl font-semibold">
            {sayi(suzulmus.length)} cari
            {suzulmus.length !== hepsi.length && (
              <span className="ml-2 text-sm font-normal text-ink-mute">
                / {sayi(hepsi.length)} toplam
              </span>
            )}
          </h1>
        </div>
        <PdfButton rapor={rapor} etiket="Listeyi PDF İndir" />
      </div>

      <KpiKusak>
        <Kpi etiket="Açık Bakiye" deger={tlKisa(toplamBakiye)} buyuk />
        <Kpi etiket="Vadesi Geçen" deger={tlKisa(toplamGecen)} sinif="crit" />
        <Kpi etiket="Gecikmeli Cari" deger={sayi(gecikmeliAdet)} alt={`${sayi(suzulmus.length)} cari içinde`} />
      </KpiKusak>

      {/* Filtre formu: düz GET — JavaScript kapalıyken de çalışır. */}
      <form className="border border-rule p-4">
        <h2 className="lbl mb-3">Filtreler</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="q" className="lbl mb-1.5 block">Kod veya Ad</label>
            <input id="q" name="q" type="search" defaultValue={tek('q')} className="input" placeholder="Ara…" />
          </div>
          <div>
            <label htmlFor="segment" className="lbl mb-1.5 block">Segment</label>
            <select id="segment" name="segment" defaultValue={segment} className="select">
              <option value="">Tümü</option>
              {SEGMENTLER.map((s) => (
                <option key={s} value={s}>{segmentAdi(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sehir" className="lbl mb-1.5 block">Şehir</label>
            <select id="sehir" name="sehir" defaultValue={sehir} className="select">
              <option value="">Tümü</option>
              {secenekler.sehirler.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="temsilci" className="lbl mb-1.5 block">Temsilci</label>
            <select id="temsilci" name="temsilci" defaultValue={temsilci} className="select">
              <option value="">Tümü</option>
              {secenekler.temsilciler.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gecikme" className="lbl mb-1.5 block">Gecikme</label>
            <select id="gecikme" name="gecikme" defaultValue={gecikme} className="select">
              {GECIKME_ARALIKLARI.map((g) => (
                <option key={g.deger} value={g.deger}>{g.etiket}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-ink">Uygula</button>
          <Link href="/cariler" className="btn">Temizle</Link>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="sirala" className="lbl">Sırala</label>
            <select id="sirala" name="sirala" defaultValue={sirala} className="select w-auto">
              <option value="vadesiGecen">Vadesi geçen (çok→az)</option>
              <option value="bakiye">Açık bakiye (çok→az)</option>
              <option value="gecikme">Gecikme günü (çok→az)</option>
              <option value="kod">Cari kodu</option>
              <option value="ad">Cari adı</option>
            </select>
          </div>
        </div>
      </form>

      <div className="tbl-kaydir">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Kod</th>
              <th scope="col">Cari Adı</th>
              <th scope="col">Segment</th>
              <th scope="col">Şehir</th>
              <th scope="col" className="sag">Açık Bakiye</th>
              <th scope="col" className="sag">Vadesi Geçen</th>
              <th scope="col" className="sag">Gecikme</th>
              <th scope="col" className="sag">Son Bildirim</th>
              <th scope="col" className="sag">Son Tahsilat</th>
            </tr>
          </thead>
          <tbody>
            {suzulmus.map((c) => (
              <tr key={c.id}>
                <td className="num">{c.kod}</td>
                <td>
                  <Link
                    href={`/cariler/${c.id}`}
                    className="font-medium underline underline-offset-4 decoration-rule-strong hover:decoration-ink"
                  >
                    {c.ad}
                  </Link>
                  {!c.aktif && <span className="tick t-mute ml-2">Pasif</span>}
                </td>
                <td className="text-ink-soft">{segmentAdi(c.segment)}</td>
                <td className="text-ink-soft">{c.sehir}</td>
                <td className="sag num">{tl(c.acikBakiye)}</td>
                <td className="sag num font-medium">
                  {c.vadesiGecen > 0 ? tl(c.vadesiGecen) : <span className="text-ink-mute">—</span>}
                </td>
                <td className="sag">
                  {c.enYuksekGecikme > 0 ? (
                    <span className={`tick t-${riskSinifi(c.enYuksekGecikme)}`}>
                      {c.enYuksekGecikme} gün
                    </span>
                  ) : (
                    <span className="tick t-ok">Güncel</span>
                  )}
                </td>
                <td className="sag num text-ink-soft">
                  {c.sonBildirim ? tarih(c.sonBildirim) : '—'}
                </td>
                <td className="sag num text-ink-soft">
                  {c.sonTahsilat ? tarih(c.sonTahsilat) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-rule-strong font-semibold">
              <td colSpan={4} className="pt-2">TOPLAM · {sayi(suzulmus.length)} cari</td>
              <td className="sag num pt-2">{tl(toplamBakiye)}</td>
              <td className="sag num pt-2">{tl(toplamGecen)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {suzulmus.length === 0 && (
        <p className="border border-rule p-6 text-center text-sm text-ink-mute">
          Bu filtrelerle eşleşen cari bulunamadı.
        </p>
      )}
    </div>
  )
}
