'use client'

import { useState } from 'react'
import { raporIndir, type PdfRapor } from '@/lib/pdf/report'
import { IkonIndir } from './icons'

/**
 * Her sayfada aynı PDF butonu.
 *
 * Rapor içeriğini prop olarak alır — yani PDF'e giden veri, ekranda görünen
 * verinin ta kendisidir. İki tarafın ayrışması bu şekilde imkânsız hale gelir.
 */
export default function PdfButton({
  rapor,
  etiket = 'PDF İndir',
  birincil = false,
}: {
  rapor: PdfRapor
  etiket?: string
  birincil?: boolean
}) {
  const [uretiliyor, setUretiliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  async function indir() {
    setUretiliyor(true)
    setHata(null)
    try {
      await raporIndir(rapor)
    } catch (e) {
      // Sessiz başarısızlık kabul edilemez: kullanıcı butona bastı, bir şey duymalı.
      setHata('PDF oluşturulamadı.')
      console.error(e)
    } finally {
      setUretiliyor(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {hata && (
        <span className="tick t-crit" role="alert">
          {hata}
        </span>
      )}
      <button
        type="button"
        onClick={indir}
        disabled={uretiliyor}
        className={birincil ? 'btn btn-ink' : 'btn'}
        aria-busy={uretiliyor}
      >
        <IkonIndir boyut={16} />
        {uretiliyor ? 'Hazırlanıyor…' : etiket}
      </button>
    </div>
  )
}
