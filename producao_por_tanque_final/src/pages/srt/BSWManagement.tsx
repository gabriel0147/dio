import { useState, useEffect, useCallback, useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { bswService } from '@/services/bswService'
import { WellBSWRecord } from '@/lib/types'
import { ManualBSWForm } from '@/components/srt/ManualBSWForm'
import { Plus, Trash2, FilterX, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { safeToFixed } from '@/lib/numberFormat'

export default function BSWManagement() {
  const navigate = useNavigate()
  const { wells, currentProject, isLoadingProjects } = useProject()
  const { user } = useAuth()
  const [records, setRecords] = useState<WellBSWRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Filters
  const [selectedWellId, setSelectedWellId] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const allowedWellIds = useMemo(
    () => new Set(wells.map((well) => well.id)),
    [wells],
  )
  const tankById = useMemo(() => {
    const map = new Map<string, string>()
    currentProject?.tanks.forEach((tank) => {
      map.set(tank.id, tank.tag)
    })
    return map
  }, [currentProject?.tanks])

  const tankByWellId = useMemo(() => {
    const map = new Map<string, string>()
    currentProject?.tanks.forEach((tank) => {
      if (tank.wellId) {
        map.set(tank.wellId, tank.tag)
      }
    })
    return map
  }, [currentProject?.tanks])

  const getTankWellLabel = useCallback(
    (wellId: string, wellName?: string, tankId?: string) => {
      const tankName = tankId ? tankById.get(tankId) : tankByWellId.get(wellId)
      if (!tankName) return wellName || 'Poço não identificado'
      return `${tankName} - ${wellName || 'poço não identificado'}`
    },
    [tankById, tankByWellId],
  )

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  const loadData = useCallback(async () => {
    if (isLoadingProjects) return

    setLoading(true)
    try {
      const data = await bswService.getAllEntries({
        wellId: selectedWellId === 'all' ? undefined : selectedWellId,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      })
      const scopedData = currentProject
        ? data.filter(
            (record) =>
              record.origin === 'Lançado' && allowedWellIds.has(record.wellId),
          )
        : data.filter((record) => record.origin === 'Lançado')
      setRecords(scopedData)
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [
    allowedWellIds,
    currentProject,
    dateRange,
    isLoadingProjects,
    selectedWellId,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteRecord = async (record: WellBSWRecord) => {
    if (!user) return
    if (!confirm('Tem certeza que deseja excluir este registro de BSW?')) return
    try {
      await bswService.deleteEntry(record, user.id)
      toast.success('Registro excluído com sucesso.')
      loadData()
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    }
  }

  const clearFilters = () => {
    setSelectedWellId('all')
    setDateRange(undefined)
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            BSW Total — Medição
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico e cálculo do BSW Total a partir das medições do tanque.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Calcular BSW Total
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="w-full md:w-[250px]">
          <label className="text-xs font-medium mb-1.5 block">
            Tanque e Poço
          </label>
          <Select value={selectedWellId} onValueChange={setSelectedWellId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os poços" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os poços</SelectItem>
              {wells.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {getTankWellLabel(w.id, w.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[300px]">
          <label className="text-xs font-medium mb-1.5 block">Período</label>
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="w-full"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            size="icon"
            aria-label="Limpar filtros"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tanque e Poço</TableHead>
              <TableHead className="text-right">VT (m³)</TableHead>
              <TableHead className="text-right">VE (m³)</TableHead>
              <TableHead className="text-right">VAL (m³)</TableHead>
              <TableHead className="text-right">BSWe (%)</TableHead>
              <TableHead className="text-right">VAE (m³)</TableHead>
              <TableHead className="text-right">VO (m³)</TableHead>
              <TableHead className="text-right">BSWt (%)</TableHead>
              <TableHead className="text-center">Origem</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando registros...
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum BSW Total encontrado. Os filtros são opcionais.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/30">
                  <TableCell>
                    {format(parseISO(record.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getTankWellLabel(
                      record.wellId,
                      record.wellName,
                      record.tankId,
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.totalVolumeM3, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.emulsionVolumeM3, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.freeWaterVolumeM3, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.bswEmulsionPct, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.emulsionWaterVolumeM3, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.oilVolumeM3, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {safeToFixed(record.bswTotalPct, 6, '0.000000')}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.origin === 'Teste' ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                      >
                        Teste
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-800 border-green-200"
                      >
                        Lançado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRecord(record)}
                      className="text-destructive hover:text-destructive/90"
                      title="Excluir registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ManualBSWForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        wells={wells}
        onSuccess={loadData}
      />
    </div>
  )
}
