'use server'

import { redirect } from 'next/navigation'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { oturumOlustur, oturumKapat } from '@/lib/session'

export type GirisSonuc = { hata: string } | undefined

export async function girisYap(_onceki: GirisSonuc, form: FormData): Promise<GirisSonuc> {
  const kullaniciAdi = String(form.get('kullaniciAdi') ?? '').trim().toLowerCase()
  const sifre = String(form.get('sifre') ?? '')

  if (!kullaniciAdi || !sifre) {
    return { hata: 'Kullanıcı adı ve şifre gerekli.' }
  }

  const kullanici = await prisma.user.findUnique({ where: { kullaniciAdi } })

  // Kullanıcı yok ile şifre yanlış aynı mesajı döner — hangi kullanıcı adının
  // kayıtlı olduğunu sızdırmamak için.
  if (!kullanici || !(await compare(sifre, kullanici.sifreHash))) {
    return { hata: 'Kullanıcı adı veya şifre hatalı.' }
  }

  await oturumOlustur({
    kullaniciId: kullanici.id,
    kullaniciAdi: kullanici.kullaniciAdi,
    adSoyad: kullanici.adSoyad,
    unvan: kullanici.unvan,
  })

  redirect('/')
}

export async function cikisYap() {
  await oturumKapat()
  redirect('/giris')
}
