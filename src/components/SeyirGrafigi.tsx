'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { tl, tlKisa } from '@/lib/format'

type Nokta = { gun: string; bildirim: number; tahsilat: number }

/**
 * Son 30 günün bildirim ↔ tahsilat seyri.
 *
 * İki seri tek renk ekseninde ayrışır: bildirim = soluk mürekkep ÇUBUK,
 * tahsilat = koyu mürekkep ÇİZGİ. Serileri renkle değil MARK TİPİYLE ayırmak,
 * "renk yalnızca durum sinyalidir" kuralını bozmadan okunurluk sağlar.
 *
 * Gösterge (legend) yok — seriler doğrudan başlıkta etiketli.
 */
export default function SeyirGrafigi({ veri }: { veri: Nokta[] }) {
  const gunEtiketi = (g: string) => {
    const [, ay, gun] = g.split('-')
    return `${gun}.${ay}`
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-block h-2.5 w-2.5 bg-ink/25" aria-hidden="true" />
          Gönderilen bildirim (adet)
        </span>
        <span className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-block h-0.5 w-4 bg-ink" aria-hidden="true" />
          Gelen tahsilat (₺)
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={veri} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            {/* Yalnızca yatay yardım çizgileri, o da saç çizgi kalınlığında. */}
            <CartesianGrid stroke="rgb(21 23 27 / 0.09)" vertical={false} />
            <XAxis
              dataKey="gun"
              tickFormatter={gunEtiketi}
              tick={{ fontSize: 10, fill: '#686d75', fontFamily: 'var(--font-plex-mono)' }}
              axisLine={{ stroke: 'rgb(21 23 27 / 0.32)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              yAxisId="adet"
              tick={{ fontSize: 10, fill: '#686d75', fontFamily: 'var(--font-plex-mono)' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <YAxis
              yAxisId="tutar"
              orientation="right"
              tickFormatter={(v: number) => tlKisa(v)}
              tick={{ fontSize: 10, fill: '#686d75', fontFamily: 'var(--font-plex-mono)' }}
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <Tooltip
              contentStyle={{
                background: '#faf9f5',
                border: '1px solid rgb(21 23 27 / 0.32)',
                borderRadius: 0,
                boxShadow: 'none',
                fontSize: 12,
              }}
              // Recharts tipleri gevşek (ReactNode/ValueType) — sınırda daraltıyoruz.
              labelFormatter={(g) => gunEtiketi(String(g))}
              formatter={(deger, ad) => {
                const sayisal = Number(deger)
                return ad === 'tahsilat'
                  ? [tl(sayisal), 'Tahsilat']
                  : [`${sayisal} adet`, 'Bildirim']
              }}
            />
            <Bar yAxisId="adet" dataKey="bildirim" fill="rgb(21 23 27 / 0.25)" maxBarSize={14} />
            <Line
              yAxisId="tutar"
              type="monotone"
              dataKey="tahsilat"
              stroke="#15171b"
              strokeWidth={1.6}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
