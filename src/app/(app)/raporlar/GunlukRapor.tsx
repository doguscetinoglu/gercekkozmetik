import Link from 'next/link'
import { SectionHeader } from '@/components/PageHeader'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import { durumAdi, kanalAdi, saat, sayi, tarih, tarihAcik, tl, tlKisa, yontemAdi } from '@/lib/format'
import { gunlukFaaliyet } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

type Veri = Awaited<ReturnType<typeof gunlukFaaliyet>>

/**
 * GÜNLÜK FAALİYET RAPORU — kullanıcının verdiği örnek senaryonun tam karşılığı:
 * "bugün kaç kişiye hatırlatma yapmışız, kaç ödeme gelmiş".
 *
 * Dikkat: "kaç kişiye" sorusunun cevabı bildirim ADEDİ değil, ULAŞILAN TEKİL
 * CARİ sayısıdır — aynı cariye gün içinde iki kanal birden gitmiş olabilir.
 * Rapor her iki rakamı da ayrı ayrı gösterir.
 */
export default function GunlukRapor({ veri }: { veri: Veri }) {
  const rapor: PdfRapor = {
    baslik: 'Günlük Faaliyet Raporu',
    altBaslik: tarihAcik(veri.gun),
    donem: `Rapor günü: ${tarih(veri.gun)}`,
    dosyaAdi: `gunluk-faaliyet-${veri.gun}`,
    kpiler: [
      { etiket: 'Ulaşılan Cari', deger: sayi(veri.ulasilanCari), alt: 'tekil müşteri' },
      { etiket: 'Gönderilen Bildirim', deger: sayi(veri.bildirimler.length) },
      { etiket: 'Ödeme Yapan Cari', deger: sayi(veri.odeyenCari) },
      { etiket: 'Gelen Tahsilat', deger: tl(veri.tahsilatToplami), alt: `${veri.tahsilatlar.length} ödeme` },
    ],
    tablolar: [
      {
        baslik: 'Kanal Dağılımı',
        basliklar: ['Kanal', 'Gönderim'],
        sagSutunlar: [1],
        monoSutunlar: [1],
        satirlar: veri.kanallar.map((k) => [kanalAdi(k.kanal), sayi(k.adet)]),
        toplamSatiri: ['TOPLAM', sayi(veri.bildirimler.length)],
      },
      {
        baslik: 'Gönderim Sonuçları',
        basliklar: ['Sonuç', 'Adet'],
        sagSutunlar: [1],
        monoSutunlar: [1],
        satirlar: veri.durumlar.map((d) => [durumAdi(d.durum), sayi(d.adet)]),
      },
      {
        baslik: 'Gelen Ödemeler',
        basliklar: ['Cari Kodu', 'Cari Adı', 'Fatura No', 'Yöntem', 'Tutar'],
        sagSutunlar: [4],
        monoSutunlar: [0, 2, 4],
        satirlar: veri.tahsilatlar.map((t) => [
          t.customer.kod,
          t.customer.ad,
          t.invoice?.faturaNo ?? '—',
          yontemAdi(t.yontem),
          tl(t.tutar),
        ]),
        toplamSatiri: ['TOPLAM', `${veri.tahsilatlar.length} ödeme`, '', '', tl(veri.tahsilatToplami)],
      },
      {
        baslik: 'Gönderilen Bildirimler',
        basliklar: ['Saat', 'Cari Kodu', 'Cari Adı', 'Kanal', 'Şablon', 'Gecikme', 'Sonuç'],
        sagSutunlar: [5],
        monoSutunlar: [0, 1, 5],
        satirlar: veri.bildirimler.map((b) => [
          saat(b.gonderimZamani),
          b.customer.kod,
          b.customer.ad,
          kanalAdi(b.kanal),
          b.sablon,
          b.gonderimdekiGecikmeGunu < 0
            ? `vade öncesi ${Math.abs(b.gonderimdekiGecikmeGunu)}g`
            : `${b.gonderimdekiGecikmeGunu} gün`,
          durumAdi(b.durum),
        ]),
      },
    ],
    notlar: [
      '"Ulaşılan Cari" tekil müşteri sayısıdır; aynı cariye gün içinde birden fazla kanaldan gönderim yapılmış olabilir, bu yüzden bildirim adedinden küçüktür.',
      'Gelen tahsilatlar o günün gönderimleriyle nedensel olarak ilişkili olmak zorunda değildir; kanal etkinliği için Bildirim Etkinliği raporuna bakılmalıdır.',
    ],
  }

  return (
    <div className="space-y-8">
      {/* Gün seçici */}
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="rapor" value="gunluk" />
        <div>
          <label htmlFor="gun" className="lbl mb-1.5 block">Rapor Günü</label>
          <input id="gun" name="gun" type="date" defaultValue={veri.gun} className="input w-auto" />
        </div>
        <button type="submit" className="btn btn-ink">Getir</button>
        <div className="ml-auto">
          <PdfButton rapor={rapor} etiket="Günlük Raporu İndir" birincil />
        </div>
      </form>

      <KpiKusak>
        <Kpi etiket="Ulaşılan Cari" deger={sayi(veri.ulasilanCari)} alt="tekil müşteri" buyuk />
        <Kpi
          etiket="Gönderilen Bildirim"
          deger={sayi(veri.bildirimler.length)}
          alt={veri.kanallar.map((k) => `${kanalAdi(k.kanal)} ${k.adet}`).join(' · ') || 'gönderim yok'}
        />
        <Kpi etiket="Ödeme Yapan Cari" deger={sayi(veri.odeyenCari)} />
        <Kpi
          etiket="Gelen Tahsilat"
          deger={tlKisa(veri.tahsilatToplami)}
          alt={`${sayi(veri.tahsilatlar.length)} ödeme`}
          sinif="ok"
        />
      </KpiKusak>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader baslik={"Kanal Dağılımı"} />
          {veri.kanallar.length === 0 ? (
            <p className="text-sm text-label-2">Bu günde gönderim yapılmamış.</p>
          ) : (
            <div className="tbl-kaydir">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Kanal</th>
                    <th scope="col" className="sag">Gönderim</th>
                    <th scope="col" className="w-1/2">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.kanallar.map((k) => (
                    <tr key={k.kanal}>
                      <td className="font-medium">{kanalAdi(k.kanal)}</td>
                      <td className="sag num">{sayi(k.adet)}</td>
                      <td>
                        <span
                          className="oran"
                          style={{ width: `${(k.adet / veri.bildirimler.length) * 100}%` }}
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <SectionHeader baslik={"Gönderim Sonuçları"} />
          {veri.durumlar.length === 0 ? (
            <p className="text-sm text-label-2">Kayıt yok.</p>
          ) : (
            <div className="tbl-kaydir">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Sonuç</th>
                    <th scope="col" className="sag">Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.durumlar.map((d) => (
                    <tr key={d.durum}>
                      <td>
                        <span
                          className={`tick ${
                            d.durum === 'BASARISIZ' || d.durum === 'CEVAPSIZ' ? 't-crit' : 't-ok'
                          }`}
                        >
                          {durumAdi(d.durum)}
                        </span>
                      </td>
                      <td className="sag num">{sayi(d.adet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader baslik={"Gelen Ödemeler"} yan={<span className="num kpi-sub">{tl(veri.tahsilatToplami)}</span>} />
        {veri.tahsilatlar.length === 0 ? (
          <p className="text-sm text-label-2">Bu günde ödeme gelmemiş.</p>
        ) : (
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Cari</th>
                  <th scope="col">Fatura No</th>
                  <th scope="col">Yöntem</th>
                  <th scope="col">Açıklama</th>
                  <th scope="col" className="sag">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {veri.tahsilatlar.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        href={`/cariler/${t.customerId}`}
                        className="baglanti"
                      >
                        <span className="num text-label-2">{t.customer.kod}</span> {t.customer.ad}
                      </Link>
                    </td>
                    <td className="num text-label-2">{t.invoice?.faturaNo ?? '—'}</td>
                    <td>{yontemAdi(t.yontem)}</td>
                    <td className="text-label-2">{t.aciklama ?? '—'}</td>
                    <td className="sag num font-medium">{tl(t.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} >TOPLAM</td>
                  <td className="sag num">{tl(veri.tahsilatToplami)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeader baslik={"Gönderilen Bildirimler"} yan={<span className="num kpi-sub">{sayi(veri.bildirimler.length)} kayıt</span>} />
        {veri.bildirimler.length === 0 ? (
          <p className="text-sm text-label-2">Bu günde bildirim gönderilmemiş.</p>
        ) : (
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Saat</th>
                  <th scope="col">Cari</th>
                  <th scope="col">Kanal</th>
                  <th scope="col">Şablon</th>
                  <th scope="col" className="sag">Gecikme</th>
                  <th scope="col">Sonuç</th>
                </tr>
              </thead>
              <tbody>
                {veri.bildirimler.map((b) => (
                  <tr key={b.id}>
                    <td className="num">{saat(b.gonderimZamani)}</td>
                    <td>
                      <Link
                        href={`/cariler/${b.customerId}`}
                        className="baglanti"
                      >
                        <span className="num text-label-2">{b.customer.kod}</span> {b.customer.ad}
                      </Link>
                    </td>
                    <td className="font-medium">{kanalAdi(b.kanal)}</td>
                    <td className="text-label-2">{b.sablon}</td>
                    <td className="sag num">
                      {b.gonderimdekiGecikmeGunu < 0
                        ? `vade öncesi ${Math.abs(b.gonderimdekiGecikmeGunu)}g`
                        : `${b.gonderimdekiGecikmeGunu} gün`}
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
        )}
      </div>
    </div>
  )
}
