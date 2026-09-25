import { useEffect, useState } from 'react'
import { CalendarClock, Loader2, UserRound } from 'lucide-react'
import { CurrentSealState, SealEventHistory } from '@/lib/seal-management'
import { sealManagementService } from '@/services/sealManagementService'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { sealEventTypeLabels } from './SealEventDialog'

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—'

interface SealHistorySheetProps {
  point: CurrentSealState | null
  onOpenChange: (open: boolean) => void
}

export function SealHistorySheet({
  point,
  onOpenChange,
}: SealHistorySheetProps) {
  const [history, setHistory] = useState<SealEventHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!point) return

    let active = true
    setIsLoading(true)
    sealManagementService
      .getPointHistory(point.id)
      .then((data) => {
        if (active) setHistory(data)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [point])

  return (
    <Sheet open={point !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {point ? (
          <>
            <SheetHeader className="pr-8">
              <SheetTitle>Histórico do ponto</SheetTitle>
              <SheetDescription>
                {point.tankTag} · {point.componentName}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Posição requerida
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {point.requiredPosition}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Lacres atuais
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {point.currentSealNumbers.join(' · ') || 'Nenhum'}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Eventos registrados
                </h3>
                {isLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Carregando histórico...
                  </div>
                ) : history.length === 0 ? (
                  <p className="py-8 text-sm text-slate-500">
                    Nenhum evento registrado para este ponto.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-0">
                    {history.map((event, index) => (
                      <li
                        key={event.id}
                        className="relative grid grid-cols-[16px_1fr] gap-3 pb-6"
                      >
                        {index < history.length - 1 ? (
                          <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />
                        ) : null}
                        <span className="relative mt-1 size-4 rounded-full border-4 border-emerald-100 bg-emerald-600" />
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {sealEventTypeLabels[event.eventType] ??
                                event.eventType}
                            </p>
                            <span className="text-xs text-slate-500">
                              #{event.sequence}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                            <p className="flex items-center gap-2">
                              <CalendarClock className="size-3.5" />
                              {formatDateTime(
                                event.installedAt ?? event.removedAt,
                              )}
                            </p>
                            {event.installedSeals.length > 0 ? (
                              <p>
                                Instalados:{' '}
                                <strong className="text-slate-900">
                                  {event.installedSeals.join(', ')}
                                </strong>
                              </p>
                            ) : null}
                            {event.removedSeals.length > 0 ? (
                              <p>
                                Retirados:{' '}
                                <strong className="text-slate-900">
                                  {event.removedSeals.join(', ')}
                                </strong>
                              </p>
                            ) : null}
                            {event.installedByName || event.removedByName ? (
                              <p className="flex items-center gap-2">
                                <UserRound className="size-3.5" />
                                {event.installedByName ?? event.removedByName}
                              </p>
                            ) : null}
                            {event.observations ? (
                              <p className="pt-1 leading-relaxed text-slate-500">
                                {event.observations}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
