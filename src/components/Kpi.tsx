/**
 * KPI bloğu — rakam ana görsel öğedir.
 *
 * Kart değil: dikey saç çizgiyle ayrılmış bir alan. Etiket küçük ve harf
 * aralıklı, rakam büyük ve mono. `buyuk` bayrağı sayfanın birincil rakamını
 * diğerlerinden ayırır.
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
  /** Sinyal rengi — yalnızca durum bildiren rakamlarda kullanılır. */
  sinif?: 'ok' | 'warn' | 'alert' | 'crit'
  buyuk?: boolean
}) {
  return (
    <div className="min-w-0 bg-paper px-4 py-4">
      <span className="lbl block">{etiket}</span>
      <span
        className={`kpi-num ${buyuk ? 'kpi-num-lg' : ''} mt-2.5 block`}
        style={sinif ? { color: `var(--color-${sinif})` } : undefined}
      >
        {deger}
      </span>
      {alt && <span className="kpi-sub mt-2 block truncate">{alt}</span>}
    </div>
  )
}

/**
 * KPI'ları dikey saç çizgilerle ayıran kuşak.
 *
 * En fazla 3 sütun: rakamlar tasarımın ana görsel öğesi olduğu için her birine
 * geniş yer gerekiyor. 6 sütunda büyük mono rakamlar kırpılıyordu — 6 KPI iki
 * satıra yayılır, sıkışmaz.
 */
export function KpiKusak({ children }: { children: React.ReactNode }) {
  // 1px gap + zemin rengi = her iki yönde otomatik saç çizgi. `divide-x`
  // sarmalanan ızgarada ikinci satırın ilk hücresine yanlış kenar çiziyordu.
  return (
    <div className="grid grid-cols-1 gap-px border-y border-rule-strong bg-rule sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}
