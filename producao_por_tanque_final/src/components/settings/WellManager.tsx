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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function WellManager() {
  const { wells, productionFields, createWell, deleteWell } = useProject()
  const [newName, setNewName] = useState('')
  const [newShortName, setNewShortName] = useState('')
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim() || !selectedFieldId) return
    setIsSubmitting(true)
    try {
      await createWell(
        newName.trim(),
        selectedFieldId,
        newShortName.trim() || undefined,
      )
      setNewName('')
      setNewShortName('')
    } catch {
      // A mensagem amigável é exibida pelo contexto do projeto.
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este poço?')) {
      await deleteWell(id)
    }
  }

  const getFieldName = (id: string) => {
    return productionFields.find((f) => f.id === id)?.name || 'Desconhecido'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Poços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <div className="w-full md:w-1/3 space-y-2">
            <Input
              placeholder="Nome do poço (Full ID)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Input
              placeholder="Nome Curto (Opcional)"
              value={newShortName}
              onChange={(e) => setNewShortName(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o campo" />
              </SelectTrigger>
              <SelectContent>
                {productionFields.map((pf) => (
                  <SelectItem key={pf.id} value={pf.id}>
                    {pf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            disabled={isSubmitting || !newName || !selectedFieldId}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poço (Full ID)</TableHead>
                <TableHead>Nome (Short)</TableHead>
                <TableHead>Campo de Produção</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wells.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Nenhum poço cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                wells.map((well) => (
                  <TableRow key={well.id}>
                    <TableCell>{well.name}</TableCell>
                    <TableCell>{well.shortName || '-'}</TableCell>
                    <TableCell>
                      {getFieldName(well.productionFieldId)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(well.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
