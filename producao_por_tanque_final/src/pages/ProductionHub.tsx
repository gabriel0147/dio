import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Activity, ClipboardList, Droplets, StopCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'

type ProductionModule = 'srt' | 'sgpa' | 'srp' | 'sgp'

export default function ProductionHub() {
  const navigate = useNavigate()
  const { projects, currentProject, setCurrentProject, isLoadingProjects } =
    useProject()

  const productionProject = useMemo(
    () =>
      projects.find((project) => project.projectScope === 'production') ?? null,
    [projects],
  )

  useEffect(() => {
    if (!productionProject) return
    if (currentProject?.id === productionProject.id) return
    setCurrentProject(productionProject)
  }, [currentProject?.id, productionProject, setCurrentProject])

  const handleModuleClick = (module: ProductionModule) => {
    if (!productionProject) return

    setCurrentProject(productionProject)

    switch (module) {
      case 'srp':
        navigate(`/project/${productionProject.id}/dashboard`)
        break
      case 'sgp':
        navigate(`/project/${productionProject.id}/hub`)
        break
      case 'srt':
        navigate('/srt')
        break
      case 'sgpa':
        navigate('/sgpa')
        break
    }
  }

  const modules = [
    {
      title: 'SRT',
      description: 'Sistema de Registro de Teste',
      icon: Droplets,
      type: 'srt' as const,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'SGPA',
      description: 'Sistema de Gestão de Paradas',
      icon: StopCircle,
      type: 'sgpa' as const,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'SRP',
      description: 'Sistema de Registro da Produção',
      icon: ClipboardList,
      type: 'srp' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'SGP',
      description: 'Sistema de Gestão da Produção',
      icon: Activity,
      type: 'sgp' as const,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex flex-col justify-center items-center animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">
            Carregando projeto de produção...
          </p>
        </div>
      </div>
    )
  }

  if (!productionProject) {
    return (
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="rounded-lg border border-dashed bg-muted/10 px-6 py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">
            Projeto fixo de Produção não encontrado
          </p>
          <p className="mt-1 text-sm">
            Sincronize o banco para recriar o projeto base de Produção.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Sistema de Gestão Integrada da Produção
        </h1>
        <p className="text-muted-foreground mt-2">
          Projeto ativo:{' '}
          <span className="font-medium text-foreground">
            {productionProject.name}
          </span>
          . Escolha o módulo que deseja acessar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Card
            key={module.title}
            className="group cursor-pointer border-2 transition-all hover:border-primary/40 hover:shadow-md"
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
