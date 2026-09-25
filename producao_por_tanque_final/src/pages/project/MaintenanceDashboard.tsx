import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sgpaService } from '@/services/sgpaService'
import { sbpService } from '@/services/sbpService'
import { SbpAsset, SgpaEvent } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Wrench, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react'
import { EventList } from '@/components/sgpa/EventList'
import { Button } from '@/components/ui/button'
import { EventForm } from '@/components/sgpa/EventForm'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function MaintenanceDashboard() {
  const { projectId } = useParams()
  const { currentProject, setCurrentProject, projects } = useProject()
  const { user } = useAuth()
  const [assets, setAssets] = useState<SbpAsset[]>([])
  const [events, setEvents] = useState<SgpaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SgpaEvent | null>(null)

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const loadData = useCallback(async () => {
    if (!currentProject) return

    setLoading(true)
    try {
      const [assetsData, eventsData] = await Promise.all([
        sbpService.getAssets(currentProject.id),
        sgpaService.getEvents({ projectId: currentProject.id }),
      ])
      setAssets(assetsData)
      setEvents(eventsData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeAssetsCount = assets.filter(
    (asset) => asset.situation === 'active' || asset.situation === 'in_use',
  ).length
  const openEventsCount = events.filter((event) => event.status === 'OPEN').length
  const totalLoss = events.reduce(
    (acc, current) => acc + (current.estimatedLossM3 || 0),
    0,
  )

  const handleEditEvent = (event: SgpaEvent) => {
    setEditingEvent(event)
    setIsEventFormOpen(true)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!user) return
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    try {
      await sgpaService.deleteEvent(id, user.id)
      toast.success('Evento excluido.')
      loadData()
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    }
  }

  const handleCreateEvent = () => {
    setEditingEvent(null)
    setIsEventFormOpen(true)
  }

  const getSituationLabel = (situation: SbpAsset['situation']) => {
    switch (situation) {
      case 'active':
        return 'Ativo'
      case 'in_use':
        return 'Em Uso'
      case 'idle':
        return 'Ocioso'
      case 'retired':
        return 'Baixado'
      default:
        return situation
    }
  }

  if (!currentProject) return null

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Manutencao & Ativos (BP)
        </h1>
        <p className="text-muted-foreground">
          Gestao de ativos e eventos de parada para o projeto{' '}
          <span className="font-semibold text-foreground">
            {currentProject.name}
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CheckCircle className="h-4 w-4" /> Ativos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssetsCount}</div>
            <p className="text-xs text-muted-foreground">Total de BPs Ativos</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" /> Eventos Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {openEventsCount}
            </div>
            <p className="text-xs text-red-600">Paradas/Restricoes Ativas</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <BarChart2 className="h-4 w-4" /> Perda Acumulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {totalLoss.toFixed(2)} m3
            </div>
            <p className="text-xs text-blue-600">
              Volume nao produzido (Total)
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="assets">Ativos (BP)</TabsTrigger>
          <TabsTrigger value="events">Historico de Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eventos Recentes</CardTitle>
              </CardHeader>
              <CardContent className="px-2">
                <EventList
                  events={events.slice(0, 5)}
                  onEdit={handleEditEvent}
                />
                <div className="mt-4 text-center">
                  <Button variant="link" onClick={() => setActiveTab('events')}>
                    Ver Todos
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bens Patrimoniais</CardTitle>
                <CardDescription>
                  Resumo dos ativos cadastrados neste projeto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Carregando ativos...
                  </div>
                ) : assets.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum bem patrimonial encontrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.slice(0, 5).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">{asset.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.assetNumber} • {asset.category}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            asset.situation === 'active' ||
                            asset.situation === 'in_use'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {getSituationLabel(asset.situation)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Bens Patrimoniais (BP)</CardTitle>
              <CardDescription>
                Lista de bens patrimoniais cadastrados neste projeto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Ativo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Situacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nenhum ativo encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            {asset.assetNumber}
                          </TableCell>
                          <TableCell>{asset.description}</TableCell>
                          <TableCell>{asset.category}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                asset.situation === 'active' ||
                                asset.situation === 'in_use'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {getSituationLabel(asset.situation)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historico de Eventos</CardTitle>
              <Button onClick={handleCreateEvent}>
                <Wrench className="mr-2 h-4 w-4" /> Registrar Evento
              </Button>
            </CardHeader>
            <CardContent>
              <EventList
                events={events}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EventForm
        open={isEventFormOpen}
        onOpenChange={setIsEventFormOpen}
        onSuccess={loadData}
        initialEvent={editingEvent}
      />
    </div>
  )
}
