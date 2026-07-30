import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import RiskBand from '@/components/RiskBand'
import SeyirGrafigi from '@/components/SeyirGrafigi'
import { BUGUN } from '@/lib/brand'
import { kanalAdi, sayi, tarih, tarihAcik, tl, tlKisa, yuzde } from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { dashboardVerisi } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: 'Panel — Gerçek Kozmetik' }

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="lbl block">Genel Durum</span>
          <h1 className="mt-1 text-xl font-semibold">Yönetim Paneli</h1>
        </div>
        <PdfButton rapor={rapor} etiket="Yönetim Özeti (PDF)" birincil />
      </div>

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

      {/* İMZA ÖĞESİ — yaşlandırma tek sürekli şerit olarak */}
      <section>
        <div className="panel-head">
          <h2 className="lbl">Risk Şeridi — Açık Bakiyenin Yaşlandırması</h2>
          <span className="num text-xs text-ink-mute">{tl(v.ozet.acikBakiye)} toplam</span>
        </div>
        <RiskBand kovalar={v.kovalar} />
      </section>

      <section>
        <div className="panel-head">
          <h2 className="lbl">Son 30 Gün — Bildirim ve Tahsilat Seyri</h2>
          <span className="num text-xs text-ink-mute">Bu ay: {tl(v.ayTahsilat)}</span>
        </div>
        <SeyirGrafigi veri={v.seyir} />
      </section>

      <section>
        <div className="panel-head">
          <h2 className="lbl">En Riskli 20 Cari</h2>
          <Link href="/cariler" className="text-xs font-semibold underline underline-offset-4">
            Tüm cariler ({sayi(v.cariAdedi)})
          </Link>
        </div>

        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kod</th>
                <th scope="col">Cari Adı</th>
                <th scope="col">Şehir</th>
                <th scope="col">Temsilci</th>
                <th scope="col" className="sag">En Yüksek Gecikme</th>
                <th scope="col" className="sag">Vadesi Geçen</th>
              </tr>
            </thead>
            <tbody>
              {v.enRiskli.map((c) => (
                <tr key={c.id}>
                  <td className="num">{c.kod}</td>
                  <td>
                    <Link href={`/cariler/${c.id}`} className="font-medium underline underline-offset-4 decoration-rule-strong hover:decoration-ink">
                      {c.ad}
                    </Link>
                  </td>
                  <td className="text-ink-soft">{c.sehir}</td>
                  <td className="text-ink-soft">{c.temsilci}</td>
                  <td className="sag">
                    <span className={`tick t-${riskSinifi(c.enYuksekGecikme)}`}>
                      {sayi(c.enYuksekGecikme)} gün
                    </span>
                  </td>
                  <td className="sag num font-medium">{tl(c.vadesiGecen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="border-t border-rule pt-4 text-xs text-ink-mute">
        Son güncelleme: {tarih(BUGUN)} · Örnek veriyle çalışan tanıtım sistemi
      </p>
    </div>
  )
}
