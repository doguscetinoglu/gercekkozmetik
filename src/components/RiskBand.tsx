import { tl, tlKisa, sayi } from '@/lib/format'
import type { YaslandirmaSatiri } from '@/lib/metrics'

/**
 * İMZA ÖĞESİ — Risk Şeridi.
 *
 * Yaşlandırma dağılımını ayrı ayrı bar'lar yerine sayfa genişliğinde TEK sürekli
 * şerit olarak gösterir. Her bölmenin genişliği tutarının payına eşit, yani
 * "paramın ne kadarı ne kadar geride" tek bakışta okunur.
 *
 * Erişilebilirlik: şeridin kendisi görsel bir özet; altındaki tablo aynı veriyi
 * ekran okuyucu ve klavye kullanıcıları için birebir tekrarlar.
 */
export default function RiskBand({ kovalar }: { kovalar: YaslandirmaSatiri[] }) {
  const toplam = kovalar.reduce((t, k) => t + k.tutar, 0)
  const dolu = kovalar.filter((k) => k.tutar > 0)

  if (toplam === 0) {
    return <p className="text-ink-mute text-sm">Açık bakiye bulunmuyor.</p>
  }

  return (
    <div>
      <div className="riskband" role="img" aria-label={`Yaşlandırma dağılımı, toplam ${tl(toplam)}`}>
        {dolu.map((kova) => {
          // Çok küçük dilimler okunamaz hale gelmesin diye alt sınır konur.
          const pay = Math.max((kova.tutar / toplam) * 100, 10)
          return (
            <div
              key={kova.anahtar}
              className={`riskband-seg rb-${kova.sinif}`}
              style={{ flexBasis: `${pay}%` }}
              title={`${kova.etiket}: ${tl(kova.tutar)} (${kova.adet} fatura)`}
            >
              {/* Kısa biçim ("₺2,7 M") — tam tutar dar bölmede kesiliyordu.
                  Tam değer hem başlık ipucunda hem alttaki tabloda duruyor. */}
              <span className="rb-tutar">{tlKisa(kova.tutar)}</span>
              <span className="rb-etiket">{kova.etiket}</span>
            </div>
          )
        })}
      </div>

      <div className="tbl-kaydir mt-3">
        <table className="tbl">
          <caption className="sr-only">Yaşlandırma dağılımı tablo karşılığı</caption>
          <thead>
            <tr>
              <th scope="col">Gecikme Aralığı</th>
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
                <td className="sag num">
                  {toplam === 0 ? '—' : `%${Math.round((kova.tutar / toplam) * 100)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
