import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import { sayi, segmentAdi, tarih, tl, tlKisa, yuzde } from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { performansRaporu } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

type Veri = Awaited<ReturnType<typeof performansRaporu>>

/**
 * TAHSİLAT PERFORMANS RAPORU — dönem tahsilatı, vade uyumu, temsilci kırılımı,
 * en iyi ve en kötü ödeyen cariler.
 */
export default function PerformansRapor({ veri }: { veri: Veri }) {
  // Ortalama gecikmesi hesaplanabilen carileri sırala — en iyi/en kötü listeler için.
  const gecikmesiOlanlar = veri.cariSatirlari.filter((c) => c.ortGecikme !== null)
  const enIyiler = [...gecikmesiOlanlar].sort((a, b) => a.ortGecikme! - b.ortGecikme!).slice(0, 10)
  const enKotuler = [...gecikmesiOlanlar].sort((a, b) => b.ortGecikme! - a.ortGecikme!).slice(0, 10)

  const rapor: PdfRapor = {
    baslik: 'Tahsilat Performans Raporu',
    altBaslik: 'Dönem tahsilatı, vade uyumu ve cari performansı',
    donem: `Dönem: ${tarih(veri.baslangic)} — ${tarih(veri.bitis)}`,
    dosyaAdi: `tahsilat-performans-${veri.baslangic}_${veri.bitis}`,
    yatay: true,
    kpiler: [
      { etiket: 'Dönem Tahsilatı', deger: tl(veri.donemTahsilat), alt: `${veri.tahsilatAdedi} ödeme` },
      { etiket: 'Kapanan Fatura', deger: sayi(veri.kapananFatura) },
      { etiket: 'Vade Uyumu', deger: yuzde(veri.vadeUyumu), alt: 'zamanında ödenen' },
      { etiket: 'Ort. Gecikme', deger: `${veri.ortGecikme} gün` },
    ],
    tablolar: [
      {
        baslik: 'Satış Temsilcisi Kırılımı',
        basliklar: ['Temsilci', 'Tahsilat', 'Pay'],
        sagSutunlar: [1, 2],
        monoSutunlar: [1, 2],
        satirlar: veri.temsilciler.map((t) => [
          t.temsilci,
          tl(t.tutar),
          veri.donemTahsilat === 0 ? '—' : yuzde((t.tutar / veri.donemTahsilat) * 100),
        ]),
        toplamSatiri: ['TOPLAM', tl(veri.donemTahsilat), '%100'],
      },
      {
        baslik: 'En İyi Ödeme Disiplini (ilk 10)',
        basliklar: ['Kod', 'Cari Adı', 'Segment', 'Kapanan Fatura', 'Ort. Gecikme', 'Tahsilat'],
        sagSutunlar: [3, 4, 5],
        monoSutunlar: [0, 3, 4, 5],
        satirlar: enIyiler.map((c) => [
          c.kod, c.ad, segmentAdi(c.segment), sayi(c.kapananFatura),
          `${c.ortGecikme} gün`, tl(c.tahsilat),
        ]),
      },
      {
        baslik: 'En Kötü Ödeme Disiplini (ilk 10)',
        basliklar: ['Kod', 'Cari Adı', 'Segment', 'Kapanan Fatura', 'Ort. Gecikme', 'Tahsilat'],
        sagSutunlar: [3, 4, 5],
        monoSutunlar: [0, 3, 4, 5],
        satirlar: enKotuler.map((c) => [
          c.kod, c.ad, segmentAdi(c.segment), sayi(c.kapananFatura),
          `${c.ortGecikme} gün`, tl(c.tahsilat),
        ]),
      },
      {
        baslik: 'Dönem Tahsilatı — Cari Bazında',
        basliklar: ['Kod', 'Cari Adı', 'Segment', 'Temsilci', 'Kapanan Fatura', 'Ort. Gecikme', 'Tahsilat'],
        sagSutunlar: [4, 5, 6],
        monoSutunlar: [0, 4, 5, 6],
        satirlar: veri.cariSatirlari.map((c) => [
          c.kod, c.ad, segmentAdi(c.segment), c.temsilci, sayi(c.kapananFatura),
          c.ortGecikme === null ? '—' : `${c.ortGecikme} gün`, tl(c.tahsilat),
        ]),
        toplamSatiri: [
          'TOPLAM', `${veri.cariSatirlari.length} cari`, '', '',
          sayi(veri.kapananFatura), '', tl(veri.donemTahsilat),
        ],
      },
    ],
    notlar: [
      'Vade uyumu, dönem içinde KAPANAN faturaların vadesinde veya öncesinde ödenen yüzdesidir.',
      'Ortalama gecikme yalnızca kapanan faturalardan hesaplanır; hâlâ açık olan gecikmeli faturalar bu rakama girmez (onlar için Yaşlandırma raporuna bakılmalıdır).',
      'Negatif ortalama gecikme, carinin faturalarını vadesinden önce ödediğini gösterir.',
    ],
  }

  return (
    <div className="space-y-7">
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="rapor" value="performans" />
        <div>
          <label htmlFor="baslangic" className="lbl mb-1.5 block">Başlangıç</label>
          <input id="baslangic" name="baslangic" type="date" defaultValue={veri.baslangic} className="input w-auto" />
        </div>
        <div>
          <label htmlFor="bitis" className="lbl mb-1.5 block">Bitiş</label>
          <input id="bitis" name="bitis" type="date" defaultValue={veri.bitis} className="input w-auto" />
        </div>
        <button type="submit" className="btn btn-ink">Getir</button>
        <div className="ml-auto">
          <PdfButton rapor={rapor} etiket="Performans Raporu İndir" birincil />
        </div>
      </form>

      <KpiKusak>
        <Kpi
          etiket="Dönem Tahsilatı"
          deger={tlKisa(veri.donemTahsilat)}
          alt={`${sayi(veri.tahsilatAdedi)} ödeme`}
          buyuk
          sinif="ok"
        />
        <Kpi etiket="Kapanan Fatura" deger={sayi(veri.kapananFatura)} />
        <Kpi
          etiket="Vade Uyumu"
          deger={yuzde(veri.vadeUyumu)}
          alt="zamanında ödenen"
          sinif={veri.vadeUyumu >= 50 ? 'ok' : 'warn'}
        />
        <Kpi
          etiket="Ort. Gecikme"
          deger={`${veri.ortGecikme} gün`}
          alt="kapanan faturalarda"
          sinif={riskSinifi(veri.ortGecikme)}
        />
      </KpiKusak>

      <div>
        <div className="panel-head">
          <h3 className="lbl">Satış Temsilcisi Kırılımı</h3>
          <span className="num text-xs text-ink-mute">{tl(veri.donemTahsilat)}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Temsilci</th>
              <th scope="col" className="sag">Tahsilat</th>
              <th scope="col" className="sag">Pay</th>
              <th scope="col" className="w-2/5">Dağılım</th>
            </tr>
          </thead>
          <tbody>
            {veri.temsilciler.map((t) => {
              const pay = veri.donemTahsilat === 0 ? 0 : (t.tutar / veri.donemTahsilat) * 100
              return (
                <tr key={t.temsilci}>
                  <td className="font-medium">{t.temsilci}</td>
                  <td className="sag num">{tl(t.tutar)}</td>
                  <td className="sag num">{yuzde(pay)}</td>
                  <td>
                    <span
                      className="block h-2 bg-ink/70"
                      style={{ width: `${Math.max(pay, 1)}%` }}
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <div>
          <div className="panel-head">
            <h3 className="lbl">En İyi Ödeme Disiplini</h3>
          </div>
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Kod</th>
                  <th scope="col">Cari Adı</th>
                  <th scope="col" className="sag">Ort. Gecikme</th>
                  <th scope="col" className="sag">Tahsilat</th>
                </tr>
              </thead>
              <tbody>
                {enIyiler.map((c) => (
                  <tr key={c.kod}>
                    <td className="num">{c.kod}</td>
                    <td>{c.ad}</td>
                    <td className="sag">
                      <span className="tick t-ok">{c.ortGecikme} gün</span>
                    </td>
                    <td className="sag num">{tl(c.tahsilat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="panel-head">
            <h3 className="lbl">En Kötü Ödeme Disiplini</h3>
          </div>
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Kod</th>
                  <th scope="col">Cari Adı</th>
                  <th scope="col" className="sag">Ort. Gecikme</th>
                  <th scope="col" className="sag">Tahsilat</th>
                </tr>
              </thead>
              <tbody>
                {enKotuler.map((c) => (
                  <tr key={c.kod}>
                    <td className="num">{c.kod}</td>
                    <td>{c.ad}</td>
                    <td className="sag">
                      <span className={`tick t-${riskSinifi(c.ortGecikme!)}`}>
                        {c.ortGecikme} gün
                      </span>
                    </td>
                    <td className="sag num">{tl(c.tahsilat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="panel-head">
          <h3 className="lbl">Dönem Tahsilatı — Cari Bazında</h3>
          <span className="num text-xs text-ink-mute">{sayi(veri.cariSatirlari.length)} cari</span>
        </div>
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kod</th>
                <th scope="col">Cari Adı</th>
                <th scope="col">Segment</th>
                <th scope="col">Temsilci</th>
                <th scope="col" className="sag">Kapanan Fatura</th>
                <th scope="col" className="sag">Ort. Gecikme</th>
                <th scope="col" className="sag">Tahsilat</th>
              </tr>
            </thead>
            <tbody>
              {veri.cariSatirlari.slice(0, 50).map((c) => (
                <tr key={c.kod}>
                  <td className="num">{c.kod}</td>
                  <td>{c.ad}</td>
                  <td className="text-ink-soft">{segmentAdi(c.segment)}</td>
                  <td className="text-ink-soft">{c.temsilci}</td>
                  <td className="sag num">{sayi(c.kapananFatura)}</td>
                  <td className="sag num">
                    {c.ortGecikme === null ? '—' : `${c.ortGecikme} gün`}
                  </td>
                  <td className="sag num font-medium">{tl(c.tahsilat)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-rule-strong font-semibold">
                <td colSpan={4} className="pt-2">TOPLAM</td>
                <td className="sag num pt-2">{sayi(veri.kapananFatura)}</td>
                <td />
                <td className="sag num pt-2">{tl(veri.donemTahsilat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {veri.cariSatirlari.length > 50 && (
          <p className="mt-2 text-xs text-ink-mute">
            İlk 50 cari gösteriliyor; tamamı PDF raporunda.
          </p>
        )}
      </div>
    </div>
  )
}
