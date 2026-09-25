import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import { projectService } from '@/services/projectService'
import { ProjectHubSummary } from '@/lib/types'
import { ArrowRight, Droplets, Activity, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectHub() {
  const { projectId } = useParams()
  const { currentProject, setCurrentProject, projects } = useProject()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<ProjectHubSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync current project
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  // Fetch summary data
  useEffect(() => {
    if (currentProject) {
      setLoading(true)
      projectService
        .getProjectHubSummary(currentProject.id)
        .then(setSummary)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [currentProject])

  // Permission Logic
  const canAccessProduction =
    role === 'operator' ||
    role === 'petroleum_engineer' ||
    role === 'supervisor' ||
    role === 'operations_manager' ||
    role === 'director' ||
    role === 'admin' ||
    role === 'regulation' ||
    role === 'approver'

  if (!currentProject) {
    return <div className="p-8 text-center">Carregando projeto...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in max-w-7xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Project Hub
        </h1>
        <p className="text-muted-foreground text-lg">
          Visão Geral do Projeto:{' '}
          <span className="font-semibold text-foreground">
            {currentProject.name}
          </span>
        </p>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Status da Produção (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-blue-200/50 animate-pulse rounded" />
            ) : (
              <div className="flex gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {summary?.productionReportsStatus.closed}
                  </div>
                  <p className="text-xs text-muted-foreground">Fechados</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {summary?.productionReportsStatus.draft}
                  </div>
                  <p className="text-xs text-muted-foreground">Rascunhos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Paradas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-orange-200/50 animate-pulse rounded" />
            ) : (
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {summary?.openEventsCount}
                </div>
                <p className="text-xs text-orange-700">
                  Eventos SGPA em Aberto
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mt-8">
        {/* Production Card */}
        <div
          className={cn(
            'group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg cursor-pointer',
            !canAccessProduction && 'opacity-50 pointer-events-none grayscale',
          )}
          onClick={
            canAccessProduction
              ? () => navigate(`/project/${projectId}/dashboard`)
              : undefined
          }
          role="button"
          tabIndex={canAccessProduction ? 0 : -1}
          aria-disabled={!canAccessProduction}
          aria-label="Abrir módulo de Produção"
          onKeyDown={(event) => {
            if (
              canAccessProduction &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault()
              navigate(`/project/${projectId}/dashboard`)
            }
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-8 relative z-10 flex flex-col h-full">
            <div className="mb-6 bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
              <Droplets className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-700 transition-colors">
              Produção
            </h3>
            <p className="text-muted-foreground flex-1 mb-6">
              Gestão completa de produção, relatórios diários, variações de
              estoque e monitoramento de poços.
            </p>
            <div className="flex items-center text-sm font-medium text-blue-600">
              Acessar Módulo <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </div>
          {!canAccessProduction && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-20">
              <Badge variant="outline" className="bg-background">
                Acesso Restrito
              </Badge>
            </div>
          )}
        </div>

        {/* SGPA Card */}
        <div
          className={cn(
            'group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg cursor-pointer',
            !canAccessProduction && 'opacity-50 pointer-events-none grayscale',
          )}
          onClick={canAccessProduction ? () => navigate('/sgpa') : undefined}
          role="button"
          tabIndex={canAccessProduction ? 0 : -1}
          aria-disabled={!canAccessProduction}
          aria-label="Abrir módulo de Paradas SGPA"
          onKeyDown={(event) => {
            if (
              canAccessProduction &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault()
              navigate('/sgpa')
            }
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-8 relative z-10 flex flex-col h-full">
            <div className="mb-6 bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-red-700 transition-colors">
              Paradas (SGPA)
            </h3>
            <p className="text-muted-foreground flex-1 mb-6">
              Gestão de eventos de paradas e restrições operacionais.
            </p>
            <div className="flex items-center text-sm font-medium text-red-600">
              Acessar Módulo <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
