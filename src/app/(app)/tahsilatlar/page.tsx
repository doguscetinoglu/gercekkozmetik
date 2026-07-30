import Link from 'next/link'
import PageHeader, { SectionHeader } from '@/components/PageHeader'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import { BUGUN } from '@/lib/brand'
import { sayi, tarih, tarihAcik, tl, tlKisa, yontemAdi, yuzde } from '@/lib/format'
import { gunFarki } from '@/lib/metrics'
import { tahsilatSayfasi } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: 'Tahsilatlar — Gerçek Kozmetik' }

const YONTEMLER = ['HAVALE', 'KREDI_KARTI', 'CEK', 'NAKIT', 'SENET'] as const

export default async function TahsilatlarSayfasi(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await props.searchParams
  const tek = (a: string) => (Array.isArray(sp[a]) ? sp[a]![0] : (sp[a] as string | undefined)) ?? ''

  const yontem = tek('yontem')
  const sayfa = Math.max(1, Number(tek('sayfa')) || 1)

  const v = await tahsilatSayfasi({ yontem: yontem || undefined, sayfa })
  const sonSayfa = Math.max(1, Math.ceil(v.toplam / v.sayfaBoyu))

  const otuzGunToplam = v.gunluk.reduce((t, g) => t + g.tutar, 0)
  const otuzGunAdet = v.gunluk.reduce((t, g) => t + g.adet, 0)
  const enIyiGun = v.gunluk.reduce((en, g) => (g.tutar > en.tutar ? g : en), v.gunluk[0])

  const rapor: PdfRapor = {
    baslik: 'Tahsilat Raporu',
    altBaslik: yontem ? `Ödeme yöntemi: ${yontemAdi(yontem)}` : 'Tüm ödeme yöntemleri',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `tahsilat-raporu-${BUGUN.toISOString().slice(0, 10)}`,
    kpiler: [
      { etiket: 'Genel Toplam', deger: tl(v.genelToplam), alt: 'tüm dönem' },
      { etiket: 'Son 30 Gün', deger: tl(otuzGunToplam), alt: `${otuzGunAdet} ödeme` },
      { etiket: 'Kayıt Sayısı', deger: sayi(v.toplam) },
    ],
    tablolar: [
      {
        baslik: 'Ödeme Yöntemine Göre Dağılım',
        basliklar: ['Yöntem', 'Ödeme Adedi', 'Tutar', 'Pay'],
        sagSutunlar: [1, 2, 3],
        monoSutunlar: [1, 2, 3],
        satirlar: v.yontemler.map((y) => [
          yontemAdi(y.yontem),
          sayi(y.adet),
          tl(y.tutar),
          yuzde((y.tutar / v.genelToplam) * 100),
        ]),
        toplamSatiri: [
          'TOPLAM',
          sayi(v.yontemler.reduce((t, y) => t + y.adet, 0)),
          tl(v.genelToplam),
          '%100',
        ],
      },
      {
        baslik: 'Günlük Tahsilat — Son 30 Gün',
        basliklar: ['Tarih', 'Ödeme Adedi', 'Tutar'],
        sagSutunlar: [1, 2],
        monoSutunlar: [0, 1, 2],
        satirlar: [...v.gunluk].reverse().map((g) => [tarih(g.gun), sayi(g.adet), tl(g.tutar)]),
        toplamSatiri: ['TOPLAM', sayi(otuzGunAdet), tl(otuzGunToplam)],
      },
      {
        baslik: `Tahsilat Kayıtları (sayfa ${v.sayfa} / ${sonSayfa})`,
        basliklar: ['Tarih', 'Cari Kodu', 'Cari Adı', 'Fatura No', 'Vade', 'Gecikme', 'Yöntem', 'Tutar'],
        sagSutunlar: [5, 7],
        monoSutunlar: [0, 1, 3, 4, 5, 7],
        satirlar: v.kayitlar.map((t) => {
          const gecikme = t.invoice
            ? gunFarki(t.odemeTarihi, t.invoice.vadeTarihi)
            : null
          return [
            tarih(t.odemeTarihi),
            t.customer.kod,
            t.customer.ad,
            t.invoice?.faturaNo ?? '—',
            t.invoice ? tarih(t.invoice.vadeTarihi) : '—',
            gecikme === null ? '—' : gecikme > 0 ? `${gecikme} gün` : 'vadesinde',
            yontemAdi(t.yontem),
            tl(t.tutar),
          ]
        }),
        toplamSatiri: [
          'SAYFA TOPLAMI', '', '', '', '', '', '',
          tl(v.kayitlar.reduce((t, x) => t + x.tutar, 0)),
        ],
      },
    ],
    notlar: [
      '"Gecikme" sütunu ödemenin ilgili faturanın vadesinden kaç gün sonra yapıldığını gösterir.',
      'Bir fatura iki taksitte kapanmışsa iki ayrı tahsilat kaydı olarak görünür.',
    ],
  }

  const sayfaLinki = (s: number) => {
    const p = new URLSearchParams()
    if (yontem) p.set('yontem', yontem)
    p.set('sayfa', String(s))
    return `/tahsilatlar?${p}`
  }

  return (
    <div className="space-y-8">
      <PageHeader
        ustEtiket="Gelen ödemeler"
        baslik={`${sayi(v.toplam)} tahsilat`}
        aciklama="Ödeme yöntemi dağılımı ve günlük tahsilat seyri"
        eylemler={<PdfButton rapor={rapor} etiket="Raporu indir" />}
      />

      <KpiKusak>
        <Kpi etiket="Genel Toplam" deger={tlKisa(v.genelToplam)} alt="tüm dönem" buyuk sinif="ok" />
        <Kpi etiket="Son 30 Gün" deger={tlKisa(otuzGunToplam)} alt={`${sayi(otuzGunAdet)} ödeme`} />
        <Kpi
          etiket="En Yüksek Gün"
          deger={enIyiGun ? tlKisa(enIyiGun.tutar) : '—'}
          alt={enIyiGun ? tarih(enIyiGun.gun) : ''}
        />
      </KpiKusak>

      <section>
        <SectionHeader baslik={"Ödeme Yöntemine Göre Dağılım"} yan={<span className="num kpi-sub">{tl(v.genelToplam)}</span>} />
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Yöntem</th>
                <th scope="col" className="sag">Ödeme Adedi</th>
                <th scope="col" className="sag">Tutar</th>
                <th scope="col" className="sag">Pay</th>
                <th scope="col" className="w-2/5">Dağılım</th>
              </tr>
            </thead>
            <tbody>
              {v.yontemler.map((y) => {
                const pay = (y.tutar / v.genelToplam) * 100
                return (
                  <tr key={y.yontem}>
                    <td className="font-medium">{yontemAdi(y.yontem)}</td>
                    <td className="sag num">{sayi(y.adet)}</td>
                    <td className="sag num">{tl(y.tutar)}</td>
                    <td className="sag num">{yuzde(pay)}</td>
                    <td>
                      {/* Yatay oran çubuğu — dolgu mürekkep, dekoratif renk yok */}
                      <span
                        className="oran"
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
      </section>

      <section>
        <SectionHeader baslik={"Tahsilat Kayıtları"} />

        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="yontem" className="lbl mb-1.5 block">Ödeme Yöntemi</label>
            <select id="yontem" name="yontem" defaultValue={yontem} className="select w-auto">
              <option value="">Tümü</option>
              {YONTEMLER.map((y) => (
                <option key={y} value={y}>{yontemAdi(y)}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-ink">Uygula</button>
          <Link href="/tahsilatlar" className="btn">Temizle</Link>
        </form>

        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Cari</th>
                <th scope="col">Fatura No</th>
                <th scope="col">Vade</th>
                <th scope="col" className="sag">Gecikme</th>
                <th scope="col">Yöntem</th>
                <th scope="col">Açıklama</th>
                <th scope="col" className="sag">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {v.kayitlar.map((t) => {
                const gecikme = t.invoice ? gunFarki(t.odemeTarihi, t.invoice.vadeTarihi) : null
                return (
                  <tr key={t.id}>
                    <td className="num">{tarih(t.odemeTarihi)}</td>
                    <td>
                      <Link
                        href={`/cariler/${t.customerId}`}
                        className="baglanti"
                      >
                        <span className="num text-label-2">{t.customer.kod}</span> {t.customer.ad}
                      </Link>
                    </td>
                    <td className="num text-label-2">{t.invoice?.faturaNo ?? '—'}</td>
                    <td className="num text-label-2">
                      {t.invoice ? tarih(t.invoice.vadeTarihi) : '—'}
                    </td>
                    <td className="sag">
                      {gecikme === null ? (
                        <span className="text-label-2">—</span>
                      ) : gecikme > 0 ? (
                        <span className="tick t-warn">{gecikme} gün</span>
                      ) : (
                        <span className="tick t-ok">Vadesinde</span>
                      )}
                    </td>
                    <td>{yontemAdi(t.yontem)}</td>
                    <td className="text-label-2">{t.aciklama ?? '—'}</td>
                    <td className="sag num font-medium">{tl(t.tutar)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} >SAYFA TOPLAMI</td>
                <td className="sag num">
                  {tl(v.kayitlar.reduce((t, x) => t + x.tutar, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {sonSayfa > 1 && (
          <nav className="mt-4 flex items-center justify-between gap-4" aria-label="Sayfalama">
            {v.sayfa > 1 ? (
              <Link href={sayfaLinki(v.sayfa - 1)} className="btn">← Önceki</Link>
            ) : (
              <span />
            )}
            <span className="num kpi-sub">Sayfa {v.sayfa} / {sonSayfa}</span>
            {v.sayfa < sonSayfa ? (
              <Link href={sayfaLinki(v.sayfa + 1)} className="btn">Sonraki →</Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  )
}
