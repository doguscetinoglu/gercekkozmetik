import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PdfButton from '@/components/PdfButton'
import { BUGUN } from '@/lib/brand'
import { durumAdi, kanalAdi, saat, sayi, tarih, tarihAcik } from '@/lib/format'
import { bildirimSayfasi } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: 'Bildirimler — Gerçek Kozmetik' }

const KANALLAR = ['SMS', 'WHATSAPP', 'EMAIL', 'CALL'] as const

/** Başarısız/cevapsız gönderim olumsuz sonuçtur — sinyal rengi ona göre seçilir. */
const durumSinifi = (durum: string) =>
  durum === 'BASARISIZ' || durum === 'CEVAPSIZ' ? 't-crit' : durum === 'OKUNDU' || durum === 'CEVAPLANDI' ? 't-ok' : 't-mute'

export default async function BildirimlerSayfasi(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await props.searchParams
  const tek = (a: string) => (Array.isArray(sp[a]) ? sp[a]![0] : (sp[a] as string | undefined)) ?? ''

  const kanal = tek('kanal')
  const gun = tek('gun')
  const sayfa = Math.max(1, Number(tek('sayfa')) || 1)

  const v = await bildirimSayfasi({ kanal: kanal || undefined, gun: gun || undefined, sayfa })
  const sonSayfa = Math.max(1, Math.ceil(v.toplam / v.sayfaBoyu))

  // Matristeki 14 günün kanal toplamları
  const matrisToplam = KANALLAR.map((k) => ({
    kanal: k,
    adet: v.matris.reduce((t, g) => t + g[k], 0),
  }))
  const matrisGenelToplam = matrisToplam.reduce((t, k) => t + k.adet, 0)

  const rapor: PdfRapor = {
    baslik: 'Bildirim Faaliyet Raporu',
    altBaslik: [kanal && kanalAdi(kanal), gun && `Gün: ${tarih(gun)}`].filter(Boolean).join(' · ') || 'Son 14 günün kanal dağılımı',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `bildirim-raporu-${BUGUN.toISOString().slice(0, 10)}`,
    kpiler: [
      { etiket: 'Toplam Kayıt', deger: sayi(v.toplam), alt: 'filtreye uyan' },
      { etiket: '14 Günde Gönderim', deger: sayi(matrisGenelToplam) },
      ...matrisToplam.map((k) => ({ etiket: kanalAdi(k.kanal), deger: sayi(k.adet) })),
    ],
    tablolar: [
      {
        baslik: 'Gün × Kanal Dağılımı (Son 14 Gün)',
        basliklar: ['Tarih', 'SMS', 'WhatsApp', 'E-posta', 'Telefon', 'Toplam'],
        sagSutunlar: [1, 2, 3, 4, 5],
        monoSutunlar: [0, 1, 2, 3, 4, 5],
        satirlar: v.matris.map((g) => [
          tarih(g.gun),
          sayi(g.SMS),
          sayi(g.WHATSAPP),
          sayi(g.EMAIL),
          sayi(g.CALL),
          sayi(g.toplam),
        ]),
        toplamSatiri: [
          'TOPLAM',
          ...matrisToplam.map((k) => sayi(k.adet)),
          sayi(matrisGenelToplam),
        ],
      },
      {
        baslik: `Bildirim Kayıtları (sayfa ${v.sayfa} / ${sonSayfa})`,
        basliklar: ['Tarih', 'Saat', 'Cari Kodu', 'Cari Adı', 'Kanal', 'Şablon', 'Gecikme', 'Sonuç'],
        sagSutunlar: [6],
        monoSutunlar: [0, 1, 2, 6],
        satirlar: v.kayitlar.map((b) => [
          tarih(b.gonderimZamani),
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
      'Kanal eskalasyonu: gecikme büyüdükçe sistem SMS → WhatsApp → E-posta → Telefon sırasıyla sertleşir.',
      'Negatif gecikme değeri, vade dolmadan gönderilen önleyici hatırlatmayı gösterir.',
    ],
  }

  /** Mevcut filtreleri koruyarak sayfa bağlantısı üretir. */
  const sayfaLinki = (s: number) => {
    const p = new URLSearchParams()
    if (kanal) p.set('kanal', kanal)
    if (gun) p.set('gun', gun)
    p.set('sayfa', String(s))
    return `/bildirimler?${p}`
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="lbl block">Bilgilendirme Kaydı</span>
          <h1 className="mt-1 text-xl font-semibold">{sayi(v.toplam)} bildirim</h1>
        </div>
        <PdfButton rapor={rapor} etiket="Bildirim Raporu (PDF)" />
      </div>

      <KpiKusak>
        {matrisToplam.map((k) => (
          <Kpi
            key={k.kanal}
            etiket={kanalAdi(k.kanal)}
            deger={sayi(k.adet)}
            alt="son 14 gün"
          />
        ))}
        <Kpi etiket="14 Gün Toplam" deger={sayi(matrisGenelToplam)} buyuk />
      </KpiKusak>

      {/* Gün × kanal matrisi — "günde kaç bildirim, hangi kanaldan" sorusunun cevabı */}
      <section>
        <div className="panel-head">
          <h2 className="lbl">Gün × Kanal Dağılımı — Son 14 Gün</h2>
        </div>
        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                {KANALLAR.map((k) => (
                  <th key={k} scope="col" className="sag">{kanalAdi(k)}</th>
                ))}
                <th scope="col" className="sag">Toplam</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {v.matris.map((g) => (
                <tr key={g.gun}>
                  <td className="num">{tarih(g.gun)}</td>
                  {KANALLAR.map((k) => (
                    <td key={k} className="sag num">
                      {g[k] || <span className="text-ink-mute">—</span>}
                    </td>
                  ))}
                  <td className="sag num font-semibold">{sayi(g.toplam)}</td>
                  <td className="sag">
                    <Link
                      href={`/bildirimler?gun=${g.gun}`}
                      className="text-xs underline underline-offset-4"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-rule-strong font-semibold">
                <td className="pt-2">TOPLAM</td>
                {matrisToplam.map((k) => (
                  <td key={k.kanal} className="sag num pt-2">{sayi(k.adet)}</td>
                ))}
                <td className="sag num pt-2">{sayi(matrisGenelToplam)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Kayıt listesi + filtre */}
      <section>
        <div className="panel-head">
          <h2 className="lbl">Bildirim Kayıtları</h2>
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="kanal" className="lbl mb-1.5 block">Kanal</label>
            <select id="kanal" name="kanal" defaultValue={kanal} className="select w-auto">
              <option value="">Tümü</option>
              {KANALLAR.map((k) => (
                <option key={k} value={k}>{kanalAdi(k)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gun" className="lbl mb-1.5 block">Gün</label>
            <input id="gun" name="gun" type="date" defaultValue={gun} className="input w-auto" />
          </div>
          <button type="submit" className="btn btn-ink">Uygula</button>
          <Link href="/bildirimler" className="btn">Temizle</Link>
        </form>

        <div className="tbl-kaydir">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Saat</th>
                <th scope="col">Cari</th>
                <th scope="col">Kanal</th>
                <th scope="col">Şablon</th>
                <th scope="col">Fatura</th>
                <th scope="col" className="sag">Gönderimdeki Gecikme</th>
                <th scope="col">Sonuç</th>
              </tr>
            </thead>
            <tbody>
              {v.kayitlar.map((b) => (
                <tr key={b.id}>
                  <td className="num">{tarih(b.gonderimZamani)}</td>
                  <td className="num text-ink-soft">{saat(b.gonderimZamani)}</td>
                  <td>
                    <Link
                      href={`/cariler/${b.customerId}`}
                      className="underline underline-offset-4 decoration-rule-strong hover:decoration-ink"
                    >
                      <span className="num text-ink-mute">{b.customer.kod}</span> {b.customer.ad}
                    </Link>
                  </td>
                  <td className="font-medium">{kanalAdi(b.kanal)}</td>
                  <td className="text-ink-soft">{b.sablon}</td>
                  <td className="num text-ink-soft">{b.invoice?.faturaNo ?? '—'}</td>
                  <td className="sag num">
                    {b.gonderimdekiGecikmeGunu < 0
                      ? `vade öncesi ${Math.abs(b.gonderimdekiGecikmeGunu)}g`
                      : `${b.gonderimdekiGecikmeGunu} gün`}
                  </td>
                  <td>
                    <span className={`tick ${durumSinifi(b.durum)}`}>{durumAdi(b.durum)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {v.kayitlar.length === 0 && (
          <p className="border border-rule p-6 text-center text-sm text-ink-mute">
            Bu filtrelerle bildirim bulunamadı.
          </p>
        )}

        {/* Sayfalama — tablo 50 satırla sınırlı tutulur, tüm kayıt basılmaz. */}
        {sonSayfa > 1 && (
          <nav className="mt-4 flex items-center justify-between gap-4" aria-label="Sayfalama">
            {v.sayfa > 1 ? (
              <Link href={sayfaLinki(v.sayfa - 1)} className="btn">← Önceki</Link>
            ) : (
              <span />
            )}
            <span className="num text-xs text-ink-mute">
              Sayfa {v.sayfa} / {sonSayfa}
            </span>
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
