import { useCallback, useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SessionDetailsDialog } from '@/components/srt/SessionDetailsDialog'
import { SessionList } from '@/components/srt/SessionList'
import { useProject } from '@/context/ProjectContext'
import { SrtTankSession } from '@/lib/types'
import { srtService } from '@/services/srtService'

export default function TestHistory() {
  const navigate = useNavigate()
  const { currentProject, isLoadingProjects } = useProject()
  const [sessions, setSessions] = useState<SrtTankSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  )
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  const loadCompletedSessions = useCallback(async () => {
    if (isLoadingProjects || !currentProject) return

    setIsLoading(true)
    try {
      const data = await srtService.getSessions(false, currentProject.id)
      setSessions(data.filter((session) => !!session.endAt))
    } catch (error) {
      console.error('Failed to load completed test sessions', error)
      toast.error('Erro ao carregar histórico de planejamentos concluídos.')
    } finally {
      setIsLoading(false)
    }
  }, [currentProject, isLoadingProjects])

  useEffect(() => {
    void loadCompletedSessions()
  }, [loadCompletedSessions])

  const handleViewSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setDetailsOpen(true)
  }

  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId,
  )

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Histórico de Lançamento de Teste
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Lista de planejamentos de teste concluídos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planejamentos Concluídos</CardTitle>
              <CardDescription>
                Visualize os planejamentos de teste finalizados por tanque.
              </CardDescription>
            </div>
            {isLoading && (
              <Badge variant="outline" className="animate-pulse">
                Carregando...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={sessions}
            onViewSession={handleViewSession}
          />
        </CardContent>
      </Card>

      <SessionDetailsDialog
        sessionId={selectedSessionId}
        session={selectedSession}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}
