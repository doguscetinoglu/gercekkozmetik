import Link from 'next/link'
import { MARKA, BUGUN } from '@/lib/brand'
import { tarihAcik } from '@/lib/format'
import { cikisYap } from '@/lib/actions/auth'
import type { Oturum } from '@/lib/session'
import { Sidebar, TabBar } from './NavRail'
import { IkonCikis } from './icons'

/** Ad soyaddan iki harflik baş harf üretir (avatar için). */
function basHarfler(adSoyad: string) {
  return adSoyad
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('')
}

/**
 * Uygulama kabuğu — macOS pencere dilinde.
 *
 * Masaüstü: solda sabit kenar çubuğu (içerikten bir ton koyu, translucent),
 * sağda beyaz içerik alanı. Mobil: içerik tam genişlik, navigasyon altta iOS
 * sekme çubuğu olarak.
 */
export default function AppShell({
  oturum,
  children,
}: {
  oturum: Oturum
  children: React.ReactNode
}) {
  return (
    <div className="md:grid md:min-h-screen md:grid-cols-[15rem_1fr]">
      {/* ── Kenar çubuğu (yalnızca masaüstü) ── */}
      <aside className="hidden border-r border-separator bg-chrome md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        {/* Marka: squircle uygulama simgesi + ad */}
        <Link
          href="/"
          className="mx-2.5 mt-3.5 mb-2 flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition-colors duration-150 hover:bg-fill-hover"
        >
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-gradient-to-b from-accent to-accent-deep text-[0.8125rem] font-semibold tracking-tight text-white"
            aria-hidden="true"
          >
            {MARKA.kisaKod}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.875rem] font-semibold tracking-[-0.01em] text-label">
              {MARKA.firma}
            </span>
            <span className="block truncate text-[0.6875rem] text-label-2">
              {MARKA.modul}
            </span>
          </span>
        </Link>

        <Sidebar />

        {/* Kullanıcı bloğu — çubuğun dibinde */}
        <div className="mt-auto border-t border-separator p-2.5">
          <div className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2">
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-fill text-[0.75rem] font-semibold text-label-2"
              aria-hidden="true"
            >
              {basHarfler(oturum.adSoyad)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold tracking-[-0.005em] text-label">
                {oturum.adSoyad}
              </span>
              <span className="block truncate text-[0.6875rem] text-label-2">
                {oturum.unvan}
              </span>
            </span>
            <form action={cikisYap} className="flex-none">
              <button
                type="submit"
                aria-label="Çıkış yap"
                title="Çıkış yap"
                className="flex h-8 w-8 items-center justify-center rounded-[7px] text-label-3 transition-colors duration-150 hover:bg-fill-hover hover:text-label"
              >
                <IkonCikis boyut={17} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── İçerik ── */}
      <div className="min-w-0">
        {/* Üst çubuk: yarı saydam, kaydırmada içeriğin üstünde kalır */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-separator bg-white/80 px-4 py-2.5 backdrop-blur-xl md:px-8">
          <span className="truncate text-[0.8125rem] font-semibold tracking-[-0.005em] text-label md:hidden">
            {MARKA.firma}
          </span>
          <span className="hidden text-[0.8125rem] text-label-2 md:block">
            {MARKA.sistem}
          </span>
          <span className="flex-none text-[0.75rem] text-label-2 num">
            {tarihAcik(BUGUN)}
          </span>
        </header>

        {/* pb-24: mobilde sekme çubuğu içeriğin son satırını kapatmasın */}
        <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      <TabBar />
    </div>
  )
}
