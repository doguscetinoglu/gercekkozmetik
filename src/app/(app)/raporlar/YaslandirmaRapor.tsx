import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import RiskBand from '@/components/RiskBand'
import { BUGUN } from '@/lib/brand'
import { sayi, segmentAdi, tarihAcik, tl, tlKisa } from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { yaslandirmaRaporu } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

type Veri = Awaited<ReturnType<typeof yaslandirmaRaporu>>

/**
 * CARİ YAŞLANDIRMA RAPORU — "toplam geçen bakiye tutarı ve günü".
 * Kova dağılımı + segment kırılımı + cari bazlı döküm.
 */
export default function YaslandirmaRapor({ veri }: { veri: Veri }) {
  const { ozet, kovalar, segmentSatirlari, cariSatirlari } = veri

  const rapor: PdfRapor = {
    baslik: 'Cari Yaşlandırma Raporu',
    altBaslik: 'Açık bakiyenin gecikme kovalarına dağılımı',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `yaslandirma-${BUGUN.toISOString().slice(0, 10)}`,
    yatay: true,
    kpiler: [
      { etiket: 'Açık Bakiye', deger: tl(ozet.acikBakiye), alt: `${ozet.acikFaturaAdedi} fatura` },
      { etiket: 'Vadesi Geçen', deger: tl(ozet.vadesiGecen), alt: `${ozet.vadesiGecenAdedi} fatura` },
      { etiket: 'Vadesi Gelmemiş', deger: tl(ozet.vadesiGelmemis) },
      { etiket: 'Ağırlıklı Gecikme', deger: `${ozet.agirlikliGecikmeGunu} gün` },
      { etiket: 'Gecikmeli Cari', deger: sayi(cariSatirlari.length) },
    ],
    tablolar: [
      {
        baslik: 'Kova Dağılımı',
        basliklar: ['Gecikme Aralığı', 'Fatura', 'Bakiye', 'Pay'],
        sagSutunlar: [1, 2, 3],
        monoSutunlar: [1, 2, 3],
        satirlar: kovalar.map((k) => [
          k.etiket,
          sayi(k.adet),
          tl(k.tutar),
          ozet.acikBakiye === 0 ? '—' : `%${Math.round((k.tutar / ozet.acikBakiye) * 100)}`,
        ]),
        toplamSatiri: ['TOPLAM', sayi(ozet.acikFaturaAdedi), tl(ozet.acikBakiye), '%100'],
      },
      {
        baslik: 'Segment Kırılımı',
        basliklar: ['Segment', 'Cari', 'Açık Bakiye', 'Vadesi Geçen', 'Ağırlıklı Gecikme'],
        sagSutunlar: [1, 2, 3, 4],
        monoSutunlar: [1, 2, 3, 4],
        satirlar: segmentSatirlari.map((s) => [
          segmentAdi(s.segment),
          sayi(s.cariAdedi),
          tl(s.acikBakiye),
          tl(s.vadesiGecen),
          `${s.agirlikliGecikme} gün`,
        ]),
        toplamSatiri: [
          'TOPLAM',
          sayi(segmentSatirlari.reduce((t, s) => t + s.cariAdedi, 0)),
          tl(ozet.acikBakiye),
          tl(ozet.vadesiGecen),
          `${ozet.agirlikliGecikmeGunu} gün`,
        ],
      },
      {
        baslik: 'Vadesi Geçen Bakiyesi Olan Cariler',
        basliklar: ['Kod', 'Cari Adı', 'Segment', 'Şehir', 'Temsilci', 'Açık Bakiye', 'Vadesi Geçen', 'En Yüksek Gecikme'],
        sagSutunlar: [5, 6, 7],
        monoSutunlar: [0, 5, 6, 7],
        satirlar: cariSatirlari.map((c) => [
          c.kod,
          c.ad,
          segmentAdi(c.segment),
          c.sehir,
          c.temsilci,
          tl(c.acikBakiye),
          tl(c.vadesiGecen),
          `${c.enYuksekGecikme} gün`,
        ]),
        toplamSatiri: [
          'TOPLAM', `${cariSatirlari.length} cari`, '', '', '',
          tl(cariSatirlari.reduce((t, c) => t + c.acikBakiye, 0)),
          tl(ozet.vadesiGecen),
          '',
        ],
      },
    ],
    notlar: [
      'Kovalar faturanın vade tarihinden bugüne geçen gün sayısına göre belirlenir; kısmi ödemeler kalan bakiyeden düşülmüştür.',
      'Ağırlıklı gecikme günü Σ(kalan bakiye × gecikme günü) / Σ(kalan bakiye) formülüyle hesaplanır.',
    ],
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <PdfButton rapor={rapor} etiket="Yaşlandırma Raporu İndir" birincil />
      </div>

      <KpiKusak>
        <Kpi etiket="Açık Bakiye" deger={tlKisa(ozet.acikBakiye)} alt={`${sayi(ozet.acikFaturaAdedi)} fatura`} buyuk />
        <Kpi etiket="Vadesi Geçen" deger={tlKisa(ozet.vadesiGecen)} alt={`${sayi(ozet.vadesiGecenAdedi)} fatura`} sinif="crit" />
        <Kpi etiket="Vadesi Gelmemiş" deger={tlKisa(ozet.vadesiGelmemis)} sinif="ok" />
        <Kpi
          etiket="Ağırlıklı Gecikme"
          deger={`${ozet.agirlikliGecikmeGunu} gün`}
          alt="tutarla ağırlıklı"
          sinif={riskSinifi(ozet.agirlikliGecikmeGunu)}
        />
        <Kpi etiket="Gecikmeli Cari" deger={sayi(cariSatirlari.length)} />
      </KpiKusak>

      <div>
        <div className="panel-head">
          <h3 className="lbl">Risk Şeridi</h3>
        </div>
        <RiskBand kovalar={kovalar} />
      </div>

      <div>
        <div className="panel-head">
          <h3 className="lbl">Segment Kırılımı</h3>
        </div>
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Segment</th>
                <th scope="col" className="sag">Cari</th>
                <th scope="col" className="sag">Açık Bakiye</th>
                <th scope="col" className="sag">Vadesi Geçen</th>
                <th scope="col" className="sag">Ağırlıklı Gecikme</th>
              </tr>
            </thead>
            <tbody>
              {segmentSatirlari.map((s) => (
                <tr key={s.segment}>
                  <td className="font-medium">{segmentAdi(s.segment)}</td>
                  <td className="sag num">{sayi(s.cariAdedi)}</td>
                  <td className="sag num">{tl(s.acikBakiye)}</td>
                  <td className="sag num">{tl(s.vadesiGecen)}</td>
                  <td className="sag">
                    <span className={`tick t-${riskSinifi(s.agirlikliGecikme)}`}>
                      {s.agirlikliGecikme} gün
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-rule-strong font-semibold">
                <td className="pt-2">TOPLAM</td>
                <td className="sag num pt-2">
                  {sayi(segmentSatirlari.reduce((t, s) => t + s.cariAdedi, 0))}
                </td>
                <td className="sag num pt-2">{tl(ozet.acikBakiye)}</td>
                <td className="sag num pt-2">{tl(ozet.vadesiGecen)}</td>
                <td className="sag num pt-2">{ozet.agirlikliGecikmeGunu} gün</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <div className="panel-head">
          <h3 className="lbl">Vadesi Geçen Bakiyesi Olan Cariler</h3>
          <span className="num text-xs text-ink-mute">{sayi(cariSatirlari.length)} cari</span>
        </div>
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kod</th>
                <th scope="col">Cari Adı</th>
                <th scope="col">Segment</th>
                <th scope="col">Temsilci</th>
                <th scope="col" className="sag">Açık Bakiye</th>
                <th scope="col" className="sag">Vadesi Geçen</th>
                <th scope="col" className="sag">En Yüksek Gecikme</th>
              </tr>
            </thead>
            <tbody>
              {cariSatirlari.slice(0, 50).map((c) => (
                <tr key={c.id}>
                  <td className="num">{c.kod}</td>
                  <td>
                    <Link
                      href={`/cariler/${c.id}`}
                      className="font-medium underline underline-offset-4 decoration-rule-strong hover:decoration-ink"
                    >
                      {c.ad}
                    </Link>
                  </td>
                  <td className="text-ink-soft">{segmentAdi(c.segment)}</td>
                  <td className="text-ink-soft">{c.temsilci}</td>
                  <td className="sag num">{tl(c.acikBakiye)}</td>
                  <td className="sag num font-medium">{tl(c.vadesiGecen)}</td>
                  <td className="sag">
                    <span className={`tick t-${riskSinifi(c.enYuksekGecikme)}`}>
                      {c.enYuksekGecikme} gün
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cariSatirlari.length > 50 && (
          <p className="mt-2 text-xs text-ink-mute">
            En yüksek 50 cari gösteriliyor; tamamı ({sayi(cariSatirlari.length)} cari) PDF raporunda.
          </p>
        )}
      </div>
    </div>
  )
}
