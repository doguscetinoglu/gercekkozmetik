import Link from 'next/link'
import { SectionHeader } from '@/components/PageHeader'
import { notFound } from 'next/navigation'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import RiskBand from '@/components/RiskBand'
import { BUGUN } from '@/lib/brand'
import {
  durumAdi,
  faturaDurumAdi,
  kanalAdi,
  saat,
  sayi,
  segmentAdi,
  tarih,
  tarihAcik,
  tl,
  tlKisa,
  yontemAdi,
  yuzde,
} from '@/lib/format'
import { riskSinifi } from '@/lib/metrics'
import { cariDetay } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

/** Ödeme gecikmesini insan diline çevirir: "12 gün gecikmeyle" / "vadesinde". */
function gecikmeMetni(gun: number | null): { metin: string; sinif: 'ok' | 'warn' | 'alert' | 'crit' } {
  if (gun === null) return { metin: '—', sinif: 'ok' }
  if (gun < 0) return { metin: `${Math.abs(gun)} gün önce`, sinif: 'ok' }
  if (gun === 0) return { metin: 'Vadesinde', sinif: 'ok' }
  return { metin: `${gun} gün gecikmeli`, sinif: riskSinifi(gun) }
}

export default async function CariDetay(props: { params: Promise<{ id: string }> }) {
  // Next 16: params artık Promise.
  const { id } = await props.params
  const d = await cariDetay(id)
  if (!d) notFound()

  const { cari, ozet, kovalar, faturalar, tahsilatlar, bildirimler } = d

  const acikFaturalar = faturalar.filter((f) => f.durum !== 'ODENDI')
  const kapananFaturalar = faturalar.filter((f) => f.durum === 'ODENDI')
  const limitKullanim = cari.krediLimiti > 0 ? (ozet.acikBakiye / cari.krediLimiti) * 100 : 0

  const rapor: PdfRapor = {
    baslik: 'Cari Hesap Ekstresi',
    altBaslik: `${cari.kod} — ${cari.ad}`,
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `cari-ekstre-${cari.kod}`,
    yatay: true,
    kpiler: [
      { etiket: 'Açık Bakiye', deger: tl(ozet.acikBakiye), alt: `${ozet.acikFaturaAdedi} fatura` },
      { etiket: 'Vadesi Geçen', deger: tl(ozet.vadesiGecen), alt: `${ozet.vadesiGecenAdedi} fatura` },
      { etiket: 'Ağırlıklı Gecikme', deger: `${ozet.agirlikliGecikmeGunu} gün` },
      { etiket: 'Toplam Tahsilat', deger: tl(d.toplamTahsilat) },
      { etiket: 'Vade Uyumu', deger: yuzde(d.vadeUyumu) },
    ],
    tablolar: [
      {
        baslik: 'Cari Bilgileri',
        basliklar: ['Alan', 'Değer'],
        satirlar: [
          ['Cari Kodu', cari.kod],
          ['Cari Adı', cari.ad],
          ['Segment', segmentAdi(cari.segment)],
          ['Şehir', cari.sehir],
          ['Satış Temsilcisi', cari.temsilci],
          ['Telefon', cari.telefon],
          ['E-posta', cari.email],
          ['Sözleşme Vadesi', `${cari.vadeGunu} gün`],
          ['Kredi Limiti', tl(cari.krediLimiti)],
          ['Limit Kullanımı', yuzde(limitKullanim)],
          ['Durum', cari.aktif ? 'Aktif' : 'Pasif'],
        ],
      },
      {
        baslik: 'Yaşlandırma',
        basliklar: ['Gecikme Aralığı', 'Fatura', 'Bakiye'],
        sagSutunlar: [1, 2],
        monoSutunlar: [1, 2],
        satirlar: kovalar.map((k) => [k.etiket, sayi(k.adet), tl(k.tutar)]),
      },
      {
        baslik: 'Açık Faturalar',
        basliklar: ['Fatura No', 'Kesim', 'Vade', 'Tutar', 'Ödenen', 'Kalan', 'Gecikme', 'Durum'],
        sagSutunlar: [3, 4, 5, 6],
        monoSutunlar: [0, 1, 2, 3, 4, 5, 6],
        satirlar: acikFaturalar.map((f) => [
          f.faturaNo,
          tarih(f.kesimTarihi),
          tarih(f.vadeTarihi),
          tl(f.tutar),
          f.odenenTutar > 0 ? tl(f.odenenTutar) : '—',
          tl(f.tutar - f.odenenTutar),
          f.gecikme > 0 ? `${f.gecikme} gün` : 'Vadesi gelmemiş',
          faturaDurumAdi(f.durum),
        ]),
        toplamSatiri: [
          'TOPLAM', '', '',
          tl(acikFaturalar.reduce((t, f) => t + f.tutar, 0)),
          tl(acikFaturalar.reduce((t, f) => t + f.odenenTutar, 0)),
          tl(ozet.acikBakiye),
          '', '',
        ],
      },
      {
        baslik: 'Ödeme Geçmişi — Ne Zaman, Kaç Gün Gecikmeyle',
        basliklar: ['Fatura No', 'Vade', 'Ödendiği Tarih', 'Tutar', 'Gecikme'],
        sagSutunlar: [3, 4],
        monoSutunlar: [0, 1, 2, 3, 4],
        satirlar: kapananFaturalar.slice(0, 60).map((f) => [
          f.faturaNo,
          tarih(f.vadeTarihi),
          f.kapanmaTarihi ? tarih(f.kapanmaTarihi) : '—',
          tl(f.tutar),
          gecikmeMetni(f.odemeGecikmesi).metin,
        ]),
      },
      {
        baslik: 'Bildirim Geçmişi (son 60 kayıt)',
        basliklar: ['Tarih', 'Saat', 'Kanal', 'Şablon', 'Gecikme (gönderimde)', 'Durum'],
        sagSutunlar: [4],
        monoSutunlar: [0, 1, 4],
        satirlar: bildirimler.slice(0, 60).map((b) => [
          tarih(b.gonderimZamani),
          saat(b.gonderimZamani),
          kanalAdi(b.kanal),
          b.sablon,
          b.gonderimdekiGecikmeGunu < 0
            ? `Vade öncesi ${Math.abs(b.gonderimdekiGecikmeGunu)} gün`
            : `${b.gonderimdekiGecikmeGunu} gün`,
          durumAdi(b.durum),
        ]),
      },
    ],
    notlar: [
      '"Gecikme (gönderimde)" bildirimin gönderildiği andaki gecikme günüdür; negatif değer vade öncesi önleyici hatırlatmayı gösterir.',
      'Ödeme geçmişindeki gecikme, faturanın kapanma tarihi ile vade tarihi arasındaki gün farkıdır.',
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/cariler" className="baglanti text-[0.8125rem]">
          ← Cari hesaplar
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <span className="lbl num block">{cari.kod}</span>
            <h1 className="baslik-buyuk mt-1 flex flex-wrap items-baseline gap-x-3">
              {cari.ad}
              {!cari.aktif && <span className="tick t-mute">Pasif</span>}
            </h1>
            <p className="ikincil mt-1.5">
              {segmentAdi(cari.segment)} · {cari.sehir} · Temsilci {cari.temsilci}
            </p>
          </div>
          <PdfButton rapor={rapor} etiket="Ekstre indir" birincil />
        </div>
      </div>

      <KpiKusak>
        <Kpi etiket="Açık Bakiye" deger={tlKisa(ozet.acikBakiye)} alt={`${sayi(ozet.acikFaturaAdedi)} fatura`} buyuk />
        <Kpi
          etiket="Vadesi Geçen"
          deger={tlKisa(ozet.vadesiGecen)}
          alt={`${sayi(ozet.vadesiGecenAdedi)} fatura`}
          sinif={ozet.vadesiGecen > 0 ? 'crit' : 'ok'}
        />
        <Kpi
          etiket="Ağırlıklı Gecikme"
          deger={`${ozet.agirlikliGecikmeGunu} gün`}
          sinif={riskSinifi(ozet.agirlikliGecikmeGunu)}
        />
        <Kpi etiket="Toplam Tahsilat" deger={tlKisa(d.toplamTahsilat)} alt={`${sayi(tahsilatlar.length)} ödeme`} sinif="ok" />
        <Kpi etiket="Vade Uyumu" deger={yuzde(d.vadeUyumu)} alt="zamanında kapanan" />
        <Kpi
          etiket="Limit Kullanımı"
          deger={yuzde(limitKullanim)}
          alt={`limit ${tlKisa(cari.krediLimiti)}`}
          sinif={limitKullanim > 100 ? 'crit' : limitKullanim > 80 ? 'warn' : 'ok'}
        />
      </KpiKusak>

      <section>
        <SectionHeader baslik={"Risk Şeridi"} />
        <RiskBand kovalar={kovalar} />
      </section>

      {/* İletişim bilgileri — dar bir tanım listesi */}
      <section className="kart kart-dolgu">
        <h2 className="lbl mb-3">İletişim ve Sözleşme</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Telefon', cari.telefon, true],
            ['E-posta', cari.email, false],
            ['Sözleşme Vadesi', `${cari.vadeGunu} gün`, true],
            ['Kredi Limiti', tl(cari.krediLimiti), true],
          ].map(([etiket, deger, mono]) => (
            <div key={String(etiket)}>
              <dt className="baslik-bolum">{etiket}</dt>
              <dd className={`mt-0.5 ${mono ? 'num' : 'break-all'}`}>{deger}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionHeader baslik={"Açık Faturalar"} yan={<span className="num kpi-sub">{sayi(acikFaturalar.length)} kayıt</span>} />
        {acikFaturalar.length === 0 ? (
          <p className="text-sm text-label-2">Açık fatura bulunmuyor.</p>
        ) : (
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Fatura No</th>
                  <th scope="col">Kesim</th>
                  <th scope="col">Vade</th>
                  <th scope="col" className="sag">Tutar</th>
                  <th scope="col" className="sag">Ödenen</th>
                  <th scope="col" className="sag">Kalan</th>
                  <th scope="col" className="sag">Gecikme</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {acikFaturalar.map((f) => (
                  <tr key={f.id}>
                    <td className="num">{f.faturaNo}</td>
                    <td className="num text-label-2">{tarih(f.kesimTarihi)}</td>
                    <td className="num">{tarih(f.vadeTarihi)}</td>
                    <td className="sag num">{tl(f.tutar)}</td>
                    <td className="sag num text-label-2">
                      {f.odenenTutar > 0 ? tl(f.odenenTutar) : '—'}
                    </td>
                    <td className="sag num font-medium">{tl(f.tutar - f.odenenTutar)}</td>
                    <td className="sag">
                      {f.gecikme > 0 ? (
                        <span className={`tick t-${riskSinifi(f.gecikme)}`}>{f.gecikme} gün</span>
                      ) : (
                        <span className="tick t-ok">Vadesi gelmemiş</span>
                      )}
                    </td>
                    <td className="text-label-2">{faturaDurumAdi(f.durum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeader baslik={"Ödeme Geçmişi — Ne Zaman, Kaç Gün Gecikmeyle"} yan={<span className="num kpi-sub">{sayi(kapananFaturalar.length)} kapanan fatura</span>} />
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Fatura No</th>
                <th scope="col">Vade Tarihi</th>
                <th scope="col">Ödendiği Tarih</th>
                <th scope="col" className="sag">Tutar</th>
                <th scope="col" className="sag">Gecikme</th>
              </tr>
            </thead>
            <tbody>
              {kapananFaturalar.slice(0, 40).map((f) => {
                const g = gecikmeMetni(f.odemeGecikmesi)
                return (
                  <tr key={f.id}>
                    <td className="num">{f.faturaNo}</td>
                    <td className="num text-label-2">{tarih(f.vadeTarihi)}</td>
                    <td className="num">{f.kapanmaTarihi ? tarih(f.kapanmaTarihi) : '—'}</td>
                    <td className="sag num">{tl(f.tutar)}</td>
                    <td className="sag">
                      <span className={`tick t-${g.sinif}`}>{g.metin}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {kapananFaturalar.length > 40 && (
          <p className="mt-2 kpi-sub">
            En yeni 40 kayıt gösteriliyor. Tamamı için PDF ekstresini indirin.
          </p>
        )}
      </section>

      <section>
        <SectionHeader baslik={"Bildirim Geçmişi"} yan={<span className="num kpi-sub">{sayi(bildirimler.length)} gönderim</span>} />
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Saat</th>
                <th scope="col">Kanal</th>
                <th scope="col">Şablon</th>
                <th scope="col">Fatura</th>
                <th scope="col" className="sag">Gönderimdeki Gecikme</th>
                <th scope="col">Sonuç</th>
              </tr>
            </thead>
            <tbody>
              {bildirimler.slice(0, 40).map((b) => (
                <tr key={b.id}>
                  <td className="num">{tarih(b.gonderimZamani)}</td>
                  <td className="num text-label-2">{saat(b.gonderimZamani)}</td>
                  <td className="font-medium">{kanalAdi(b.kanal)}</td>
                  <td className="text-label-2">{b.sablon}</td>
                  <td className="num text-label-2">{b.invoice?.faturaNo ?? '—'}</td>
                  <td className="sag num">
                    {b.gonderimdekiGecikmeGunu < 0 ? (
                      <span className="text-ok">vade öncesi {Math.abs(b.gonderimdekiGecikmeGunu)} gün</span>
                    ) : (
                      `${b.gonderimdekiGecikmeGunu} gün`
                    )}
                  </td>
                  <td>
                    <span
                      className={`tick ${
                        b.durum === 'BASARISIZ' || b.durum === 'CEVAPSIZ' ? 't-crit' : 't-ok'
                      }`}
                    >
                      {durumAdi(b.durum)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bildirimler.length > 40 && (
          <p className="mt-2 kpi-sub">
            En yeni 40 kayıt gösteriliyor. Tamamı için PDF ekstresini indirin.
          </p>
        )}
      </section>
    </div>
  )
}
