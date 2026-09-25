import { useState } from 'react'
import { useProject } from '@/context/ProjectContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Pencil, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function TransferCategoryManager() {
  const {
    transferDestinationCategories,
    createTransferDestinationCategory,
    updateTransferDestinationCategory,
    deleteTransferDestinationCategory,
    currentProject,
    projects,
  } = useProject()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('global')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sort alphabetically
  const sortedCategories = [...transferDestinationCategories].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setName('')
    // Default to current project if available, otherwise 'global'
    setSelectedProjectId(currentProject ? currentProject.id : 'global')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (category: any) => {
    setEditingCategory(category)
    setName(category.name)
    // Categories can't change project scope on edit easily in this UI, but we can display it
    // Or we just allow name editing. The requirement didn't specify moving categories.
    // For simplicity, we only allow editing name.
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    // Check for duplicates
    // Determine effective project ID for checking (null/undefined for global)
    const targetProjectId =
      editingCategory?.projectId ??
      (selectedProjectId === 'global' ? null : selectedProjectId)

    const existing = transferDestinationCategories.find(
      (c) =>
        c.name.toLowerCase() === trimmedName.toLowerCase() &&
        c.id !== editingCategory?.id &&
        c.projectId === targetProjectId,
    )

    if (existing) {
      toast.error('Já existe uma categoria com este nome neste escopo.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await updateTransferDestinationCategory(editingCategory.id, trimmedName)
      } else {
        await createTransferDestinationCategory(
          trimmedName,
          targetProjectId || null,
        )
      }
      setIsDialogOpen(false)
      setName('')
      setEditingCategory(null)
    } catch {
      // Backend validation handled
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await deleteTransferDestinationCategory(id)
      } catch {
        // Error handled in context
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Gerenciar Categorias de Destino de Transferência</CardTitle>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria
        </Button>
      </CardHeader>
      <CardContent className="mt-4">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sortedCategories.map((category) => {
                  const isGlobal = !category.projectId
                  // Lock if we are in a specific project context AND the category is global (inherited)
                  // BUT user story implies management "regardless of current project selection".
                  // If I have permission to edit Globals (e.g. Admin), I should be able to edit.
                  // For now, let's allow edit if user has access.
                  const projectName = !isGlobal
                    ? projects.find((p) => p.id === category.projectId)?.name ||
                      'Projeto'
                    : null

                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        {isGlobal ? (
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="h-3 w-3" /> Global
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 truncate max-w-[200px]"
                            title={projectName || ''}
                          >
                            {projectName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(category)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id)}
                            className="text-destructive hover:text-destructive/90"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Atualize o nome da categoria.'
                : 'Crie uma nova categoria de destino. Selecione um projeto ou deixe como Global.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tratamento"
              />
            </div>

            {!editingCategory && (
              <div className="grid gap-2">
                <Label htmlFor="project">Projeto (Opcional)</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3 w-3" /> Global (Todos os Projetos)
                      </span>
                    </SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione "Global" para disponibilizar esta categoria para
                  todos os projetos.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
