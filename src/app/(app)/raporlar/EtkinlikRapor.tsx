import Kpi, { KpiKusak } from '@/components/Kpi'
import { SectionHeader } from '@/components/PageHeader'
import PdfButton from '@/components/PdfButton'
import { durumAdi, kanalAdi, sayi, tarih, tl, tlKisa, yuzde } from '@/lib/format'
import { etkinlikRaporu } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

type Veri = Awaited<ReturnType<typeof etkinlikRaporu>>

/**
 * BİLDİRİM ETKİNLİK RAPORU — "hangi kanal gerçekten para getiriyor".
 *
 * Atıf kuralı metrics.ts/bildirimEtkinligi içinde: her tahsilat, kendisinden
 * önceki 5 gün içindeki EN SON bildirime yazılır. Korelasyon ölçümüdür;
 * rapor notlarında bu açıkça belirtiliyor — müşteriye nedensellik gibi
 * sunulmaması önemli.
 */
export default function EtkinlikRapor({ veri }: { veri: Veri }) {
  const toplamDonusen = veri.kanallar.reduce((t, k) => t + k.donusen, 0)
  const toplamAtfedilen = veri.kanallar.reduce((t, k) => t + k.atfedilenTutar, 0)
  const genelDonusum =
    veri.toplamBildirim === 0 ? 0 : (toplamDonusen / veri.toplamBildirim) * 100

  const enIyiKanal = veri.kanallar.reduce(
    (en, k) => (!en || k.donusumOrani > en.donusumOrani ? k : en),
    veri.kanallar[0],
  )

  const rapor: PdfRapor = {
    baslik: 'Bildirim Etkinlik Raporu',
    altBaslik: 'Kanal ve gecikme aralığı bazında tahsilat dönüşümü',
    donem: `Dönem: ${tarih(veri.baslangic)} — ${tarih(veri.bitis)}`,
    dosyaAdi: `bildirim-etkinlik-${veri.baslangic}_${veri.bitis}`,
    yatay: true,
    kpiler: [
      { etiket: 'Gönderim', deger: sayi(veri.toplamBildirim) },
      { etiket: 'Dönüşen', deger: sayi(toplamDonusen), alt: 'ardından ödeme geldi' },
      { etiket: 'Dönüşüm Oranı', deger: yuzde(genelDonusum) },
      { etiket: 'Atfedilen Tahsilat', deger: tl(toplamAtfedilen) },
      { etiket: 'En Etkili Kanal', deger: enIyiKanal ? kanalAdi(enIyiKanal.kanal) : '—' },
    ],
    tablolar: [
      {
        baslik: 'Kanal Bazında Etkinlik',
        basliklar: ['Kanal', 'Gönderim', 'Dönüşen', 'Dönüşüm', 'Atfedilen Tahsilat', 'Ort. Tahsil Süresi'],
        sagSutunlar: [1, 2, 3, 4, 5],
        monoSutunlar: [1, 2, 3, 4, 5],
        satirlar: veri.kanallar.map((k) => [
          kanalAdi(k.kanal),
          sayi(k.gonderim),
          sayi(k.donusen),
          yuzde(k.donusumOrani),
          tl(k.atfedilenTutar),
          `${k.ortTahsilGunu} gün`,
        ]),
        toplamSatiri: [
          'TOPLAM',
          sayi(veri.toplamBildirim),
          sayi(toplamDonusen),
          yuzde(genelDonusum),
          tl(toplamAtfedilen),
          '',
        ],
      },
      {
        baslik: 'Gecikme Aralığına Göre Etkinlik',
        basliklar: ['Gönderim Anındaki Gecikme', 'Gönderim', 'Dönüşen', 'Dönüşüm', 'Atfedilen Tahsilat'],
        sagSutunlar: [1, 2, 3, 4],
        monoSutunlar: [1, 2, 3, 4],
        satirlar: veri.aralikSatirlari.map((a) => [
          a.etiket,
          sayi(a.gonderim),
          sayi(a.donusen),
          yuzde(a.donusumOrani),
          tl(a.atfedilenTutar),
        ]),
      },
      {
        baslik: 'Teslim Durumu Dağılımı',
        basliklar: ['Sonuç', 'Adet', 'Pay'],
        sagSutunlar: [1, 2],
        monoSutunlar: [1, 2],
        satirlar: veri.durumlar.map((d) => [
          durumAdi(d.durum),
          sayi(d.adet),
          yuzde((d.adet / veri.toplamBildirim) * 100),
        ]),
      },
    ],
    notlar: [
      'Atıf kuralı: her tahsilat, kendisinden önceki 5 gün içinde aynı cariye gönderilmiş EN SON bildirime yazılır. "En son" olması şart — aksi halde aynı tahsilat birden fazla bildirime sayılır ve oranlar şişer.',
      'Bu bir KORELASYON ölçümüdür, nedensellik kanıtı değildir. Müşteri bildirimden bağımsız olarak da ödeme yapmış olabilir.',
      'Vade öncesi hatırlatmalar negatif gecikme günüyle kaydedilir; genelde en yüksek dönüşümü bunlar verir çünkü ödeme niyeti olan müşteriye ucuz bir dokunuştur.',
    ],
  }

  return (
    <div className="space-y-8">
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="rapor" value="etkinlik" />
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
          <PdfButton rapor={rapor} etiket="Etkinlik Raporu İndir" birincil />
        </div>
      </form>

      <KpiKusak>
        <Kpi etiket="Gönderim" deger={sayi(veri.toplamBildirim)} buyuk />
        <Kpi etiket="Dönüşen" deger={sayi(toplamDonusen)} alt="ardından ödeme geldi" />
        <Kpi etiket="Dönüşüm Oranı" deger={yuzde(genelDonusum)} sinif="ok" />
        <Kpi etiket="Atfedilen Tahsilat" deger={tlKisa(toplamAtfedilen)} sinif="ok" />
        <Kpi
          etiket="En Etkili Kanal"
          deger={enIyiKanal ? kanalAdi(enIyiKanal.kanal) : '—'}
          alt={enIyiKanal ? `%${enIyiKanal.donusumOrani} dönüşüm` : ''}
        />
      </KpiKusak>

      <div>
        <SectionHeader baslik={"Kanal Bazında Etkinlik"} />
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kanal</th>
                <th scope="col" className="sag">Gönderim</th>
                <th scope="col" className="sag">Dönüşen</th>
                <th scope="col" className="sag">Dönüşüm</th>
                <th scope="col" className="sag">Atfedilen Tahsilat</th>
                <th scope="col" className="sag">Ort. Tahsil Süresi</th>
                <th scope="col" className="w-1/5">Dönüşüm Payı</th>
              </tr>
            </thead>
            <tbody>
              {veri.kanallar.map((k) => (
                <tr key={k.kanal}>
                  <td className="font-medium">{kanalAdi(k.kanal)}</td>
                  <td className="sag num">{sayi(k.gonderim)}</td>
                  <td className="sag num">{sayi(k.donusen)}</td>
                  <td className="sag num font-medium">{yuzde(k.donusumOrani)}</td>
                  <td className="sag num">{tl(k.atfedilenTutar)}</td>
                  <td className="sag num">{k.ortTahsilGunu} gün</td>
                  <td>
                    <span
                      className="oran"
                      style={{ width: `${Math.min(k.donusumOrani * 2, 100)}%` }}
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOPLAM</td>
                <td className="sag num">{sayi(veri.toplamBildirim)}</td>
                <td className="sag num">{sayi(toplamDonusen)}</td>
                <td className="sag num">{yuzde(genelDonusum)}</td>
                <td className="sag num">{tl(toplamAtfedilen)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader baslik={"Gecikme Aralığına Göre Etkinlik"} />
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Gönderim Anındaki Gecikme</th>
                  <th scope="col" className="sag">Gönderim</th>
                  <th scope="col" className="sag">Dönüşüm</th>
                  <th scope="col" className="sag">Atfedilen</th>
                </tr>
              </thead>
              <tbody>
                {veri.aralikSatirlari.map((a) => (
                  <tr key={a.etiket}>
                    <td className="font-medium">{a.etiket}</td>
                    <td className="sag num">{sayi(a.gonderim)}</td>
                    <td className="sag num font-medium">{yuzde(a.donusumOrani)}</td>
                    <td className="sag num">{tlKisa(a.atfedilenTutar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeader baslik={"Teslim Durumu Dağılımı"} />
          <div className="tbl-kaydir">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Sonuç</th>
                  <th scope="col" className="sag">Adet</th>
                  <th scope="col" className="sag">Pay</th>
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
                    <td className="sag num">{yuzde((d.adet / veri.toplamBildirim) * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Metodoloji uyarısı ekranda da görünür — PDF'e hapsedilmez. */}
      <p className="grup text-[0.8125rem] leading-relaxed text-label-2">
        <strong className="font-semibold">Yöntem:</strong> Her tahsilat, kendisinden önceki 5 gün
        içinde aynı cariye gönderilmiş <em>en son</em> bildirime atfedilir. Bu bir korelasyon
        ölçümüdür; müşteri bildirimden bağımsız olarak da ödeme yapmış olabilir.
      </p>
    </div>
  )
}
