import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { oturumOku } from '@/lib/session'

/**
 * Korumalı düzen. Bu route group altındaki her sayfa oturum ister.
 *
 * Kontrol proxy'de (eski middleware) değil burada yapılıyor: proxy yalnızca
 * çerezin VARLIĞINI görebilir, imzasını doğrulayamaz. Asıl doğrulama veriye en
 * yakın yerde olmalı.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const oturum = await oturumOku()
  if (!oturum) redirect('/giris')

  return <AppShell oturum={oturum}>{children}</AppShell>
}
