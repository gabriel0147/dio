import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SessionList } from '@/components/srt/SessionList'
import { SessionDetailsDialog } from '@/components/srt/SessionDetailsDialog'
import { NewSessionDialog } from '@/components/srt/NewSessionDialog'
import { srtService } from '@/services/srtService'
import { SrtTankSession } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function TankSessions() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentProject, isLoadingProjects } = useProject()
  const [sessions, setSessions] = useState<SrtTankSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  )
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [sessionToClose, setSessionToClose] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<SrtTankSession | null>(
    null,
  )
  const [sessionToDelete, setSessionToDelete] =
    useState<SrtTankSession | null>(null)

  const loadSessions = useCallback(async () => {
    if (!currentProject) {
      setSessions([])
      return
    }

    try {
      setLoading(true)
      const data = await srtService.getSessions(false, currentProject.id)
      const currentUserName =
        user?.user_metadata?.full_name || user?.email || undefined
      const sessionsWithResponsible = await Promise.all(
        data.map(async (session) => {
          if (!session.endAt && !session.responsibleUserId && user?.id) {
            try {
              await srtService.assignSessionResponsible(session.id, user.id)
            } catch (error) {
              console.warn('Failed to assign session responsible', error)
            }

            return {
              ...session,
              responsibleUserId: user.id,
              responsibleUserName: currentUserName || 'Usuário atual',
            }
          }

          if (
            session.responsibleUserId &&
            !session.responsibleUserName &&
            session.responsibleUserId === user?.id
          ) {
            return {
              ...session,
              responsibleUserName: currentUserName || 'Usuário atual',
            }
          }

          return session
        }),
      )

      setSessions(sortSessionsByOpenStatus(sessionsWithResponsible))
    } catch (error) {
      console.error('Failed to load sessions', error)
      toast.error('Erro ao carregar planejamentos de teste.')
    } finally {
      setLoading(false)
    }
  }, [currentProject, user])

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
      return
    }

    if (isLoadingProjects || !currentProject) return
    void loadSessions()
  }, [currentProject, isLoadingProjects, loadSessions, navigate])

  const handleCloseSession = async (sessionId: string) => {
    try {
      const tests = await srtService.getTests(sessionId)
      if (tests.length === 0) {
        toast.error(
          'Registre ao menos uma medição antes de concluir o planejamento.',
        )
        return
      }
      setSessionToClose(sessionId)
    } catch {
      toast.error('Não foi possível verificar as medições do planejamento.')
    }
  }

  const handleConfirmCloseSession = async () => {
    if (!user || !sessionToClose) return
    try {
      await srtService.closeSession(
        sessionToClose,
        user.id,
        undefined,
        new Date().toISOString(),
      )
      toast.success('Planejamento concluido com sucesso!')
      setSessionToClose(null)
      void loadSessions()
    } catch (error) {
      console.error('Error closing session:', error)
      toast.error('Erro ao concluir planejamento.')
    }
  }

  const handleViewSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setDetailsOpen(true)
  }

  const handleEditSession = (session: SrtTankSession) => {
    setEditingSession(session)
    setNewSessionOpen(true)
  }

  const handleConfirmDeleteSession = async () => {
    if (!user || !sessionToDelete) return

    try {
      await srtService.deleteSession(sessionToDelete.id, user.id)
      toast.success('Planejamento excluido com sucesso!')
      setSessionToDelete(null)
      void loadSessions()
    } catch (error: any) {
      console.error('Error deleting session:', error)
      toast.error('Erro ao excluir planejamento: ' + error.message)
    }
  }

  const handleSessionCreated = (session: SrtTankSession) => {
    setNewSessionOpen(false)
    setEditingSession(null)
    setSessions((prev) => {
      if (prev.some((existing) => existing.id === session.id)) {
        return sortSessionsByOpenStatus(
          prev.map((existing) =>
            existing.id === session.id ? session : existing,
          ),
        )
      }

      return sortSessionsByOpenStatus([session, ...prev])
    })
    void loadSessions()
  }

  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId,
  )
  const openSessionsCount = sessions.filter((session) => !session.endAt).length

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Planejamento de Testes
          </h2>
          <p className="text-muted-foreground">
            Gerencie as sessoes de teste de poco e visualize o historico de
            medicoes.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSession(null)
            setNewSessionOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Planejamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Planejamentos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openSessionsCount}</div>
            <p className="text-xs text-muted-foreground">
              Sessoes em andamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Planejamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">Historico completo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Planejamentos</CardTitle>
              <CardDescription>
                Visualize e gerencie os planejamentos de teste por tanque.
              </CardDescription>
            </div>
            {loading && (
              <Badge variant="outline" className="animate-pulse">
                Carregando...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={sessions}
            onCloseSession={handleCloseSession}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
            onDeleteSession={setSessionToDelete}
          />
        </CardContent>
      </Card>

      <SessionDetailsDialog
        sessionId={selectedSessionId}
        session={selectedSession}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <NewSessionDialog
        open={newSessionOpen}
        onOpenChange={(open) => {
          setNewSessionOpen(open)
          if (!open) setEditingSession(null)
        }}
        onSuccess={handleSessionCreated}
        initialSession={editingSession}
      />

      <AlertDialog
        open={!!sessionToClose}
        onOpenChange={(open) => !open && setSessionToClose(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O planejamento será marcado como concluído e deixará de aceitar
              novas medições.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCloseSession}>
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o planejamento selecionado e os testes
              vinculados a ele. Essa operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSession}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const sortSessionsByOpenStatus = (sessions: SrtTankSession[]) =>
  [...sessions].sort((a, b) => {
    const aOpen = !a.endAt
    const bOpen = !b.endAt

    if (aOpen !== bOpen) {
      return aOpen ? -1 : 1
    }

    return new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  })
