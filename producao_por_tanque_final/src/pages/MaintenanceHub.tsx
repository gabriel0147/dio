import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Box, Wrench } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'

type MaintenanceModule = 'smt' | 'sbp'

export default function MaintenanceHub() {
  const navigate = useNavigate()
  const { projects, currentProject, setCurrentProject, isLoadingProjects } =
    useProject()

  const maintenanceProject = useMemo(
    () =>
      projects.find((project) => project.projectScope === 'maintenance') ??
      null,
    [projects],
  )

  useEffect(() => {
    if (!maintenanceProject) return
    if (currentProject?.id === maintenanceProject.id) return
    setCurrentProject(maintenanceProject)
  }, [currentProject?.id, maintenanceProject, setCurrentProject])

  const handleModuleClick = (module: MaintenanceModule) => {
    if (!maintenanceProject) return

    setCurrentProject(maintenanceProject)
    navigate(module === 'smt' ? `/smt?view=dashboard` : `/sbp`)
  }

  const modules = [
    {
      title: 'SMT',
      description: 'Sistema de Manutenção',
      icon: Wrench,
      type: 'smt' as const,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'SBP',
      description: 'Sistema de Bens Patrimoniais',
      icon: Box,
      type: 'sbp' as const,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
  ]

  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex flex-col justify-center items-center animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="text-muted-foreground">
            Carregando projeto de manutenção...
          </p>
        </div>
      </div>
    )
  }

  if (!maintenanceProject) {
    return (
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="rounded-lg border border-dashed bg-muted/10 px-6 py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">
            Projeto fixo de Manutenção não encontrado
          </p>
          <p className="mt-1 text-sm">
            Sincronize o banco para recriar o projeto base de Manutenção.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-orange-600">
          Sistema de Gestão Integrada da Manutenção
        </h1>
        <p className="text-muted-foreground mt-2">
          Projeto ativo:{' '}
          <span className="font-medium text-foreground">
            {maintenanceProject.name}
          </span>
          . Escolha o módulo que deseja acessar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <Card
            key={module.title}
            className="group cursor-pointer border-2 transition-all hover:border-orange-500/40 hover:shadow-md"
            onClick={() => handleModuleClick(module.type)}
            role="button"
            tabIndex={0}
            aria-label={`Abrir módulo ${module.title}: ${module.description}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleModuleClick(module.type)
              }
            }}
          >
            <CardHeader className="flex flex-col items-center p-6 text-center">
              <div
                className={`mb-4 rounded-full p-4 transition-transform group-hover:scale-110 ${module.bgColor}`}
              >
                <module.icon className={`h-8 w-8 ${module.color}`} />
              </div>
              <CardTitle className={`text-2xl font-bold ${module.color}`}>
                {module.title}
              </CardTitle>
              <CardDescription className="mt-2 font-medium">
                {module.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
