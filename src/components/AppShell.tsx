import Link from 'next/link'
import { MARKA, BUGUN } from '@/lib/brand'
import { tarihAcik } from '@/lib/format'
import { cikisYap } from '@/lib/actions/auth'
import type { Oturum } from '@/lib/session'
import NavRail from './NavRail'

/**
 * Uygulama kabuğu.
 *
 * Dolgulu bir sidebar paneli YOK: saç çizgiyle ayrılmış ince bir ray var.
 * Üstte antet — firma adı, sistem adı, tarih ve kullanıcı. Gölge, yuvarlak köşe
 * ve renkli vurgu kullanılmaz; hiyerarşi tipografi ve çizgiyle kurulur.
 */
export default function AppShell({
  oturum,
  children,
}: {
  oturum: Oturum
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[13.5rem_1fr]">
      {/* Navigasyon rayı — mobilde üstte yatay şeride döner */}
      <div className="border-b border-rule md:border-b-0 md:border-r md:border-rule">
        <div className="px-4 py-3 md:px-0 md:py-5">
          <Link
            href="/"
            className="block md:px-4"
            aria-label={`${MARKA.firma} ana sayfa`}
          >
            <span className="lbl block">{MARKA.firma}</span>
            <span className="mt-0.5 block text-[0.9375rem] font-semibold leading-tight">
              Nakit &amp; Tahsilat
            </span>
          </Link>
        </div>

        <NavRail />

        {/* Kullanıcı bloğu — rayın dibinde, masaüstünde görünür */}
        <div className="hidden border-t border-rule px-4 py-4 md:block">
          <span className="lbl block">Oturum</span>
          <span className="mt-1 block text-[0.8125rem] font-semibold">{oturum.adSoyad}</span>
          <span className="block text-xs text-ink-mute">{oturum.unvan}</span>
          <form action={cikisYap} className="mt-3">
            <button type="submit" className="text-xs font-semibold text-ink-soft underline underline-offset-4 hover:text-ink">
              Çıkış yap
            </button>
          </form>
        </div>
      </div>

      {/* İçerik alanı */}
      <div className="min-w-0">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule-strong px-4 py-3 md:px-7">
          <span className="lbl">{MARKA.sistem}</span>
          <span className="num text-xs text-ink-mute">{tarihAcik(BUGUN)}</span>
        </header>

        <main className="px-4 py-6 md:px-7 md:py-8">{children}</main>
      </div>
    </div>
  )
}
