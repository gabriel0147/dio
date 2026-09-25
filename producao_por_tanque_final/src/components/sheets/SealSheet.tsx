import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Eye,
  Loader2,
  LockKeyhole,
  Plus,
  RotateCw,
  Search,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import {
  CurrentSealState,
  CurrentSealStatus,
  RegisterSealEventInput,
} from '@/lib/seal-management'
import { sealManagementService } from '@/services/sealManagementService'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SealEventDialog } from '@/components/seals/SealEventDialog'
import { SealHistorySheet } from '@/components/seals/SealHistorySheet'
import {
  SealStatusVisualization,
  statusConfig,
} from '@/components/seals/SealStatusVisualization'

interface SealSheetProps {
  sheetId?: string
}

const statusOptions: { value: CurrentSealStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas as situações' },
  { value: 'installed', label: 'Conforme' },
  { value: 'awaiting_seal', label: 'Pendente de lacração' },
  { value: 'position_mismatch', label: 'Posição divergente' },
  { value: 'no_record', label: 'Sem registro' },
]

const eventLabels: Record<string, string> = {
  initial_installation: 'Instalação inicial',
  authorized_break: 'Rompimento autorizado',
  removal: 'Retirada',
  replacement: 'Substituição',
  reinstallation: 'Reinstalação',
  damaged: 'Lacre danificado',
  lost: 'Lacre extraviado',
  inspection: 'Inspeção',
  cancellation: 'Cancelamento',
  other: 'Outro',
}

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—'

function StatusBadge({ status }: { status: CurrentSealStatus }) {
  const config = statusConfig[status]
  const toneClasses: Record<CurrentSealStatus, string> = {
    installed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    awaiting_seal: 'border-amber-200 bg-amber-50 text-amber-800',
    position_mismatch: 'border-red-200 bg-red-50 text-red-800',
    no_record: 'border-slate-200 bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium',
        toneClasses[status],
      )}
    >
      <span className={cn('size-2 rounded-full', config.color)} />
      {config.label}
    </span>
  )
}

export function SealSheet({ sheetId }: SealSheetProps) {
  const { currentProject, currentProjectRole } = useProject()
  const currentTankId = sheetId?.replace('seal-', '') ?? 'all'
  const [rows, setRows] = useState<CurrentSealState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [tankFilter, setTankFilter] = useState(currentTankId)
  const [statusFilter, setStatusFilter] = useState<CurrentSealStatus | 'all'>(
    'all',
  )
  const [eventPoint, setEventPoint] = useState<CurrentSealState | null>(null)
  const [historyPoint, setHistoryPoint] = useState<CurrentSealState | null>(
    null,
  )

  const canEdit = currentProjectRole !== 'viewer'

  const loadState = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const data = await sealManagementService.getCurrentState(
        currentProject.id,
      )
      setRows(data)
    } catch (error) {
      console.error('Error loading seal state:', error)
      toast.error('Não foi possível carregar a situação dos lacres.')
    } finally {
      setIsLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const tankRows = useMemo(
    () =>
      tankFilter === 'all'
        ? rows
        : rows.filter((row) => row.tankId === tankFilter),
    [rows, tankFilter],
  )

  const visibleRows = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('pt-BR')
    return tankRows.filter((row) => {
      const matchesStatus =
        statusFilter === 'all' || row.currentStatus === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          row.tankTag,
          row.componentName,
          row.componentCode,
          row.currentSealNumbers.join(' '),
        ].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
        )
      return matchesStatus && matchesSearch
    })
  }, [deferredSearch, statusFilter, tankRows])

  const selectedTank = currentProject?.tanks.find(
    (tank) => tank.id === tankFilter,
  )
  const selectedTankHasPoints =
    tankFilter === 'all' || tankRows.some((row) => row.tankId === tankFilter)

  const initializePoints = async () => {
    if (tankFilter === 'all') return
    setIsInitializing(true)
    try {
      const inserted =
        await sealManagementService.initializePointsFromSpreadsheet(tankFilter)
      toast.success(
        inserted > 0
          ? `${inserted} pontos configurados a partir do formulário antigo.`
          : 'Os pontos deste tanque já estavam configurados.',
      )
      await loadState()
    } catch (error) {
      console.error('Error initializing seal points:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível configurar os pontos.',
      )
    } finally {
      setIsInitializing(false)
    }
  }

  const registerEvent = async (input: RegisterSealEventInput) => {
    try {
      const result = await sealManagementService.registerEvent(input)
      toast.success(
        result.status === 'approved'
          ? 'Evento registrado e situação atualizada.'
          : 'Evento enviado para aprovação.',
      )
      await loadState()
    } catch (error) {
      console.error('Error registering seal event:', error)
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Não foi possível registrar o evento.'
      toast.error(message)
      throw error
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Controle de Lacres
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Situação atual por ponto de lacração
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadState()}
            disabled={isLoading}
          >
            <RotateCw
              className={cn('mr-2 size-4', isLoading && 'animate-spin')}
            />
            Atualizar
          </Button>
          <Button
            className="bg-teal-700 hover:bg-teal-800"
            disabled={!canEdit || visibleRows.length === 0}
            onClick={() => setEventPoint(visibleRows[0] ?? null)}
          >
            <Plus className="mr-2 size-4" />
            Registrar evento
          </Button>
        </div>
      </header>

      <SealStatusVisualization rows={tankRows} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tanque, componente ou lacre"
              className="pl-9"
            />
          </div>
          <Select value={tankFilter} onValueChange={setTankFilter}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Todos os tanques" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tanques</SelectItem>
              {currentProject?.tanks.map((tank) => (
                <SelectItem key={tank.id} value={tank.id}>
                  {tank.tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as CurrentSealStatus | 'all')
            }
          >
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin text-teal-700" />
            Carregando situação dos lacres...
          </div>
        ) : !selectedTankHasPoints ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Settings2 className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Configure os pontos de lacração
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              O tanque {selectedTank?.tag} ainda não possui pontos cadastrados.
              Use a estrutura confirmada no formulário antigo para começar.
            </p>
            {canEdit ? (
              <Button
                className="mt-5 bg-teal-700 hover:bg-teal-800"
                onClick={() => void initializePoints()}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LockKeyhole className="mr-2 size-4" />
                )}
                Configurar pontos da planilha
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="min-w-56">
                      Ponto de lacração
                    </TableHead>
                    <TableHead>Tanque</TableHead>
                    <TableHead className="min-w-40">Lacres atuais</TableHead>
                    <TableHead className="min-w-64">
                      Posição requerida
                    </TableHead>
                    <TableHead className="min-w-44">Último evento</TableHead>
                    <TableHead className="min-w-44">Situação</TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-40 text-center text-sm text-slate-500"
                      >
                        Nenhum ponto corresponde aos filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="group cursor-pointer"
                        onClick={() => setHistoryPoint(row)}
                      >
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            {row.componentName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {row.componentCode} · {row.location || 'Sem local'}
                          </p>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {row.tankTag}
                        </TableCell>
                        <TableCell>
                          {row.currentSealNumbers.length > 0 ? (
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              {row.currentSealNumbers.join(' / ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {row.requiredPosition}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-700">
                            {eventLabels[row.latestEventType ?? ''] ??
                              'Sem evento'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDateTime(row.latestEventEffectiveAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.currentStatus} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Ver histórico de ${row.componentName}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                setHistoryPoint(row)
                              }}
                            >
                              <Eye className="size-4" />
                            </Button>
                            {canEdit ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Registrar evento para ${row.componentName}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setEventPoint(row)
                                }}
                              >
                                <Plus className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Mostrando {visibleRows.length} de {tankRows.length} pontos
              </span>
              <span>Atualização por eventos aprovados</span>
            </div>
          </>
        )}
      </section>

      {eventPoint ? (
        <SealEventDialog
          key={eventPoint.id}
          point={eventPoint}
          open
          onOpenChange={(open) => {
            if (!open) setEventPoint(null)
          }}
          onSubmit={registerEvent}
        />
      ) : null}

      <SealHistorySheet
        point={historyPoint}
        onOpenChange={(open) => {
          if (!open) setHistoryPoint(null)
        }}
      />
    </div>
  )
}
