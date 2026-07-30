import { Children } from 'react'

/**
 * İstatistik kartı — sayfanın kahramanı rakamdır.
 *
 * Saç çizgiyle bölünmüş bir ızgara hücresi değil, kendi gölgesi olan bir kart.
 * Etiket üstte sakin gri, rakam altında büyük ve sıkı, açıklama en altta.
 * `sinif` verilirse rakam sinyal rengine boyanır ve etiketin yanına küçük bir
 * renk noktası düşer.
 */
export default function Kpi({
  etiket,
  deger,
  alt,
  sinif,
  buyuk = false,
}: {
  etiket: string
  deger: string
  alt?: string
  /** Sinyal rengi — yalnızca durum bildiren rakamlarda. */
  sinif?: 'ok' | 'warn' | 'alert' | 'crit'
  buyuk?: boolean
}) {
  return (
    <div className="kart kart-dolgu flex min-w-0 flex-col">
      <span className="lbl flex items-center gap-1.5">
        {sinif && (
          <span
            className="gosterge-nokta"
            style={{ background: `var(--color-${sinif})` }}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{etiket}</span>
      </span>

      <span
        className={`kpi-num ${buyuk ? 'kpi-num-lg' : ''} mt-2.5`}
        style={sinif ? { color: `var(--color-${sinif})` } : undefined}
      >
        {deger}
      </span>

      {alt && <span className="kpi-sub mt-auto pt-2 truncate">{alt}</span>}
    </div>
  )
}

/**
 * Kart ızgarası. Kartların kendi gölgesi olduğu için aralarına çizgi konmaz —
 * ayrım boşlukla yapılır.
 */
export function KpiKusak({ children }: { children: React.ReactNode }) {
  const ogeler = Children.toArray(children)

  // 4 ve 5 kartlı sayfalarda 3'lü ızgara son satırda tek kart bırakıp dengeyi
  // bozuyor; kart sayısına göre sütun sayısı seçilir.
  const sutunSinifi =
    ogeler.length === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : ogeler.length % 3 === 0
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'

  return <div className={`grid grid-cols-1 gap-3 ${sutunSinifi}`}>{ogeler}</div>
}
