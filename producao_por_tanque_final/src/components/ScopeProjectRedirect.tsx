import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { ProjectScope } from '@/lib/types'

interface ScopeProjectRedirectProps {
  scope: ProjectScope
  targetRouteResolver: (projectId: string) => string
}

export default function ScopeProjectRedirect({
  scope,
  targetRouteResolver,
}: ScopeProjectRedirectProps) {
  const navigate = useNavigate()
  const { projects, setCurrentProject, isLoadingProjects } = useProject()

  useEffect(() => {
    if (isLoadingProjects) return

    const project = projects.find((item) => item.projectScope === scope)
    if (!project) return

    setCurrentProject(project)
    navigate(targetRouteResolver(project.id), { replace: true })
  }, [isLoadingProjects, navigate, projects, scope, setCurrentProject, targetRouteResolver])

  if (isLoadingProjects) {
    return (
      <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex items-center justify-center">
        <p className="text-muted-foreground">Carregando projeto...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">
          Projeto fixo de {scope === 'production' ? 'Produção' : 'Manutenção'} não encontrado
        </h1>
        <p className="text-sm text-muted-foreground">
          Recarregue a página ou sincronize o banco para recriar os projetos base.
        </p>
      </div>
    </div>
  )
}
