import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PageHeader, { SectionHeader } from '@/components/PageHeader'
import PdfButton from '@/components/PdfButton'
import RiskBand from '@/components/RiskBand'
import SeyirGrafigi from '@/components/SeyirGrafigi'
import { BUGUN, MARKA } from '@/lib/brand'
import { kanalAdi, sayi, tarih, tarihAcik, tl, tlKisa, yuzde } from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { dashboardVerisi } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: `Panel — ${MARKA.sistem}` }

export default async function Panel() {
  const v = await dashboardVerisi()

  // PDF içeriği ekrandaki verinin aynısından kurulur — ayrışma imkânsız.
  const rapor: PdfRapor = {
    baslik: 'Yönetim Özeti',
    altBaslik: 'Cari bakiye, gecikme ve tahsilat durumu',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `yonetim-ozeti-${BUGUN.toISOString().slice(0, 10)}`,
    kpiler: [
      { etiket: 'Açık Bakiye', deger: tl(v.ozet.acikBakiye), alt: `${v.ozet.acikFaturaAdedi} fatura` },
      { etiket: 'Vadesi Geçen', deger: tl(v.ozet.vadesiGecen), alt: `${v.ozet.vadesiGecenAdedi} fatura` },
      { etiket: 'Ağırlıklı Gecikme', deger: `${v.ozet.agirlikliGecikmeGunu} gün`, alt: 'tutarla ağırlıklı' },
      { etiket: 'Bugün Bildirim', deger: sayi(v.bugun.bildirimAdedi), alt: 'gönderim' },
      { etiket: 'Bugün Tahsilat', deger: tl(v.bugun.tahsilatTutari), alt: `${v.bugun.tahsilatAdedi} ödeme` },
      { etiket: 'Vade Uyumu', deger: yuzde(v.vadeUyumu), alt: 'zamanında kapanan' },
    ],
    tablolar: [
      {
        baslik: 'Yaşlandırma Dağılımı',
        basliklar: ['Gecikme Aralığı', 'Fatura', 'Bakiye'],
        sagSutunlar: [1, 2],
        monoSutunlar: [1, 2],
        satirlar: v.kovalar.map((k) => [k.etiket, sayi(k.adet), tl(k.tutar)]),
        toplamSatiri: [
          'TOPLAM',
          sayi(v.kovalar.reduce((t, k) => t + k.adet, 0)),
          tl(v.kovalar.reduce((t, k) => t + k.tutar, 0)),
        ],
      },
      {
        baslik: 'Bugün Gönderilen Bildirimler',
        basliklar: ['Kanal', 'Adet'],
        sagSutunlar: [1],
        monoSutunlar: [1],
        satirlar: v.bugun.kanallar.map((k) => [kanalAdi(k.kanal), sayi(k.adet)]),
        toplamSatiri: ['TOPLAM', sayi(v.bugun.bildirimAdedi)],
      },
      {
        baslik: 'En Yüksek Vadesi Geçen Bakiyeye Sahip 20 Cari',
        basliklar: ['Kod', 'Cari Adı', 'Şehir', 'Temsilci', 'Gecikme (gün)', 'Vadesi Geçen'],
        sagSutunlar: [4, 5],
        monoSutunlar: [0, 4, 5],
        satirlar: v.enRiskli.map((c) => [
          c.kod,
          c.ad,
          c.sehir,
          c.temsilci,
          sayi(c.enYuksekGecikme),
          tl(c.vadesiGecen),
        ]),
      },
    ],
    notlar: [
      'Ağırlıklı gecikme günü Σ(kalan bakiye × gecikme günü) / Σ(kalan bakiye) formülüyle hesaplanır; düz ortalama küçük tutarlı faturalar yüzünden yanıltıcı olurdu.',
      'Vade uyumu, kapanan faturaların vadesinde veya öncesinde ödenen yüzdesidir.',
      'Bu rapor örnek veriyle çalışan bir tanıtım sisteminden üretilmiştir.',
    ],
  }

  return (
    <div className="space-y-10">
      <PageHeader
        ustEtiket="Genel durum"
        baslik="Yönetim Paneli"
        aciklama={`${sayi(v.cariAdedi)} cari hesabın bakiye, gecikme ve tahsilat durumu`}
        eylemler={<PdfButton rapor={rapor} etiket="Yönetim Özeti" birincil />}
      />

      <KpiKusak>
        <Kpi
          etiket="Açık Bakiye"
          deger={tlKisa(v.ozet.acikBakiye)}
          alt={`${sayi(v.ozet.acikFaturaAdedi)} fatura`}
          buyuk
        />
        <Kpi
          etiket="Vadesi Geçen"
          deger={tlKisa(v.ozet.vadesiGecen)}
          alt={`${sayi(v.ozet.vadesiGecenAdedi)} fatura`}
          sinif="crit"
        />
        <Kpi
          etiket="Ağırlıklı Gecikme"
          deger={`${v.ozet.agirlikliGecikmeGunu} gün`}
          alt="tutarla ağırlıklı"
          sinif={riskSinifi(v.ozet.agirlikliGecikmeGunu)}
        />
        <Kpi
          etiket="Bugün Bildirim"
          deger={sayi(v.bugun.bildirimAdedi)}
          alt={v.bugun.kanallar.map((k) => `${kanalAdi(k.kanal)} ${k.adet}`).join(' · ') || 'gönderim yok'}
        />
        <Kpi
          etiket="Bugün Tahsilat"
          deger={tlKisa(v.bugun.tahsilatTutari)}
          alt={`${sayi(v.bugun.tahsilatAdedi)} ödeme`}
          sinif="ok"
        />
        <Kpi etiket="Vade Uyumu" deger={yuzde(v.vadeUyumu)} alt="zamanında kapanan" />
      </KpiKusak>

      {/* Yaşlandırma — tek sürekli oran şeridi */}
      <section>
        <SectionHeader
          baslik="Açık bakiyenin yaşlandırması"
          yan={<span className="num kpi-sub">{tl(v.ozet.acikBakiye)} toplam</span>}
        />
        <div className="kart kart-dolgu">
          <RiskBand kovalar={v.kovalar} tabloGoster={false} />
        </div>
      </section>

      <section>
        <SectionHeader
          baslik="Son 30 gün — bildirim ve tahsilat seyri"
          yan={<span className="num kpi-sub">Bu ay {tl(v.ayTahsilat)}</span>}
        />
        <div className="kart kart-dolgu">
          <SeyirGrafigi veri={v.seyir} />
        </div>
      </section>

      <section>
        <SectionHeader
          baslik="En riskli 20 cari"
          yan={
            <Link href="/cariler" className="baglanti text-[0.8125rem]">
              Tüm cariler ({sayi(v.cariAdedi)}) →
            </Link>
          }
        />

        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kod</th>
                <th scope="col">Cari adı</th>
                <th scope="col">Şehir</th>
                <th scope="col">Temsilci</th>
                <th scope="col" className="sag">En yüksek gecikme</th>
                <th scope="col" className="sag">Vadesi geçen</th>
              </tr>
            </thead>
            <tbody>
              {v.enRiskli.map((c) => (
                <tr key={c.id}>
                  <td className="num text-label-2">{c.kod}</td>
                  <td>
                    <Link href={`/cariler/${c.id}`} className="baglanti">
                      {c.ad}
                    </Link>
                  </td>
                  <td className="text-label-2">{c.sehir}</td>
                  <td className="text-label-2">{c.temsilci}</td>
                  <td className="sag">
                    <span className={`tick t-${riskSinifi(c.enYuksekGecikme)}`}>
                      {sayi(c.enYuksekGecikme)} gün
                    </span>
                  </td>
                  <td className="sag num font-semibold">{tl(c.vadesiGecen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="border-t border-separator pt-5 text-[0.75rem] text-label-2">
        Son güncelleme {tarih(BUGUN)} · Örnek veriyle çalışan tanıtım sistemi
      </p>
    </div>
  )
}
