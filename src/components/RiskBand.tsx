import { tl, tlKisa, sayi, yuzde } from '@/lib/format'
import type { YaslandirmaSatiri } from '@/lib/metrics'

/**
 * Yaşlandırma şeridi.
 *
 * Tek sürekli, yuvarlak uçlu oran çubuğu — "paramın ne kadarı ne kadar geride"
 * tek bakışta okunur. Rakamlar çubuğun İÇİNE değil ALTINA, gösterge olarak
 * yazılır: dar ekranda beş bölmeye metin sıkıştırmak okunmaz hale getiriyordu.
 *
 * Erişilebilirlik: çubuk görsel bir özet; altındaki gösterge listesi ve
 * (isteğe bağlı) tablo aynı veriyi metin olarak tekrarlar.
 */
export default function RiskBand({
  kovalar,
  tabloGoster = true,
  dar = false,
}: {
  kovalar: YaslandirmaSatiri[]
  tabloGoster?: boolean
  /** Dar sütunda (yan panel) tek kolona düşer — etiketler kırpılmasın diye. */
  dar?: boolean
}) {
  const toplam = kovalar.reduce((t, k) => t + k.tutar, 0)
  const dolu = kovalar.filter((k) => k.tutar > 0)

  if (toplam === 0) {
    return <p className="ikincil">Açık bakiye bulunmuyor.</p>
  }

  return (
    <div>
      <div
        className="serit"
        role="img"
        aria-label={`Yaşlandırma dağılımı, toplam ${tl(toplam)}`}
      >
        {dolu.map((kova) => (
          <div
            key={kova.anahtar}
            className={`serit-dilim s-${kova.sinif}`}
            style={{ flexGrow: kova.tutar, flexBasis: 0 }}
            title={`${kova.etiket}: ${tl(kova.tutar)} (${kova.adet} fatura)`}
          />
        ))}
      </div>

      {/* Gösterge — renk noktası + etiket + tutar + pay */}
      <ul
        className={`mt-4 grid gap-x-6 gap-y-2.5 ${
          dar ? '' : 'sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {dolu.map((kova) => (
          <li key={kova.anahtar} className="flex items-baseline gap-2">
            <span
              className="gosterge-nokta mt-1.5"
              style={{ background: `var(--color-${kova.sinif})` }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-label">
                {kova.etiket}
              </span>
              <span className="kpi-sub block">
                {tlKisa(kova.tutar)} · {sayi(kova.adet)} fatura
              </span>
            </span>
            <span className="num flex-none text-[0.8125rem] font-semibold text-label-2">
              {yuzde((kova.tutar / toplam) * 100)}
            </span>
          </li>
        ))}
      </ul>

      {tabloGoster && (
        <div className="tbl-kaydir mt-5">
          <table className="tbl">
            <caption className="sr-only">Yaşlandırma dağılımı tablo karşılığı</caption>
            <thead>
              <tr>
                <th scope="col">Gecikme aralığı</th>
                <th scope="col" className="sag">Fatura</th>
                <th scope="col" className="sag">Bakiye</th>
                <th scope="col" className="sag">Pay</th>
              </tr>
            </thead>
            <tbody>
              {kovalar.map((kova) => (
                <tr key={kova.anahtar}>
                  <td>
                    <span className={`tick t-${kova.sinif}`}>{kova.etiket}</span>
                  </td>
                  <td className="sag num">{sayi(kova.adet)}</td>
                  <td className="sag num">{tl(kova.tutar)}</td>
                  <td className="sag num text-label-2">
                    {yuzde((kova.tutar / toplam) * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
