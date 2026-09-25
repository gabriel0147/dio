import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SrtWellTest, SrtTestType, Well } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'
import {
  Search,
  FilterX,
  FileDown,
  ChevronsUpDown,
  Check,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface RecentTestsTableProps {
  data: SrtWellTest[]
  isLoading: boolean
  wells: Well[]
  filters: {
    wellId: string
    testType: SrtTestType | 'all'
    dateRange: DateRange | undefined
  }
  onFilterChange: (filters: any) => void
}

export function RecentTestsTable({
  data,
  isLoading,
  wells,
  filters,
  onFilterChange,
}: RecentTestsTableProps) {
  const navigate = useNavigate()
  const [openCombobox, setOpenCombobox] = useState(false)

  const handleClearFilters = () => {
    onFilterChange({
      wellId: 'all',
      testType: 'all',
      dateRange: undefined,
    })
  }

  const handleExport = () => {
    if (data.length === 0) return

    const headers = [
      'Poço',
      'Data Início',
      'Data Fim',
      'Duração (h)',
      'Tipo',
      'Status',
      'BSW Emulsão (%)',
      'BSW Total (%)',
      'Q. T. Líq (m³)',
      'Q. A. Liq (m³)',
      'Q. O. Liq (m³)',
      'Q. O. Cor (m³)',
      'Q. G. Liq (m³)',
      'Pot Líq 24h',
      'Pot Água 24h',
      'Pot Óleo 24h',
    ]

    const rows = data.map((test) => [
      test.wellName || 'Desconhecido',
      format(parseISO(test.testStartAt), 'dd/MM/yyyy HH:mm'),
      format(parseISO(test.testEndAt), 'dd/MM/yyyy HH:mm'),
      test.durationH?.toFixed(2).replace('.', ',') || '0',
      test.testType,
      test.status,
      test.bswEmulsionPct?.toFixed(6).replace('.', ',') || '0',
      test.bswTotalPct?.toFixed(6).replace('.', ',') || '0',
      test.vLiqTest?.toFixed(3).replace('.', ',') || '0',
      test.vWatTest?.toFixed(3).replace('.', ',') || '0',
      test.vOilTest?.toFixed(3).replace('.', ',') || '0',
      test.vOilCorrected?.toFixed(3).replace('.', ',') || '0',
      test.vGasTest?.toFixed(3).replace('.', ',') || '0',
      test.potLiq24h?.toFixed(2).replace('.', ',') || '0',
      test.potWat24h?.toFixed(2).replace('.', ',') || '0',
      test.potOil24h?.toFixed(2).replace('.', ',') || '0',
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = `export_testes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vigente':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Vigente</Badge>
        )
      case 'valido':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Válido</Badge>
      case 'invalido':
        return <Badge variant="destructive">Inválido</Badge>
      default:
        return <Badge variant="outline">Rascunho</Badge>
    }
  }

  const formatVolume = (val?: number) =>
    val !== undefined ? val.toFixed(3) : '-'
  const formatPct = (val?: number) => (val !== undefined ? val.toFixed(2) : '-')
  const formatDuration = (val?: number) =>
    val !== undefined ? `${val.toFixed(2)}h` : '-'

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'apropriacao':
        return 'Apropriação'
      case 'operacional':
        return 'Operacional'
      case 'diagnostico':
        return 'Diagnóstico'
      case 'comissionamento':
        return 'Comissionamento'
      default:
        return type
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtering Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Well Selection */}
          <div className="flex flex-col gap-1.5 w-full sm:w-[250px]">
            <span className="text-xs font-medium text-muted-foreground">
              Poço
            </span>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {filters.wellId && filters.wellId !== 'all'
                    ? wells.find((w) => w.id === filters.wellId)?.name
                    : 'Todos os Poços'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar poço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum poço encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          onFilterChange({ ...filters, wellId: 'all' })
                          setOpenCombobox(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            filters.wellId === 'all'
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        Todos os Poços
                      </CommandItem>
                      {wells.map((well) => (
                        <CommandItem
                          key={well.id}
                          value={well.name}
                          onSelect={() => {
                            onFilterChange({ ...filters, wellId: well.id })
                            setOpenCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              filters.wellId === well.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {well.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Test Type */}
          <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
            <span className="text-xs font-medium text-muted-foreground">
              Tipo de Teste
            </span>
            <Select
              value={filters.testType}
              onValueChange={(val: SrtTestType | 'all') =>
                onFilterChange({ ...filters, testType: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="apropriacao">Apropriação</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                <SelectItem value="comissionamento">Comissionamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <span className="text-xs font-medium text-muted-foreground">
              Período (Data Fim)
            </span>
            <DateRangePicker
              date={filters.dateRange}
              setDate={(range) =>
                onFilterChange({ ...filters, dateRange: range })
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full xl:w-auto justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearFilters}
            title="Limpar Filtros"
          >
            <FilterX className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Carregando dados...
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
            Nenhum teste encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px] font-bold">Poço</TableHead>
                  <TableHead className="w-[140px]">Data Fim</TableHead>
                  <TableHead className="text-center w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    BSW Emulsão (%)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    BSW Total (%)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Q. T. Líq (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Q. A. Liq (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Q. O. Liq (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Q. O. Cor (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Q. G. Liq (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap bg-muted/20">
                    Q. T. Líq 24h (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap bg-muted/20">
                    Q. A. Liq 24h (m³)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap bg-muted/20">
                    Q. O. Liq 24h (m³)
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((test) => {
                  const bswHigh = (test.bswTotalPct || 0) > 90
                  const productionLow = (test.potOil24h || 0) < 5 // Example threshold

                  return (
                    <TableRow key={test.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-bold text-foreground hover:text-primary"
                          onClick={() => navigate(`/srt/tests/${test.id}`)}
                        >
                          {test.wellName || 'Desconhecido'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(test.testEndAt), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(test.status)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatDuration(test.durationH)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {getTestTypeLabel(test.testType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPct(test.bswEmulsionPct)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-sm',
                          bswHigh && 'text-red-600 font-bold',
                        )}
                      >
                        {formatPct(test.bswTotalPct)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVolume(test.vLiqTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVolume(test.vWatTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVolume(test.vOilTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVolume(test.vOilCorrected)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVolume(test.vGasTest)}
                      </TableCell>
                      {/* 24h Potentials */}
                      <TableCell className="text-right font-mono text-sm bg-muted/20 font-semibold text-blue-700">
                        {formatVolume(test.potLiq24h)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm bg-muted/20">
                        {formatVolume(test.potWat24h)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-sm bg-muted/20 font-semibold',
                          productionLow ? 'text-yellow-600' : 'text-green-700',
                        )}
                      >
                        {formatVolume(test.potOil24h)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/srt/tests/${test.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
