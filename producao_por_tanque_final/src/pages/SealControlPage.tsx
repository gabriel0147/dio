import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { SealSheet } from '@/components/sheets/SealSheet'
import { useProject } from '@/context/ProjectContext'

export default function SealControlPage() {
  const { projectId } = useParams()
  const { currentProject, projects, setCurrentProject } = useProject()

  useEffect(() => {
    if (!projectId || currentProject?.id === projectId) return
    const routeProject = projects.find((project) => project.id === projectId)
    if (routeProject) setCurrentProject(routeProject)
  }, [currentProject?.id, projectId, projects, setCurrentProject])

  if (!currentProject || currentProject.id !== projectId) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        <span className="sr-only">Carregando controle de lacres...</span>
      </div>
    )
  }

  return <SealSheet />
}
