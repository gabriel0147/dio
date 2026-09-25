import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Activity,
  Clock,
  Database,
  FlaskConical,
  RefreshCw,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import { srtService } from '@/services/srtService'
import { bswService } from '@/services/bswService'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { RecentBSWTable } from '@/components/srt/RecentBSWTable'
import { RecentTestsTable } from '@/components/srt/RecentTestsTable'
import { WellBSWRecord, SrtWellTest, SrtTestType } from '@/lib/types'
import { toast } from 'sonner'
import { DateRange } from 'react-day-picker'

export default function SrtDashboard() {
  const navigate = useNavigate()
  const { wells, currentProject, isLoadingProjects } = useProject()

  // Dashboard Stats State
  const [stats, setStats] = useState({
    activeSessions: 0,
    activeTanks: 0,
  })
  const [bswData, setBswData] = useState<WellBSWRecord[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  // Tests Data State
  const [testsData, setTestsData] = useState<SrtWellTest[]>([])
  const [testsLoading, setTestsLoading] = useState(true)

  // Filter State
  const [testFilters, setTestFilters] = useState<{
    wellId: string
    testType: SrtTestType | 'all'
    dateRange: DateRange | undefined
  }>({
    wellId: 'all',
    testType: 'all',
    dateRange: undefined,
  })

  const allowedWellIds = useMemo(
    () => new Set(wells.map((well) => well.id)),
    [wells],
  )

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  // Load Dashboard Stats (Independent of filters)
  const loadDashboardStats = useCallback(async () => {
    if (isLoadingProjects || !currentProject) return
    setStatsLoading(true)
    try {
      const [sessions, tanks, bsw] = await Promise.all([
        srtService.getSessions(true, currentProject.id),
        srtService.getMobileTanks(true, currentProject.id),
        bswService.getAllEntries({ limit: 10 }),
      ])

      const scopedBsw = currentProject
        ? bsw.filter((entry) => allowedWellIds.has(entry.wellId))
        : bsw

      setStats({
        activeSessions: sessions.length,
        activeTanks: tanks.length,
      })
      setBswData(scopedBsw)
    } catch (e: any) {
      console.error('Failed dashboard stats load', e)
      toast.error('Erro ao atualizar estatísticas.')
    } finally {
      setStatsLoading(false)
    }
  }, [allowedWellIds, currentProject, isLoadingProjects])

  // Load Tests (Dependent on filters)
  const loadTests = useCallback(async () => {
    if (isLoadingProjects || !currentProject) return
    setTestsLoading(true)
    try {
      const data = await srtService.searchTests({
        wellId: testFilters.wellId,
        testType: testFilters.testType,
        startDate: testFilters.dateRange?.from,
        endDate: testFilters.dateRange?.to,
        limit: 50,
      })
      const scopedData = currentProject
        ? data.filter((test) => allowedWellIds.has(test.wellId))
        : data
      setTestsData(scopedData)
    } catch (e: any) {
      console.error('Failed to load tests', e)
      toast.error('Erro ao carregar lista de testes.')
    } finally {
      setTestsLoading(false)
    }
  }, [allowedWellIds, currentProject, isLoadingProjects, testFilters])

  // Initial Load / Effects
  useEffect(() => {
    if (isLoadingProjects || !currentProject) return
    loadDashboardStats()
  }, [currentProject, isLoadingProjects, loadDashboardStats])

  useEffect(() => {
    if (isLoadingProjects || !currentProject) return
    loadTests()
  }, [currentProject, isLoadingProjects, loadTests])

  const handleRefresh = () => {
    loadDashboardStats()
    loadTests()
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Sistema de Registro de Teste (SRT)
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral das operações de teste e qualidade de fluidos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={statsLoading || testsLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${statsLoading || testsLoading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Planejamentos em Aberto
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Testes planejados em andamento
            </p>
            <Button
              variant="link"
              className="mt-2 h-auto px-0 text-xs"
              onClick={() => navigate('/srt/sessions')}
            >
              Gerenciar Planejamentos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tanques Ativos
            </CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats.activeTanks}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponíveis na frota
            </p>
            <Button
              variant="link"
              className="mt-2 h-auto px-0 text-xs"
              onClick={() => navigate('/srt/tanks')}
            >
              Ver Frota
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/srt/tests/new')}
              className="w-full justify-start"
            >
              Lançar Novo Teste
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/srt/bsw')}
              className="w-full justify-start"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              Lançar BSW
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Testes de Poços Recentes (Consolidado)
            </h2>
          </div>
        </div>
        <RecentTestsTable
          data={testsData}
          isLoading={testsLoading}
          wells={wells}
          filters={testFilters}
          onFilterChange={setTestFilters}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Últimas Medições de BSW (Consolidado)
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/srt/bsw-management')}
          >
            Ver Todos
          </Button>
        </div>
        <RecentBSWTable data={bswData} isLoading={statsLoading} />
      </div>
    </div>
  )
}
