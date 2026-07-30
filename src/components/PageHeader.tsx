/**
 * Sayfa başlığı — Apple'ın "Large Title" kalıbı.
 *
 * Üstte küçük gri bağlam etiketi, altında büyük ve sıkı başlık, sağda eylemler.
 * Her sayfa aynı bileşeni kullanır; başlık hizası ve boşluklar tek yerden gelir.
 */
export default function PageHeader({
  ustEtiket,
  baslik,
  aciklama,
  eylemler,
}: {
  ustEtiket?: string
  baslik: string
  aciklama?: string
  eylemler?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {ustEtiket && <span className="lbl block">{ustEtiket}</span>}
        <h1 className="baslik-buyuk mt-1">{baslik}</h1>
        {aciklama && <p className="ikincil mt-1.5 max-w-2xl">{aciklama}</p>}
      </div>
      {eylemler && <div className="flex flex-none items-center gap-2">{eylemler}</div>}
    </div>
  )
}

/** Bölüm başlığı — kartların ve tabloların üstünde. */
export function SectionHeader({
  baslik,
  yan,
}: {
  baslik: string
  yan?: React.ReactNode
}) {
  return (
    <div className="panel-head">
      <h2 className="baslik-bolum">{baslik}</h2>
      {yan && <div className="flex flex-none items-baseline gap-3">{yan}</div>}
    </div>
  )
}
