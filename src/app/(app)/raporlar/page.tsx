import Link from 'next/link'
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
    <div className="space-y-7">
      <div>
        <span className="lbl block">Rapor Merkezi</span>
        <h1 className="mt-1 text-xl font-semibold">Hazır Raporlar</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Her rapor ekranda görüntülenir ve aynı verilerle PDF olarak indirilir.
        </p>
      </div>

      {/* Rapor seçimi — sekme değil, saç çizgiyle ayrılmış dört alan */}
      <nav aria-label="Rapor seçimi" className="grid divide-y divide-rule border-y border-rule-strong sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {RAPORLAR.map((r) => {
          const isAktif = r.anahtar === secili
          return (
            <Link
              key={r.anahtar}
              href={`/raporlar?rapor=${r.anahtar}&gun=${gun}&baslangic=${baslangic}&bitis=${bitis}`}
              aria-current={isAktif ? 'page' : undefined}
              className={`block border-l-3 px-4 py-3.5 transition-colors ${
                isAktif
                  ? 'border-l-ink bg-paper-2'
                  : 'border-l-transparent hover:bg-paper-2'
              }`}
            >
              <span className={`block text-sm ${isAktif ? 'font-semibold' : 'font-medium text-ink-soft'}`}>
                {r.ad}
              </span>
              <span className="mt-1 block text-xs leading-snug text-ink-mute">{r.aciklama}</span>
            </Link>
          )
        })}
      </nav>

      <section>
        <div className="panel-head">
          <h2 className="lbl">{aktif.ad} Raporu</h2>
        </div>

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
