import { useCallback, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { srtService } from '@/services/srtService'
import { SrtMobileTank } from '@/lib/types'
import { TankList } from '@/components/srt/TankList'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'

export default function MobileTanks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currentProject, isLoadingProjects } = useProject()
  const [tanks, setTanks] = useState<SrtMobileTank[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTank, setEditingTank] = useState<SrtMobileTank | null>(null)

  // Form State
  const [tankName, setTankName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [unit, setUnit] = useState('m3')
  const [notes, setNotes] = useState('')
  const fetchTanks = useCallback(async () => {
    if (!currentProject) {
      setTanks([])
      return
    }

    setLoading(true)
    try {
      const data = await srtService.getMobileTanks(false, currentProject.id)
      setTanks(data)
    } catch {
      toast.error('Erro ao carregar tanques')
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
      return
    }
    void fetchTanks()
  }, [currentProject, fetchTanks, isLoadingProjects, navigate])

  const handleOpenCreate = () => {
    setEditingTank(null)
    setTankName('')
    setCapacity('')
    setUnit('m3')
    setNotes('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (tank: SrtMobileTank) => {
    setEditingTank(tank)
    setTankName(tank.tankName)
    setCapacity(tank.capacity.toString())
    setUnit(tank.unit)
    setNotes(tank.notes || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    try {
      if (editingTank) {
        await srtService.updateMobileTank(
          editingTank.id,
          {
            tankName,
            capacity: Number(capacity),
            unit,
            notes,
          },
          user.id,
        )
        toast.success('Tanque atualizado!')
      } else {
        if (!currentProject) {
          toast.error('Selecione um projeto antes de criar o tanque.')
          return
        }
        await srtService.createMobileTank(
          {
            projectId: currentProject.id,
            tankName,
            capacity: Number(capacity),
            unit,
            notes,
            active: true,
          },
          user.id,
        )
        toast.success('Tanque criado!')
      }
      setDialogOpen(false)
      fetchTanks()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  const handleToggleActive = async (tank: SrtMobileTank) => {
    if (!user) return
    if (!confirm(`Deseja ${tank.active ? 'desativar' : 'ativar'} este tanque?`))
      return
    try {
      await srtService.updateMobileTank(
        tank.id,
        { active: !tank.active },
        user.id,
      )
      fetchTanks()
      toast.success('Status atualizado.')
    } catch {
      toast.error('Erro ao atualizar status.')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tanques Móveis</h1>
          <p className="text-muted-foreground">
            Gerencie a frota de tanques para testes.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Tanque
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <TankList
          tanks={tanks}
          onEdit={handleOpenEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTank ? 'Editar Tanque' : 'Novo Tanque'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome / Identificação</Label>
              <Input
                value={tankName}
                onChange={(e) => setTankName(e.target.value)}
                placeholder="Ex: TM-05"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="m3"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!tankName}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
