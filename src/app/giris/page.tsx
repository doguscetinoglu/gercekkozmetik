import { redirect } from 'next/navigation'
import { MARKA } from '@/lib/brand'
import { oturumOku } from '@/lib/session'
import GirisFormu from './GirisFormu'

export const metadata = { title: `Giriş — ${MARKA.tamAd}` }

export default async function GirisSayfasi() {
  // Oturumu açık olan kullanıcıyı giriş ekranında tutmak anlamsız.
  if (await oturumOku()) redirect('/')

  return (
    // Gri zemin üzerinde yüzen beyaz kart — macOS/iOS giriş ekranı kalıbı.
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-2 px-5 py-12">
      <div className="w-full max-w-[25rem]">
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-[15px] bg-gradient-to-b from-accent to-accent-deep text-lg font-semibold tracking-tight text-white shadow-[0_4px_14px_rgba(0,113,227,0.32)]"
            aria-hidden="true"
          >
            {MARKA.kisaKod}
          </span>
          <h1 className="baslik-buyuk mt-5">{MARKA.firma}</h1>
          <p className="ikincil mt-1.5">{MARKA.sistem}</p>
        </div>

        <div className="kart mt-7 p-6">
          <GirisFormu />
        </div>

        {/* Demo erişimi ekranda yazılı — müşteri linke tıklayıp hemen girebilsin. */}
        <div className="grup mt-4">
          <span className="text-[0.8125rem] font-semibold text-label">Demo erişimi</span>
          <p className="ikincil mt-1.5">
            Kullanıcı adı <strong className="font-semibold text-label">demo</strong> · Şifre{' '}
            <strong className="font-semibold text-label">kozmetik2026</strong>
          </p>
        </div>

        <p className="mt-5 text-center text-[0.75rem] leading-relaxed text-label-2">
          Bu ekran örnek veriyle çalışan bir tanıtım sistemidir. Gösterilen cari
          hesaplar ve tutarlar gerçek değildir.
        </p>
      </div>
    </div>
  )
}
