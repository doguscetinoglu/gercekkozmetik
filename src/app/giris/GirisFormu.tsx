'use client'

import { useActionState } from 'react'
import { girisYap, type GirisSonuc } from '@/lib/actions/auth'

export default function GirisFormu() {
  const [sonuc, gonder, bekliyor] = useActionState<GirisSonuc, FormData>(girisYap, undefined)

  return (
    <form action={gonder} className="mt-7 space-y-4">
      <div>
        {/* Her form alanı label ile eşlenir — placeholder etiket yerine geçmez. */}
        <label htmlFor="kullaniciAdi" className="lbl mb-1.5 block">
          Kullanıcı Adı
        </label>
        <input
          id="kullaniciAdi"
          name="kullaniciAdi"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="input"
        />
      </div>

      <div>
        <label htmlFor="sifre" className="lbl mb-1.5 block">
          Şifre
        </label>
        <input
          id="sifre"
          name="sifre"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      {/* Hata mesajı alanın hemen yanında ve aria-live ile duyurulur. */}
      {sonuc?.hata && (
        <p className="tick t-crit" role="alert">
          {sonuc.hata}
        </p>
      )}

      <button type="submit" className="btn btn-ink w-full" disabled={bekliyor}>
        {bekliyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </button>
    </form>
  )
}
