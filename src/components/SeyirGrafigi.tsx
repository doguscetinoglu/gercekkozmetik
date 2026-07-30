'use client'

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { tl, tlKisa } from '@/lib/format'

type Nokta = { gun: string; bildirim: number; tahsilat: number }

const gunEtiketi = (g: string) => {
  const [, ay, gun] = g.split('-')
  return `${gun}.${ay}`
}

const eksenStili = {
  fontSize: 11,
  fill: '#86868b',
  letterSpacing: '-0.01em',
} as const

/** Yuvarlak köşeli kart biçiminde tooltip — Apple'ın popover dili. */
function Tooltipİcerik({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const bul = (ad: string) => Number(payload.find((p) => p.dataKey === ad)?.value ?? 0)

  return (
    <div className="rounded-xl border border-separator bg-white/95 px-3 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur">
      <p className="num text-[0.75rem] font-semibold text-label">
        {gunEtiketi(String(label))}
      </p>
      <p className="num mt-1.5 flex items-center gap-2 text-[0.8125rem]">
        <span className="gosterge-nokta bg-accent" aria-hidden="true" />
        <span className="text-label-2">Tahsilat</span>
        <span className="ml-auto font-semibold text-label">{tl(bul('tahsilat'))}</span>
      </p>
      <p className="num mt-1 flex items-center gap-2 text-[0.8125rem]">
        <span className="gosterge-nokta bg-label-3" aria-hidden="true" />
        <span className="text-label-2">Bildirim</span>
        <span className="ml-auto font-semibold text-label">{bul('bildirim')} adet</span>
      </p>
    </div>
  )
}

/**
 * Son 30 günün bildirim ↔ tahsilat seyri.
 *
 * Tahsilat: vurgu renginde çizgi + altında yumuşayan gradient alan (Apple'ın
 * Borsa/Sağlık grafiklerinin dili). Bildirim: sessiz gri, yuvarlak tepeli
 * çubuklar. İki seri hem renk hem mark tipiyle ayrışır.
 *
 * Izgara çizgisi yok, gösterge (legend) grafiğin üstünde doğrudan etiketli.
 */
export default function SeyirGrafigi({ veri }: { veri: Nokta[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-2 text-[0.8125rem] text-label-2">
          <span className="h-0.5 w-4 rounded-full bg-accent" aria-hidden="true" />
          Gelen tahsilat (₺)
        </span>
        <span className="flex items-center gap-2 text-[0.8125rem] text-label-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-label-3/45" aria-hidden="true" />
          Gönderilen bildirim (adet)
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={veri} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tahsilatDolgu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0071e3" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Yalnızca yatay yardım çizgileri, neredeyse görünmez. */}
            <CartesianGrid stroke="rgb(0 0 0 / 0.055)" vertical={false} />

            <XAxis
              dataKey="gun"
              tickFormatter={gunEtiketi}
              tick={eksenStili}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={22}
              dy={6}
            />
            <YAxis
              yAxisId="adet"
              tick={eksenStili}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <YAxis
              yAxisId="tutar"
              orientation="right"
              tickFormatter={(v: number) => tlKisa(v)}
              tick={eksenStili}
              axisLine={false}
              tickLine={false}
              width={58}
            />

            <Tooltip
              content={<Tooltipİcerik />}
              cursor={{ fill: 'rgb(0 0 0 / 0.035)' }}
            />

            <Bar
              yAxisId="adet"
              dataKey="bildirim"
              fill="rgb(134 134 139 / 0.42)"
              maxBarSize={13}
              radius={[3, 3, 0, 0]}
            />
            <Area
              yAxisId="tutar"
              type="monotone"
              dataKey="tahsilat"
              stroke="#0071e3"
              strokeWidth={2}
              fill="url(#tahsilatDolgu)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#0071e3' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
