import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { alertService } from '@/services/alertService'
import { AlertRule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AlertRuleList } from '@/components/alerts/AlertRuleList'
import { AlertRuleDialog } from '@/components/alerts/AlertRuleDialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'

export default function Alerts() {
  const { projectId } = useParams()
  const { currentProject, setCurrentProject, projects } = useProject()
  const { user } = useAuth()
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)

  // Initialize project
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const fetchRules = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const data = await alertService.getRules(currentProject.id)
      setRules(data)
    } catch (error: any) {
      toast.error('Erro ao carregar alertas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreate = () => {
    setEditingRule(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    setRuleToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return
    try {
      if (user) {
        await alertService.deleteRule(ruleToDelete, user.id)
        toast.success('Regra excluída com sucesso.')
        setRuleToDelete(null)
        await fetchRules()
      }
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    }
  }

  const handleSave = async (ruleData: any) => {
    if (!currentProject) return
    try {
      if (!user) return

      if (editingRule) {
        await alertService.updateRule(editingRule.id, ruleData, user.id)
        toast.success('Regra atualizada com sucesso.')
      } else {
        await alertService.createRule(
          { ...ruleData, projectId: currentProject.id },
          user.id,
        )
        toast.success('Regra criada com sucesso.')
      }
      setIsDialogOpen(false)
      fetchRules()
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerenciamento de Alertas
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure regras para monitorar métricas de produção e receber
            notificações.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Regra
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas</CardTitle>
          <CardDescription>
            Alertas configurados para o projeto {currentProject?.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertRuleList
            rules={rules}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <AlertRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={editingRule}
        onSave={handleSave}
      />
      <ConfirmActionDialog
        open={!!ruleToDelete}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
        title="Excluir regra de alerta?"
        description="A regra deixará de monitorar a métrica configurada."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
