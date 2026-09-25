import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TestForm } from '@/components/srt/TestForm'
import { useProject } from '@/context/ProjectContext'
import { srtService } from '@/services/srtService'
import { SrtTankSession, SrtWellTest } from '@/lib/types'
import { toast } from 'sonner'

export default function TestEntry() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { testId } = useParams()
  const sessionIdParam = searchParams.get('sessionId')
  const { wells, currentProject, isLoadingProjects } = useProject()
  const [sessions, setSessions] = useState<SrtTankSession[]>([])
  const [initialData, setInitialData] = useState<SrtWellTest | null>(null)
  const [loading, setLoading] = useState(false)

  const allowedWellIds = useMemo(
    () => new Set(wells.map((well) => well.id)),
    [wells],
  )

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  useEffect(() => {
    if (isLoadingProjects || !currentProject) return

    const loadSessions = async () => {
      try {
        const includeClosed = !!testId
        const data = await srtService.getSessions(
          !includeClosed,
          currentProject.id,
        )
        setSessions(data)
      } catch (error) {
        console.error('Failed to load sessions for test entry', error)
        toast.error('Erro ao carregar planejamentos disponíveis.')
      }
    }

    void loadSessions()
  }, [allowedWellIds, currentProject, isLoadingProjects, testId])

  useEffect(() => {
    if (!testId) return

    setLoading(true)
    srtService
      .getTestById(testId)
      .then((data) => {
        if (data && (!currentProject || allowedWellIds.has(data.wellId))) {
          setInitialData(data)
          return
        }

        toast.error('Teste não encontrado.')
      })
      .catch(() => {
        toast.error('Erro ao carregar detalhes do teste.')
      })
      .finally(() => setLoading(false))
  }, [allowedWellIds, currentProject, testId])

  if (loading) {
    return (
      <div className="container mx-auto p-6 text-center">Carregando...</div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">
          {testId ? 'Editar Teste' : 'Lançamento de Teste'}
        </h1>
        <p className="text-muted-foreground">
          {testId
            ? 'Atualização dos dados do teste e recálculo de volumes.'
            : 'Registro de apropriação e potenciais com detalhamento de fluidos.'}
        </p>
      </div>

      <TestForm
        wells={wells}
        openSessions={sessions}
        preselectedSessionId={sessionIdParam}
        initialData={initialData}
      />
    </div>
  )
}
