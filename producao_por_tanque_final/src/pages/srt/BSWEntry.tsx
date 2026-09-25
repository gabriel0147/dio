import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Beaker, Search, Filter, FlaskConical, FileDown } from 'lucide-react'
import { srtService } from '@/services/srtService'
import { SrtWellTest } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { BSWForm } from '@/components/srt/BSWForm'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import { safeToFixed } from '@/lib/numberFormat'

const toNumber = (value: unknown, fallback = 0) => {
  const numeric =
    typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const formatNumber = safeToFixed

export default function BSWEntry() {
  const navigate = useNavigate()
  const { wells, currentProject, isLoadingProjects } = useProject()
  const [tests, setTests] = useState<SrtWellTest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTest, setSelectedTest] = useState<SrtWellTest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const allowedWellIds = useMemo(
    () => new Set(wells.map((well) => well.id)),
    [wells],
  )

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  const loadTests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await srtService.getTestsForLabAnalysis()
      const scopedData = currentProject
        ? data.filter((test) => allowedWellIds.has(test.wellId))
        : data
      setTests(scopedData)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar testes.')
    } finally {
      setLoading(false)
    }
  }, [allowedWellIds, currentProject])

  useEffect(() => {
    void loadTests()
  }, [loadTests])

  const filteredTests = tests.filter((t) => {
    const searchLower = search.toLowerCase()
    return (
      t.wellName?.toLowerCase().includes(searchLower) ||
      t.status.toLowerCase().includes(searchLower)
    )
  })

  const handleOpenTest = (test: SrtWellTest) => {
    setSelectedTest(test)
    setIsDialogOpen(true)
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    loadTests()
  }

  const handleExport = () => {
    if (filteredTests.length === 0) {
      toast.warning('Não há dados para exportar com os filtros atuais.')
      return
    }

    try {
      const headers = [
        'Poço',
        'Data do Teste',
        'Tipo',
        'Vol. Líq (m³)',
        'BSW Emulsão (%)',
        'BSW Total (%)',
        'Status',
      ]

      const rows = filteredTests.map((test) => {
        const date = format(parseISO(test.testStartAt), 'dd/MM/yyyy HH:mm')
        const vLiq = formatNumber(test.vLiqTest, 3, '0.000').replace('.', ',')

        // Handle BSW Emulsion
        let bswEmulsion = '-'
        if (test.bswEmulsionPct !== undefined && test.bswEmulsionPct !== null) {
          bswEmulsion = formatNumber(test.bswEmulsionPct, 6).replace('.', ',')
        }

        // Handle BSW Total
        let bswTotal = '-'
        if (test.bswTotalPct !== undefined) {
          bswTotal = formatNumber(test.bswTotalPct, 6).replace('.', ',')
        } else if (toNumber(test.vLiqTest) > 0) {
          bswTotal = '0,00'
        }

        return [
          test.wellName || 'Desconhecido',
          date,
          test.testType,
          vLiq,
          bswEmulsion,
          bswTotal,
          test.status,
        ]
      })

      // Create CSV content with semicolon delimiter for PT-BR Excel compatibility
      const csvContent = [
        headers.join(';'),
        ...rows.map((row) => row.join(';')),
      ].join('\n')

      // Add BOM for UTF-8 compatibility
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `relatorio_bsw_${format(new Date(), 'ddMMyyyy_HHmm')}.csv`

      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erro ao exportar relatório.')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            BSW da Emulsão — Laboratório
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro laboratorial do BSWe usado nos cálculos de BSW Total.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por poço..."
                className="pl-9 w-full sm:w-[250px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" title="Filtrar">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Poço</TableHead>
              <TableHead>Data do Teste</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Vol. Líq (m³)</TableHead>
              <TableHead className="text-right">BSW Emulsão (%)</TableHead>
              <TableHead className="text-right">BSW Total (%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando testes...
                </TableCell>
              </TableRow>
            ) : filteredTests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum teste pendente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test) => (
                <TableRow key={test.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {test.wellName || 'Desconhecido'}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(test.testStartAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="capitalize">{test.testType}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(test.vLiqTest, 3)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {test.bswEmulsionPct !== undefined &&
                    test.bswEmulsionPct !== null ? (
                      <span className="text-green-600 font-medium">
                        {formatNumber(test.bswEmulsionPct, 6)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {test.bswTotalPct !== undefined ? (
                      <span className="font-medium">
                        {formatNumber(test.bswTotalPct, 6)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {toNumber(test.vLiqTest) > 0 ? '0.00%' : '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={test.status === 'valido' ? 'default' : 'outline'}
                    >
                      {test.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenTest(test)}
                    >
                      <FlaskConical className="mr-2 h-4 w-4" />
                      Lançar BSW da Emulsão
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento de BSW da Emulsão</DialogTitle>
            <DialogDescription>
              Poço: {selectedTest?.wellName} | Data:{' '}
              {selectedTest
                ? format(parseISO(selectedTest.testStartAt), 'dd/MM/yyyy HH:mm')
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedTest && (
            <div className="py-4">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 p-3 rounded-md mb-6 border border-blue-100 text-sm">
                <Beaker className="h-5 w-5" />
                <span>
                  {selectedTest?.initialLevelVolumeM3 !== undefined
                    ? 'O preenchimento do BSW recalculará os volumes pela metodologia Mi/Me/Mf.'
                    : 'Este é um registro legado: o BSW será salvo, mas os volumes históricos serão preservados.'}
                </span>
              </div>
              <BSWForm test={selectedTest} onSuccess={handleSuccess} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
