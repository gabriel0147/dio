import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Box, Search, Wrench } from 'lucide-react'
import { sbpService } from '@/services/sbpService'
import { smtService } from '@/services/smtService'
import { SbpAsset, SmtMaintenanceLog } from '@/lib/types'
import { AssetForm } from '@/components/sbp/AssetForm'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'

export default function SbpDashboard() {
  const { projectId } = useParams()
  const { currentProject, setCurrentProject, projects } = useProject()
  const [assets, setAssets] = useState<SbpAsset[]>([])
  // Map of sbpAssetId -> smtEquipmentId
  const [linkedEquipment, setLinkedEquipment] = useState<
    Record<string, string>
  >({})
  const [_loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<SbpAsset | null>(null)

  // Maintenance History Dialog
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedAssetHistory, setSelectedAssetHistory] = useState<
    SmtMaintenanceLog[]
  >([])
  const [selectedAssetName, setSelectedAssetName] = useState('')

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
      return
    }

    if (!projectId && projects.length > 0) {
      const maintenanceProject = projects.find(
        (p) => p.projectScope === 'maintenance',
      )
      if (maintenanceProject && maintenanceProject.id !== currentProject?.id) {
        setCurrentProject(maintenanceProject)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [assetsData, equipmentData] = await Promise.all([
        sbpService.getAssets(currentProject.id),
        smtService.getEquipment(currentProject.id),
      ])
      setAssets(assetsData)

      // Map SBP Asset ID to SMT Equipment ID
      const linkMap: Record<string, string> = {}
      equipmentData.forEach((eq) => {
        if (eq.sbpAssetId) {
          linkMap[eq.sbpAssetId] = eq.id
        }
      })
      setLinkedEquipment(linkMap)
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAssets = assets.filter(
    (a) =>
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.assetNumber.includes(search),
  )

  const totalValue = filteredAssets.reduce(
    (acc, curr) => acc + (curr.acquisitionValue || 0),
    0,
  )

  const handleEdit = (a: SbpAsset) => {
    setEditingAsset(a)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingAsset(null)
    setIsDialogOpen(true)
  }

  const handleViewMaintenance = async (
    asset: SbpAsset,
    equipmentId: string,
  ) => {
    if (!currentProject) return
    try {
      const logs = await smtService.getMaintenanceLogs(
        currentProject.id,
        equipmentId,
      )
      setSelectedAssetHistory(logs)
      setSelectedAssetName(asset.description)
      setHistoryOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  if (!currentProject)
    return <div className="p-8 text-center">Carregando...</div>

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 flex items-center gap-2">
            <Box className="h-8 w-8" />
            Bens Patrimoniais (SBP)
          </h1>
          <p className="text-muted-foreground">
            Controle de ativos fixos e patrimônio.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-sm text-muted-foreground">Total de Ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700 flex items-center">
              R${' '}
              {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-green-600">Valor de Aquisição Total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Listagem de Ativos</CardTitle>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ativo..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo Ativo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Ativo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data Aquisição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono font-medium">
                    {asset.assetNumber}
                  </TableCell>
                  <TableCell>{asset.description}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>
                    {asset.acquisitionDate
                      ? format(parseISO(asset.acquisitionDate), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.acquisitionValue
                      ? `R$ ${asset.acquisitionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        asset.situation === 'active' ||
                        asset.situation === 'in_use'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {asset.situation === 'active'
                        ? 'Ativo'
                        : asset.situation === 'in_use'
                          ? 'Em Uso'
                          : asset.situation === 'idle'
                            ? 'Ocioso'
                            : 'Baixado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {linkedEquipment[asset.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleViewMaintenance(
                              asset,
                              linkedEquipment[asset.id],
                            )
                          }
                          title="Ver Histórico de Manutenção"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(asset)}
                      >
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssetForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={currentProject.id}
        asset={editingAsset}
        onSuccess={loadData}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Histórico de Manutenção - {selectedAssetName}
            </DialogTitle>
            <DialogDescription>
              Histórico de serviços vinculados ao ativo selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {selectedAssetHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum registro de manutenção encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAssetHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.startAt
                          ? format(parseISO(log.startAt), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.type === 'corrective'
                            ? 'Corretiva'
                            : 'Preventiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.failureDescription}</TableCell>
                      <TableCell>
                        {log.status === 'open' ? (
                          <Badge className="bg-red-500">Aberto</Badge>
                        ) : log.status === 'in_progress' ? (
                          <Badge className="bg-blue-500">Em Execução</Badge>
                        ) : (
                          <Badge className="bg-green-500">Concluído</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
