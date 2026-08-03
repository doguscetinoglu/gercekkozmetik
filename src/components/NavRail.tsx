'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UYARI_EKRANI } from '@/lib/brand'
import {
  IkonBildirim,
  IkonCari,
  IkonPanel,
  IkonRapor,
  IkonTahsilat,
  IkonUyari,
} from './icons'

const MENU = [
  { yol: '/', ad: 'Panel', kisaAd: 'Panel', Ikon: IkonPanel },
  { yol: '/cariler', ad: 'Cari Hesaplar', kisaAd: 'Cariler', Ikon: IkonCari },
  {
    yol: UYARI_EKRANI.yol,
    ad: UYARI_EKRANI.ad,
    kisaAd: UYARI_EKRANI.kisaAd,
    Ikon: IkonUyari,
  },
  { yol: '/bildirimler', ad: 'Bildirimler', kisaAd: 'Bildirim', Ikon: IkonBildirim },
  { yol: '/tahsilatlar', ad: 'Tahsilatlar', kisaAd: 'Tahsilat', Ikon: IkonTahsilat },
  { yol: '/raporlar', ad: 'Raporlar', kisaAd: 'Rapor', Ikon: IkonRapor },
] as const

/**
 * "/" yalnızca tam eşleşmede aktif; diğerleri alt sayfalarda da aktif kalır
 * (örn. /cariler/abc123 → Cari Hesaplar işaretli görünür).
 */
const aktifMi = (yol: string, hedef: string) =>
  hedef === '/' ? yol === '/' : yol.startsWith(hedef)

/**
 * macOS kenar çubuğu — Finder/Mail dilinde.
 *
 * Seçili öğe: yumuşak mavi tint zemin + yuvarlak köşe, İKON mavi, ETİKET koyu.
 * Etiketi maviye boyamıyoruz: Apple mavisi (#0071E3) tint zemin üzerinde 4.31
 * kontrast veriyor ve metin için AA'yı geçmiyor. macOS'un kendi çözümü de bu —
 * renk ikonda, okunurluk etikette.
 */
export function Sidebar() {
  const yol = usePathname()

  return (
    <nav aria-label="Ana menü" className="px-2.5">
      <ul className="space-y-0.5">
        {MENU.map(({ yol: hedef, ad, Ikon }) => {
          const aktif = aktifMi(yol, hedef)
          return (
            <li key={hedef}>
              <Link
                href={hedef}
                aria-current={aktif ? 'page' : undefined}
                className={`group flex min-h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 text-[0.875rem] tracking-[-0.005em] transition-colors duration-150 ${
                  aktif
                    ? 'bg-accent-soft font-semibold text-label'
                    : 'font-medium text-label-2 hover:bg-fill-hover hover:text-label'
                }`}
              >
                <Ikon
                  boyut={19}
                  className={
                    aktif ? 'text-accent' : 'text-label-3 group-hover:text-label-2'
                  }
                />
                {ad}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * iOS sekme çubuğu — mobilde ekranın altına sabitlenir.
 *
 * Yatay kaydırmalı bir şerit yerine gerçek bir tab bar: baş parmak erişiminde,
 * ikon + küçük etiket, seçili olan mavi. `safe-area-inset-bottom` ile iPhone
 * ana ekran çubuğunun altına girmez.
 */
export function TabBar() {
  const yol = usePathname()

  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-chrome/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {MENU.map(({ yol: hedef, kisaAd, Ikon }) => {
          const aktif = aktifMi(yol, hedef)
          return (
            <li key={hedef} className="flex-1">
              <Link
                href={hedef}
                aria-current={aktif ? 'page' : undefined}
                className={`flex min-h-[50px] flex-col items-center justify-center gap-1 pt-1.5 pb-1 transition-colors duration-150 ${
                  aktif ? 'text-accent' : 'text-label-3'
                }`}
              >
                <Ikon boyut={23} />
                <span
                  className={`text-[0.625rem] leading-none tracking-[0.005em] ${
                    aktif ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {kisaAd}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
