import Link from 'next/link'
import PageHeader, { SectionHeader } from '@/components/PageHeader'
import { BUGUN } from '@/lib/brand'
import { gunAnahtari } from '@/lib/format'
import {
  etkinlikRaporu,
  gunlukFaaliyet,
  performansRaporu,
  yaslandirmaRaporu,
} from '@/lib/queries'
import GunlukRapor from './GunlukRapor'
import YaslandirmaRapor from './YaslandirmaRapor'
import EtkinlikRapor from './EtkinlikRapor'
import PerformansRapor from './PerformansRapor'

export const metadata = { title: 'Raporlar — Gerçek Kozmetik' }

const RAPORLAR = [
  { anahtar: 'gunluk', ad: 'Günlük Faaliyet', aciklama: 'Seçilen günde kaç hatırlatma gitti, kaç ödeme geldi' },
  { anahtar: 'yaslandirma', ad: 'Cari Yaşlandırma', aciklama: 'Açık bakiyenin gecikme kovalarına dağılımı' },
  { anahtar: 'etkinlik', ad: 'Bildirim Etkinliği', aciklama: 'Hangi kanal ne kadar tahsilat getiriyor' },
  { anahtar: 'performans', ad: 'Tahsilat Performansı', aciklama: 'Dönem tahsilatı, vade uyumu, temsilci kırılımı' },
] as const

type RaporAnahtar = (typeof RAPORLAR)[number]['anahtar']

/** Varsayılan dönem: son 30 gün. */
const VARSAYILAN_BASLANGIC = gunAnahtari(new Date(BUGUN.getTime() - 29 * 86_400_000))
const VARSAYILAN_BITIS = gunAnahtari(BUGUN)

export default async function RaporlarSayfasi(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await props.searchParams
  const tek = (a: string) => (Array.isArray(sp[a]) ? sp[a]![0] : (sp[a] as string | undefined)) ?? ''

  const secili = (RAPORLAR.some((r) => r.anahtar === tek('rapor'))
    ? tek('rapor')
    : 'gunluk') as RaporAnahtar

  const gun = tek('gun') || gunAnahtari(BUGUN)
  const baslangic = tek('baslangic') || VARSAYILAN_BASLANGIC
  const bitis = tek('bitis') || VARSAYILAN_BITIS

  const aktif = RAPORLAR.find((r) => r.anahtar === secili)!

  return (
    <div className="space-y-8">
      <PageHeader
        ustEtiket="Rapor merkezi"
        baslik="Hazır Raporlar"
        aciklama="Her rapor ekranda görüntülenir ve aynı verilerle PDF olarak indirilir."
      />

      {/* Rapor seçimi — Apple'ın segmentli kontrolü. Yatay kaydırma kabı
          içinde, çünkü dört etiket dar ekranda sığmıyor. */}
      <nav aria-label="Rapor seçimi" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="seg w-max">
          {RAPORLAR.map((r) => (
            <Link
              key={r.anahtar}
              href={`/raporlar?rapor=${r.anahtar}&gun=${gun}&baslangic=${baslangic}&bitis=${bitis}`}
              aria-current={r.anahtar === secili ? 'page' : undefined}
              data-aktif={r.anahtar === secili}
              className="seg-oge"
            >
              {r.ad}
            </Link>
          ))}
        </div>
      </nav>

      <section>
        <SectionHeader baslik={`${aktif.ad} raporu`} yan={<span className="lbl">{aktif.aciklama}</span>} />

        {secili === 'gunluk' && <GunlukRapor veri={await gunlukFaaliyet(gun)} />}
        {secili === 'yaslandirma' && <YaslandirmaRapor veri={await yaslandirmaRaporu()} />}
        {secili === 'etkinlik' && (
          <EtkinlikRapor veri={await etkinlikRaporu(baslangic, bitis)} />
        )}
        {secili === 'performans' && (
          <PerformansRapor veri={await performansRaporu(baslangic, bitis)} />
        )}
      </section>
    </div>
  )
}
