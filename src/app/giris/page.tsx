import { redirect } from 'next/navigation'
import { MARKA } from '@/lib/brand'
import { oturumOku } from '@/lib/session'
import GirisFormu from './GirisFormu'

export const metadata = { title: `Giriş — ${MARKA.tamAd}` }

export default async function GirisSayfasi() {
  // Oturumu açık olan kullanıcıyı giriş ekranında tutmak anlamsız.
  if (await oturumOku()) redirect('/')

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="border-b border-rule-strong pb-5">
        <span className="lbl block">{MARKA.firma}</span>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nakit &amp; Tahsilat
          <br />
          Kontrol Sistemi
        </h1>
      </div>

      <GirisFormu />

      {/* Demo erişimi ekranda yazılı — müşteri linke tıklayıp hemen girebilsin. */}
      <div className="mt-8 border-t border-rule pt-5">
        <span className="lbl block">Demo Erişimi</span>
        <p className="mt-2 text-sm text-ink-soft">
          Kullanıcı adı <strong className="num font-semibold">demo</strong> · Şifre{' '}
          <strong className="num font-semibold">kozmetik2026</strong>
        </p>
        <p className="mt-3 text-xs text-ink-mute">
          Bu ekran örnek veriyle çalışan bir tanıtım sistemidir. Gösterilen cari
          hesaplar ve tutarlar gerçek değildir.
        </p>
      </div>
    </div>
  )
}
