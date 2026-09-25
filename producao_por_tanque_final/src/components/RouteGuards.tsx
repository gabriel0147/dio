import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import type { ProjectScope, UserRole } from '@/lib/types'

const LoadingRoute = () => (
  <div className="flex min-h-48 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
)

export function RoleRoute({ allowed }: { allowed: UserRole[] }) {
  const { role, loading } = useAuth()

  if (loading) return <LoadingRoute />
  if (!role || !allowed.includes(role)) return <Navigate to="/" replace />

  return <Outlet />
}

export function ProjectAccessRoute() {
  const { projectId } = useParams()
  const { projects, isLoadingProjects } = useProject()

  if (isLoadingProjects) return <LoadingRoute />
  if (!projectId || !projects.some((project) => project.id === projectId)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function ScopeProjectRoute({ scope }: { scope: ProjectScope }) {
  const { projects, currentProject, setCurrentProject, isLoadingProjects } =
    useProject()
  const scopedProject = projects.find(
    (project) => project.projectScope === scope,
  )

  useEffect(() => {
    if (scopedProject && currentProject?.id !== scopedProject.id) {
      setCurrentProject(scopedProject)
    }
  }, [currentProject?.id, scopedProject, setCurrentProject])

  if (
    isLoadingProjects ||
    (scopedProject && currentProject?.id !== scopedProject.id)
  ) {
    return <LoadingRoute />
  }

  if (!scopedProject) {
    return (
      <Navigate
        to={scope === 'production' ? '/producao-nbs' : '/manutencao-nbs'}
        replace
      />
    )
  }

  return <Outlet />
}
