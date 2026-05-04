import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'

interface PricePoint {
  time: string
  price: number
}

type TimeRange = '24h' | '7d' | '30d'

const RANGE_CONFIG: Record<TimeRange, { interval: string; limit: number; format: Intl.DateTimeFormatOptions }> = {
  '24h': { interval: '15m', limit: 96, format: { hour: '2-digit', minute: '2-digit', hour12: false } },
  '7d':  { interval: '1h',  limit: 168, format: { month: 'short', day: 'numeric', hour: '2-digit', hour12: false } },
  '30d': { interval: '4h',  limit: 180, format: { month: 'short', day: 'numeric' } },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const price = payload[0].value

  return (
    <div className="bg-[#0a0a0a] border border-neutral-800 px-2 py-1.5">
      <p className="text-[10px] text-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-amber-400">
        ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  )
}

export function BtcPriceChart() {
  const [data, setData] = useState<PricePoint[]>([])
  const [range, setRange] = useState<TimeRange>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    const cfg = RANGE_CONFIG[range]
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${cfg.interval}&limit=${cfg.limit}`

    fetch(url)
      .then(res => res.json())
      .then((klines: any[]) => {
        if (cancelled) return
        const points: PricePoint[] = klines.map((k: any) => ({
          time: new Date(k[0]).toLocaleString('en-US', cfg.format),
          price: parseFloat(k[4]), // close price
        }))
        setData(points)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [range])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600">
        <div className="text-[10px] uppercase tracking-widest animate-pulse">Loading BTC data...</div>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600">
        <p className="text-xs">Failed to load BTC price data</p>
      </div>
    )
  }

  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price
  const isUp = lastPrice >= firstPrice
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100

  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const pricePadding = (maxPrice - minPrice) * 0.1

  const gradientId = `btcGradient-${isUp ? 'up' : 'down'}`
  const color = isUp ? '#f59e0b' : '#ef4444'

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Range selector + stats */}
      <div className="flex items-center justify-between px-1 pb-1 shrink-0">
        <div className="flex items-center gap-1">
          {(['24h', '7d', '30d'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors ${
                range === r
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-neutral-600 border border-transparent hover:text-neutral-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-neutral-400">
            ${lastPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className={`text-[10px] tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />

            <XAxis
              dataKey="time"
              stroke="#525252"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={5}
              fontFamily="JetBrains Mono"
              interval="preserveStartEnd"
              minTickGap={40}
            />

            <YAxis
              stroke="#525252"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={[minPrice - pricePadding, maxPrice + pricePadding]}
              dx={-5}
              fontFamily="JetBrains Mono"
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
