import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'gk_session'
const SURE_SANIYE = 60 * 60 * 8 // 8 saat — bir iş günü

const anahtar = () => new TextEncoder().encode(process.env.SESSION_SECRET!)

export type Oturum = {
  kullaniciId: string
  kullaniciAdi: string
  adSoyad: string
  unvan: string
}

export async function oturumOlustur(veri: Oturum) {
  const token = await new SignJWT({ ...veri })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SURE_SANIYE}s`)
    .sign(anahtar())

  // Next 16: cookies() artık asenkron.
  const cerezler = await cookies()
  cerezler.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SURE_SANIYE,
  })
}

export async function oturumOku(): Promise<Oturum | null> {
  const cerezler = await cookies()
  const token = cerezler.get(COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, anahtar())
    return payload as unknown as Oturum
  } catch {
    // Süresi geçmiş veya bozuk imza — giriş yapılmamış sayılır.
    return null
  }
}

export async function oturumKapat() {
  const cerezler = await cookies()
  cerezler.delete(COOKIE)
}
