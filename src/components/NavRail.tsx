'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MENU = [
  { yol: '/', ad: 'Panel' },
  { yol: '/cariler', ad: 'Cari Hesaplar' },
  { yol: '/bildirimler', ad: 'Bildirimler' },
  { yol: '/tahsilatlar', ad: 'Tahsilatlar' },
  { yol: '/raporlar', ad: 'Raporlar' },
] as const

/**
 * Navigasyon bağlantıları. Aktif öğe yuvarlak pill değil — solunda 3px dolu
 * mürekkep bloğu (bkz. globals.css .rail-link[data-aktif]).
 */
export default function NavRail() {
  const yol = usePathname()

  return (
    <nav aria-label="Ana menü" className="flex overflow-x-auto md:block md:overflow-visible">
      {MENU.map((oge) => {
        // "/" yalnızca tam eşleşmede aktif; diğerleri alt sayfalarda da aktif kalır
        // (örn. /cariler/abc123 → Cari Hesaplar işaretli görünür).
        const aktif = oge.yol === '/' ? yol === '/' : yol.startsWith(oge.yol)
        return (
          <Link
            key={oge.yol}
            href={oge.yol}
            data-aktif={aktif}
            aria-current={aktif ? 'page' : undefined}
            className="rail-link whitespace-nowrap"
          >
            {oge.ad}
          </Link>
        )
      })}
    </nav>
  )
}
