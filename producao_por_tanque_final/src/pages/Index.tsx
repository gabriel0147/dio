import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Plus,
  LayoutDashboard,
  AlertTriangle,
  RefreshCw,
  Users,
  Droplets,
  StopCircle,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// Skeleton for Project Card
function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col space-y-3 rounded-xl border p-6 shadow-sm bg-card animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-auto pt-4">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default function Index() {
  const {
    projects,
    createProject,
    setCurrentProject,
    isLoadingProjects,
    projectsError,
    refreshProjects,
  } = useProject()
  const navigate = useNavigate()
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const hasProjectsOnMount = useRef(projects.length > 0)

  useEffect(() => {
    refreshProjects({
      showLoading: !hasProjectsOnMount.current,
      caller: 'IndexPage Mount',
    })
  }, [refreshProjects])

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject(newProjectName, newProjectDesc, 'production')
    setNewProjectName('')
    setNewProjectDesc('')
    setIsDialogOpen(false)
  }

  const handleOpenProject = (project: any) => {
    setCurrentProject(project)
    // Redirect to Hub instead of Dashboard
    navigate(`/project/${project.id}/hub`)
  }

  const isInitialLoading = isLoadingProjects && projects.length === 0

  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )
    }

    if (projectsError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed border-destructive/50 bg-destructive/5 text-muted-foreground animate-fade-in">
          <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
          <p className="text-lg font-medium text-destructive">
            Erro ao carregar projetos
          </p>
          <p className="text-sm max-w-md text-center mb-4">{projectsError}</p>
          <Button
            variant="outline"
            onClick={() =>
              refreshProjects({ showLoading: true, caller: 'Retry Button' })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      )
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {/* Dedicated SRT Module Entry */}
        <Card className="flex flex-col hover:border-primary/50 transition-all hover:shadow-md relative overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold">
              <Droplets className="h-5 w-5" />
              SRT - Sistema de Registro de Teste
            </CardTitle>
            <CardDescription>Registro de Teste</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto pt-0">
            <Button
              className="w-full"
              variant="default"
              onClick={() => navigate('/srt')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Abrir SRT
            </Button>
          </CardFooter>
        </Card>

        {/* Dedicated SGPA Module Entry */}
        <Card className="flex flex-col hover:border-primary/50 transition-all hover:shadow-md relative overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold">
              <StopCircle className="h-5 w-5" />
              SGPA - Sistema de Gestão de Paradas
            </CardTitle>
            <CardDescription>Registro de Paradas</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto pt-0">
            <Button
              className="w-full"
              variant="default"
              onClick={() => navigate('/sgpa')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Abrir SGPA
            </Button>
          </CardFooter>
        </Card>

        {projects.length === 0 && (
          <div className="col-span-full md:col-span-2 flex flex-col items-center justify-center py-16 border rounded-lg border-dashed text-muted-foreground bg-muted/10 animate-fade-in">
            <FolderOpen className="h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum projeto encontrado
            </h3>
            <p className="text-sm max-w-sm text-center mb-6">
              Crie um novo projeto para começar a gerenciar sua produção.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                refreshProjects({
                  showLoading: true,
                  caller: 'Empty State Refresh',
                })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Lista
            </Button>
          </div>
        )}

        {projects.map((project) => (
          <Card
            key={project.id}
            className="flex flex-col hover:border-primary/50 transition-all hover:shadow-md relative overflow-hidden border-primary/20 bg-primary/5 group"
          >
            {project.role !== 'owner' && (
              <div className="absolute top-0 right-0 p-2">
                <Badge
                  variant="outline"
                  className="text-xs bg-muted/50 border-muted"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {project.role === 'editor' ? 'Editor' : 'Viewer'}
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FolderOpen className="h-5 w-5" />
                {project.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-[2.5em]">
                {project.description || 'Sem descrição'}
              </CardDescription>
            </CardHeader>

            <CardFooter className="mt-auto pt-0">
              <Button
                className="w-full"
                variant="default"
                onClick={() => handleOpenProject(project)}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Abrir Hub
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Sistema de Gestão Integrada da Produção
          </h1>
          <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-muted-foreground bg-muted/20 p-4 rounded-lg border border-border/40">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="font-bold w-12 justify-center"
              >
                SRT
              </Badge>
              <span className="text-sm font-medium">
                Sistema de Registro de Teste
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="font-bold w-12 justify-center"
              >
                SRP
              </Badge>
              <span className="text-sm font-medium">
                Sistema de Registro da Produção
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="font-bold w-12 justify-center"
              >
                SGPA
              </Badge>
              <span className="text-sm font-medium">
                Sistema de Gestão de Paradas
              </span>
            </div>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Dê um nome e uma descrição para o seu novo projeto.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="col-span-3"
                  placeholder="Ex: Projeto Alpha"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="description"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="col-span-3"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                Criar Projeto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {renderContent()}
    </div>
  )
}
