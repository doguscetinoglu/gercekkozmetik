import Link from 'next/link'
import Kpi, { KpiKusak } from '@/components/Kpi'
import PageHeader, { SectionHeader } from '@/components/PageHeader'
import PdfButton from '@/components/PdfButton'
import RiskBand from '@/components/RiskBand'
import { BUGUN, MARKA, UYARI_EKRANI } from '@/lib/brand'
import { sayi, segmentAdi, tarih, tarihAcik, tl, tlKisa } from '@/lib/format'
import { SEVIYE_ADI, UYARI_ESIK, type UyariSinif } from '@/lib/metrics'
import { filtreSecenekleri, temsilciUyarilari, type UyariSatiri } from '@/lib/queries'
import type { PdfRapor } from '@/lib/pdf/report'

export const metadata = { title: `${UYARI_EKRANI.ad} — ${MARKA.tamAd}` }

/**
 * Temsilci Uyarıları ekranı.
 *
 * Diğer ekranlar "ne oldu" sorusunu tabloyla cevaplar; bu ekran "kimi, neden ve
 * nasıl arayacağım" sorusunu cevaplar. Bu yüzden tablo değil, öncelik sırasına
 * dizilmiş kart listesi: her kart tek bir cari, sebepleri ve tek cümlelik aksiyon.
 *
 * Salt okunur — panelin geri kalanı gibi hiçbir kayıt değiştirmez.
 */

/** Kural kartı — eşikler koddaki sabitlerden okunur, ayrışamaz. */
const KURALLAR: { sinif: UyariSinif; baslik: string; metin: string }[] = [
  {
    sinif: 'crit',
    baslik: 'Kritik',
    metin: `${UYARI_ESIK.kritikGecikme} günden fazla gecikme ya da ${UYARI_ESIK.yuksekGecikme} günü aşan gecikmeyle birlikte kredi limiti aşımı.`,
  },
  {
    sinif: 'alert',
    baslik: 'Yüksek',
    metin: `${UYARI_ESIK.yuksekGecikme}-${UYARI_ESIK.kritikGecikme} gün gecikme, kredi limiti aşımı veya son ${UYARI_ESIK.sonucsuzPencere} günde ${UYARI_ESIK.sonucsuzBildirim}+ bildirime rağmen tahsilat gelmemesi.`,
  },
  {
    sinif: 'warn',
    baslik: 'İzlemede',
    metin: `1-${UYARI_ESIK.yuksekGecikme} gün gecikme, ${UYARI_ESIK.sessizlikGunu} gündür tahsilat olmaması ya da son ${UYARI_ESIK.sonBildirimPenceresi} bildirimin ${UYARI_ESIK.ulasilamamaAdedi}+ tanesinin cariye ulaşmaması.`,
  },
  {
    sinif: 'ok',
    baslik: 'Bilgi',
    metin: `Gecikme yok; ${UYARI_ESIK.vadeYaklasmaGunu} gün içinde vadesi dolacak fatura var. Vade öncesi hatırlatma gecikmeyi baştan engeller.`,
  },
]

export default async function DogalKatkiSayfasi(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Next 16: searchParams artık Promise.
  const sp = await props.searchParams
  const ham = Array.isArray(sp.temsilci) ? sp.temsilci[0] : sp.temsilci
  const temsilci = (ham ?? '').trim()

  const [secenekler, veri] = await Promise.all([
    filtreSecenekleri(),
    temsilciUyarilari(temsilci || undefined),
  ])

  const { satirlar, sayimlar, ozet, kovalar, portfoyAdedi, limitAsanAdedi } = veri
  const kapsam = temsilci || 'Tüm portföy'

  const rapor: PdfRapor = {
    baslik: UYARI_EKRANI.ad,
    altBaslik: temsilci ? `Temsilci: ${temsilci}` : 'Tüm satış temsilcileri',
    donem: `Rapor tarihi: ${tarihAcik(BUGUN)}`,
    dosyaAdi: `temsilci-uyarilari-${(temsilci || 'tum').toLocaleLowerCase('tr-TR').replace(/\s+/g, '-')}-${BUGUN.toISOString().slice(0, 10)}`,
    yatay: true,
    kpiler: [
      { etiket: 'Uyarı Verilen Cari', deger: sayi(satirlar.length), alt: `${sayi(portfoyAdedi)} cari içinde` },
      { etiket: 'Kritik', deger: sayi(sayimlar.crit) },
      { etiket: 'Vadesi Geçen', deger: tl(ozet.vadesiGecen) },
      { etiket: 'Limit Aşan Cari', deger: sayi(limitAsanAdedi) },
    ],
    tablolar: [
      {
        basliklar: [
          'Öncelik', 'Kod', 'Cari Adı', 'Şehir', 'Temsilci',
          'Vadesi Geçen', 'Gecikme', 'Uyarı Sebepleri', 'Yapılacak',
        ],
        sagSutunlar: [5, 6],
        // DİKKAT: mono alt kümesinde HARF yok (scripts/font-uret.mjs →
        // MONO_KARAKTERLER). "CH-0013" veya "99 gün" gibi harf içeren hücreler
        // mono sütuna konursa PDF'te sessizce kaybolur — yalnızca saf rakam
        // sütunu mono olur.
        monoSutunlar: [5],
        satirlar: satirlar.map((s) => [
          SEVIYE_ADI[s.seviye],
          s.kod,
          s.ad,
          s.sehir,
          s.temsilci,
          s.vadesiGecen > 0 ? tl(s.vadesiGecen) : '—',
          s.enYuksekGecikme > 0 ? `${s.enYuksekGecikme} gün` : '—',
          s.sebepler.map((u) => u.etiket).join(' · '),
          s.aksiyon,
        ]),
        toplamSatiri: [
          'TOPLAM', `${satirlar.length} cari`, '', '', '',
          tl(satirlar.reduce((t, s) => t + s.vadesiGecen, 0)), '', '', '',
        ],
      },
    ],
    notlar: KURALLAR.map((k) => `${k.baslik}: ${k.metin}`),
  }

  return (
    <div className="space-y-8">
      <PageHeader
        ustEtiket="Satış temsilcisi bilgilendirme"
        baslik={UYARI_EKRANI.ad}
        aciklama="Otomatik hatırlatma sisteminin yetmediği cariler. Liste öncelik sırasına dizilidir: en üstteki cari bugün aranmalıdır."
        eylemler={<PdfButton rapor={rapor} etiket="Brifingi indir" />}
      />

      {/* Temsilci seçimi — düz bağlantı, JavaScript gerektirmez. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <nav aria-label="Temsilci seçimi" className="seg">
          <Link
            href={UYARI_EKRANI.yol}
            data-aktif={!temsilci}
            aria-current={!temsilci ? 'true' : undefined}
            className="seg-oge"
          >
            Tüm portföy
          </Link>
          {secenekler.temsilciler.map((t) => (
            <Link
              key={t}
              href={`${UYARI_EKRANI.yol}?temsilci=${encodeURIComponent(t)}`}
              data-aktif={temsilci === t}
              aria-current={temsilci === t ? 'true' : undefined}
              className="seg-oge"
            >
              {t}
            </Link>
          ))}
        </nav>
      </div>

      <KpiKusak>
        <Kpi
          etiket="Uyarı Verilen Cari"
          deger={sayi(satirlar.length)}
          alt={`${kapsam} · ${sayi(portfoyAdedi)} cari`}
          buyuk
        />
        <Kpi etiket="Kritik" deger={sayi(sayimlar.crit)} sinif="crit" alt="Bugün temas edilmeli" />
        <Kpi etiket="Vadesi Geçen" deger={tlKisa(ozet.vadesiGecen)} sinif="alert" alt={`${sayi(ozet.vadesiGecenAdedi)} fatura`} />
        <Kpi etiket="Limit Aşan Cari" deger={sayi(limitAsanAdedi)} sinif="warn" alt="Yeni sevkiyat riski" />
      </KpiKusak>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Öncelik listesi ── */}
        <section className="lg:col-span-2">
          <SectionHeader
            baslik="Öncelik listesi"
            yan={<span className="ikincil">{sayi(satirlar.length)} cari</span>}
          />

          {satirlar.length === 0 ? (
            <p className="kart py-12 text-center text-sm text-label-2">
              {kapsam} için uyarı gerektiren cari yok. Portföy takvimine uygun ilerliyor.
            </p>
          ) : (
            <ol className="space-y-3">
              {satirlar.map((s, sira) => (
                <UyariKarti key={s.id} satir={s} sira={sira + 1} temsilciGoster={!temsilci} />
              ))}
            </ol>
          )}
        </section>

        {/* ── Yan sütun: portföyün fotoğrafı ve kural seti ── */}
        <aside className="space-y-6">
          <section className="kart kart-dolgu">
            <SectionHeader baslik="Portföy yaşlandırması" />
            <RiskBand kovalar={kovalar} tabloGoster={false} dar />
            <dl className="mt-5 space-y-2 border-t border-separator pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="lbl">Açık bakiye</dt>
                <dd className="num text-[0.875rem] font-semibold">{tl(ozet.acikBakiye)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="lbl">Ağırlıklı gecikme</dt>
                <dd className="num text-[0.875rem] font-semibold">
                  {ozet.agirlikliGecikmeGunu} gün
                </dd>
              </div>
            </dl>
          </section>

          <section className="grup">
            <h2 className="baslik-bolum mb-1">Uyarı nasıl hesaplanıyor?</h2>
            <p className="ikincil mb-4">
              Bir cari birden çok sebeple listeye girebilir; öncelik en ağır sebebe göre verilir.
            </p>
            <dl className="space-y-3.5">
              {KURALLAR.map((k) => (
                <div key={k.sinif}>
                  <dt>
                    <span className={`tick t-${k.sinif}`}>{k.baslik}</span>
                  </dt>
                  <dd className="ikincil mt-1.5">{k.metin}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}

/**
 * Tek cari kartı.
 *
 * Sıra numarası bilinçli: temsilci listeyi yukarıdan aşağı işler, "hangisinden
 * başlasam" sorusunu ekran cevaplar.
 */
function UyariKarti({
  satir,
  sira,
  temsilciGoster,
}: {
  satir: UyariSatiri
  sira: number
  temsilciGoster: boolean
}) {
  return (
    <li className="kart kart-dolgu">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[0.8125rem] font-semibold text-label-3">
              {sira.toString().padStart(2, '0')}
            </span>
            <span className={`tick t-${satir.seviye}`}>{SEVIYE_ADI[satir.seviye]}</span>
            <Link href={`/cariler/${satir.id}`} className="baglanti text-[0.9375rem]">
              {satir.ad}
            </Link>
          </div>
          <p className="kpi-sub mt-1.5">
            {satir.kod} · {segmentAdi(satir.segment)} · {satir.sehir}
            {temsilciGoster && ` · ${satir.temsilci}`} · {satir.telefon}
          </p>
        </div>

        <div className="flex-none text-right">
          <span className="num block text-[1.0625rem] font-semibold tracking-[-0.02em]">
            {satir.vadesiGecen > 0 ? tl(satir.vadesiGecen) : tl(satir.acikBakiye)}
          </span>
          <span className="kpi-sub">
            {satir.vadesiGecen > 0 ? 'vadesi geçen' : 'açık bakiye'}
          </span>
        </div>
      </div>

      {/* Sebepler — etiket kapsülü + tek satır açıklama. Renk tek başına anlam
          taşımaz, her kapsülün metni de okunur. */}
      <ul className="mt-4 space-y-2.5">
        {satir.sebepler.map((sebep) => (
          <li key={sebep.kod} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className={`tick t-${sebep.sinif} flex-none`}>{sebep.etiket}</span>
            <span className="ikincil min-w-0 flex-1">{sebep.detay}</span>
          </li>
        ))}
      </ul>

      {/* Yapılacak — kartın tek buyruğu. */}
      <p className="mt-4 rounded-[10px] bg-accent-soft px-3 py-2.5 text-[0.875rem] font-medium text-accent-deep">
        {satir.aksiyon}
      </p>

      <p className="kpi-sub mt-3">
        Son bildirim: {satir.sonBildirim ? tarih(satir.sonBildirim) : '—'} · Son tahsilat:{' '}
        {satir.sonTahsilat ? tarih(satir.sonTahsilat) : 'yok'}
      </p>
    </li>
  )
}
