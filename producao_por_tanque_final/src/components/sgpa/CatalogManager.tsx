import { useState, useEffect } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { sgpaService } from '@/services/sgpaService'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  SgpaAsset,
  SgpaCause,
  SgpaCauseCategory,
  SgpaAssetType,
} from '@/lib/types'

const CATEGORIES: SgpaCauseCategory[] = [
  'Operacional',
  'Mecânica',
  'Elétrica',
  'Processo',
  'Externa',
  'Segurança',
  'Medição',
]

const ASSET_TYPES: SgpaAssetType[] = [
  'BCP',
  'Motor',
  'Inversor',
  'BM',
  'Coluna',
  'Válvula',
  'Linha',
  'Instrumentação',
  'Outro',
]

export function CatalogManager() {
  const { user } = useAuth()
  const { wells } = useProject()
  const [causes, setCauses] = useState<SgpaCause[]>([])
  const [assets, setAssets] = useState<SgpaAsset[]>([])
  const [loading, setLoading] = useState(true)

  // Cause Dialog State
  const [causeDialogOpen, setCauseDialogOpen] = useState(false)
  const [editingCause, setEditingCause] = useState<SgpaCause | null>(null)
  const [causeForm, setCauseForm] = useState<Partial<SgpaCause>>({
    category: 'Operacional',
    causeName: '',
    description: '',
    isActive: true,
  })

  // Asset Dialog State
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<SgpaAsset | null>(null)
  const [assetForm, setAssetForm] = useState<Partial<SgpaAsset>>({
    assetType: 'BCP',
    tag: '',
    wellId: '',
    active: true,
  })
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'cause' | 'asset'
    id: string
    label: string
  } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([
        sgpaService.getCauses(false),
        sgpaService.getAssets(undefined, false),
      ])
      setCauses(c)
      setAssets(a)
    } catch {
      toast.error('Erro ao carregar catálogos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cause Handlers
  const handleSaveCause = async () => {
    if (!user || !causeForm.causeName) return
    try {
      if (editingCause) {
        await sgpaService.updateCause(editingCause.id, causeForm, user.id)
        toast.success('Causa atualizada.')
      } else {
        await sgpaService.createCause(causeForm, user.id)
        toast.success('Causa criada.')
      }
      setCauseDialogOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteCause = async (id: string) => {
    if (!user) return
    try {
      await sgpaService.deleteCause(id, user.id)
      toast.success('Causa excluída.')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Asset Handlers
  const handleSaveAsset = async () => {
    if (!user || !assetForm.tag || !assetForm.wellId) return
    try {
      if (editingAsset) {
        await sgpaService.updateAsset(editingAsset.id, assetForm, user.id)
        toast.success('Ativo atualizado.')
      } else {
        await sgpaService.createAsset(assetForm, user.id)
        toast.success('Ativo criado.')
      }
      setAssetDialogOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!user) return
    try {
      await sgpaService.deleteAsset(id, user.id)
      toast.success('Ativo excluído.')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.type === 'cause') {
      await handleDeleteCause(pendingDelete.id)
    } else {
      await handleDeleteAsset(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6">
      <Tabs defaultValue="causes">
        <TabsList>
          <TabsTrigger value="causes">Causas de Parada</TabsTrigger>
          <TabsTrigger value="assets">Cadastro de Ativos</TabsTrigger>
        </TabsList>

        <TabsContent value="causes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Catálogo de Causas</h3>
            <Button
              onClick={() => {
                setEditingCause(null)
                setCauseForm({
                  category: 'Operacional',
                  causeName: '',
                  description: '',
                  isActive: true,
                })
                setCauseDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova Causa
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {causes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.category}</TableCell>
                    <TableCell className="font-medium">{c.causeName}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>{c.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCause(c)
                            setCauseForm(c)
                            setCauseDialogOpen(true)
                          }}
                          aria-label={`Editar causa ${c.causeName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPendingDelete({
                              type: 'cause',
                              id: c.id,
                              label: c.causeName,
                            })
                          }
                          aria-label={`Excluir causa ${c.causeName}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Cadastro de Ativos (Equipamentos)
            </h3>
            <Button
              onClick={() => {
                setEditingAsset(null)
                setAssetForm({
                  assetType: 'BCP',
                  tag: '',
                  wellId: '',
                  active: true,
                })
                setAssetDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Ativo
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Poço Associado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tag}</TableCell>
                    <TableCell>{a.assetType}</TableCell>
                    <TableCell>{a.wellName || 'N/A'}</TableCell>
                    <TableCell>{a.active ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAsset(a)
                            setAssetForm(a)
                            setAssetDialogOpen(true)
                          }}
                          aria-label={`Editar ativo ${a.tag}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPendingDelete({
                              type: 'asset',
                              id: a.id,
                              label: a.tag,
                            })
                          }
                          aria-label={`Excluir ativo ${a.tag}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Cause Dialog */}
      <Dialog open={causeDialogOpen} onOpenChange={setCauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCause ? 'Editar Causa' : 'Nova Causa'}
            </DialogTitle>
            <DialogDescription>
              Cadastre a causa que será usada na classificação dos eventos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cause-category">Categoria</Label>
              <Select
                value={causeForm.category}
                onValueChange={(v) =>
                  setCauseForm({ ...causeForm, category: v as any })
                }
              >
                <SelectTrigger id="cause-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cause-name">Nome da Causa</Label>
              <Input
                id="cause-name"
                value={causeForm.causeName}
                onChange={(e) =>
                  setCauseForm({ ...causeForm, causeName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cause-description">Descrição</Label>
              <Input
                id="cause-description"
                value={causeForm.description}
                onChange={(e) =>
                  setCauseForm({ ...causeForm, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="cause-active"
                checked={causeForm.isActive}
                onCheckedChange={(c) =>
                  setCauseForm({ ...causeForm, isActive: c })
                }
              />
              <Label htmlFor="cause-active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCause} disabled={!causeForm.causeName}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Dialog */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Editar Ativo' : 'Novo Ativo'}
            </DialogTitle>
            <DialogDescription>
              Vincule o equipamento a um poço para utilizá-lo nos eventos SGPA.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="asset-type">Tipo</Label>
              <Select
                value={assetForm.assetType}
                onValueChange={(v) =>
                  setAssetForm({ ...assetForm, assetType: v as any })
                }
              >
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-tag">Tag (Identificação)</Label>
              <Input
                id="asset-tag"
                value={assetForm.tag}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, tag: e.target.value })
                }
                placeholder="Ex: BCP-01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-well">Poço Associado</Label>
              <Select
                value={assetForm.wellId}
                onValueChange={(v) => setAssetForm({ ...assetForm, wellId: v })}
              >
                <SelectTrigger id="asset-well">
                  <SelectValue placeholder="Selecione o poço" />
                </SelectTrigger>
                <SelectContent>
                  {wells.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="asset-active"
                checked={assetForm.active}
                onCheckedChange={(c) =>
                  setAssetForm({ ...assetForm, active: c })
                }
              />
              <Label htmlFor="asset-active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveAsset}
              disabled={!assetForm.tag || !assetForm.wellId}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.label} será removido do catálogo. A exclusão será
              bloqueada caso o cadastro esteja em uso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
