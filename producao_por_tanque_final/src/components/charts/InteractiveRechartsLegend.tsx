import type { LegendProps } from 'recharts'
import { cn } from '@/lib/utils'

interface InteractiveRechartsLegendProps {
  payload?: LegendProps['payload']
  activeKey: string | null
  onItemClick: (key: string) => void
  getItemKey?: (
    item: NonNullable<LegendProps['payload']>[number],
  ) => string
}

export function InteractiveRechartsLegend({
  payload,
  activeKey,
  onItemClick,
  getItemKey,
}: InteractiveRechartsLegendProps) {
  if (!payload?.length) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      {payload.map((item) => {
        const key = getItemKey
          ? getItemKey(item)
          : String(item.dataKey || item.value)
        return (
          <button
            key={key}
            type="button"
            aria-pressed={activeKey === key}
            aria-label={`Exibir somente ${item.value}`}
            onClick={() => onItemClick(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeKey !== null && activeKey !== key && 'opacity-40',
            )}
          >
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.value}
          </button>
        )
      })}
    </div>
  )
}
