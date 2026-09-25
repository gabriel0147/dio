import { AlertTriangle, CheckCircle2, CircleDashed, Clock3 } from 'lucide-react'
import { CurrentSealState, CurrentSealStatus } from '@/lib/seal-management'
import { cn } from '@/lib/utils'

const statusConfig: Record<
  CurrentSealStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  installed: {
    label: 'Conforme',
    color: 'bg-emerald-600',
    icon: CheckCircle2,
  },
  awaiting_seal: {
    label: 'Pendente de lacração',
    color: 'bg-amber-500',
    icon: Clock3,
  },
  position_mismatch: {
    label: 'Posição divergente',
    color: 'bg-red-600',
    icon: AlertTriangle,
  },
  no_record: {
    label: 'Sem registro',
    color: 'bg-slate-400',
    icon: CircleDashed,
  },
}

const statusOrder: CurrentSealStatus[] = [
  'installed',
  'awaiting_seal',
  'position_mismatch',
  'no_record',
]

interface SealStatusVisualizationProps {
  rows: CurrentSealState[]
}

export function SealStatusVisualization({
  rows,
}: SealStatusVisualizationProps) {
  const counts = statusOrder.map((status) => ({
    status,
    count: rows.filter((row) => row.currentStatus === status).length,
  }))
  const total = rows.length
  const conforming =
    counts.find(({ status }) => status === 'installed')?.count ?? 0
  const pending =
    counts
      .filter(
        ({ status }) => status === 'awaiting_seal' || status === 'no_record',
      )
      .reduce((sum, item) => sum + item.count, 0) ?? 0
  const nonConforming =
    counts.find(({ status }) => status === 'position_mismatch')?.count ?? 0

  const summary = [
    {
      label: 'Pontos monitorados',
      value: total,
      icon: CircleDashed,
      tone: 'text-slate-700',
      iconBg: 'bg-slate-100',
    },
    {
      label: 'Conformes',
      value: conforming,
      icon: CheckCircle2,
      tone: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Pendentes',
      value: pending,
      icon: Clock3,
      tone: 'text-amber-700',
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Não conformes',
      value: nonConforming,
      icon: AlertTriangle,
      tone: 'text-red-700',
      iconBg: 'bg-red-50',
    },
  ]

  return (
    <section
      aria-label="Resumo das situações dos lacres"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="flex min-h-28 items-center gap-4 px-5 py-4"
            >
              <div
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-full',
                  item.iconBg,
                  item.tone,
                )}
              >
                <Icon className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-600">
                  {item.label}
                </p>
                <p className={cn('mt-1 text-3xl font-semibold', item.tone)}>
                  {item.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Distribuição das situações
        </h3>
        <div
          className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={`Distribuição de ${total} pontos por situação`}
        >
          {counts.map(({ status, count }) => (
            <div
              key={status}
              className={cn(
                'min-w-0 transition-[width] duration-300',
                statusConfig[status].color,
              )}
              style={{ width: total === 0 ? 0 : `${(count / total) * 100}%` }}
              title={`${statusConfig[status].label}: ${count}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {counts.map(({ status, count }) => {
            const config = statusConfig[status]
            return (
              <div
                key={status}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <span className={cn('size-2.5 rounded-full', config.color)} />
                <span>
                  {config.label}{' '}
                  <strong className="font-semibold text-slate-900">
                    {total === 0
                      ? '0%'
                      : `${Math.round((count / total) * 100)}%`}
                  </strong>{' '}
                  ({count})
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { statusConfig }
