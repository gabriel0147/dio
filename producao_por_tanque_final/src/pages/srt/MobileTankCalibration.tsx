import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { srtService } from '@/services/srtService'
import { SrtCalibrationRow, SrtMobileTank } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function MobileTankCalibration() {
  const { tankId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tank, setTank] = useState<SrtMobileTank | null>(null)
  const [data, setData] = useState<SrtCalibrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 100

  // Add/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<SrtCalibrationRow | null>(null)
  const [heightMm, setHeightMm] = useState('')
  const [volumeM3, setVolumeM3] = useState('')
  // FCV is no longer managed by user, defaults to 1.0

  // Import Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>(
    'overwrite',
  )

  useEffect(() => {
    if (!tankId) return
    const load = async () => {
      setLoading(true)
      try {
        const [t, d] = await Promise.all([
          srtService.getMobileTankById(tankId),
          srtService.getCalibration(tankId),
        ])
        setTank(t)
        setData(d)
        setCurrentPage(1) // Reset to first page on load
      } catch (e: any) {
        toast.error('Erro ao carregar dados: ' + e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tankId])

  const handleOpenAdd = () => {
    setEditingRow(null)
    setHeightMm('')
    setVolumeM3('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (row: SrtCalibrationRow) => {
    setEditingRow(row)
    setHeightMm(row.heightMm.toString())
    setVolumeM3(row.volumeM3.toString())
    setDialogOpen(true)
  }

  const handleSaveRow = async () => {
    if (!user || !tankId) return
    const h = Number(heightMm)
    const v = Number(volumeM3)
    const f = 1.0 // Default FCV

    if (h < 0 || v < 0) {
      toast.error('Altura e Volume devem ser positivos.')
      return
    }

    setIsSaving(true)
    try {
      if (editingRow) {
        await srtService.updateCalibrationRow(
          editingRow.id,
          { heightMm: h, volumeM3: v, fcv: f },
          user.id,
        )
        toast.success('Ponto atualizado.')
      } else {
        await srtService.saveCalibrationRow(
          tankId,
          { heightMm: h, volumeM3: v, fcv: f },
          user.id,
        )
        toast.success('Ponto adicionado.')
      }
      const newData = await srtService.getCalibration(tankId)
      setData(newData)
      setDialogOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRow = async (row: SrtCalibrationRow) => {
    if (!user || !confirm('Tem certeza que deseja excluir este ponto?')) return
    try {
      await srtService.deleteCalibrationRow(row.id, user.id)
      setData((prev) => prev.filter((r) => r.id !== row.id))
      toast.success('Ponto excluído.')
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    }
  }

  const handleClearTable = async () => {
    if (!user || !tankId) return
    if (
      !confirm(
        'ATENÇÃO: Isso excluirá TODOS os dados de calibração deste tanque. Deseja continuar?',
      )
    )
      return
    try {
      await srtService.clearCalibration(tankId, user.id)
      setData([])
      setCurrentPage(1)
      toast.success('Tabela limpa.')
    } catch (e: any) {
      toast.error('Erro ao limpar tabela: ' + e.message)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportDialogOpen(true)
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!user || !tankId || !selectedFile) return
    setIsImporting(true)
    try {
      const count = await srtService.importCalibration(
        tankId,
        selectedFile,
        importMode,
        user.id,
      )
      toast.success(`${count} registros importados com sucesso!`)
      const newData = await srtService.getCalibration(tankId)
      setData(newData)
      setCurrentPage(1)
      setImportDialogOpen(false)
      setSelectedFile(null)
    } catch (e: any) {
      toast.error('Erro na importação: ' + e.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = () => {
    if (data.length === 0) {
      toast.error('Não há dados para exportar.')
      return
    }
    const headers = ['Height (mm)', 'Volume (m3)']
    const csvContent = [
      headers.join(','),
      ...data.map((r) => `${r.heightMm},${r.volumeM3}`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `calibracao_${tank?.tankName}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Calculate Paginated Data
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tank) {
    return (
      <div className="p-8 text-center">
        <p>Tanque não encontrado.</p>
        <Button onClick={() => navigate('/srt/tanks')} variant="link">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/srt/tanks')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Tabela de Arqueação - {tank.tankName}
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento simplificado de pontos de calibração.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          {data.length > 0 && (
            <Button variant="destructive" onClick={handleClearTable}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpar Tudo
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 border rounded-md bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="bg-muted/50 border-b">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2 pl-8">Altura (mm)</TableHead>
                <TableHead className="w-1/2">Volume (m³)</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        <ScrollArea className="flex-1">
          <Table>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 opacity-50" />
                      <p>Nenhum ponto de calibração.</p>
                      <p className="text-sm">
                        Adicione manualmente ou importe um arquivo com Altura e
                        Volume.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleOpenEdit(row)}
                  >
                    <TableCell className="w-1/2 pl-8 font-medium">
                      {row.heightMm}
                    </TableCell>
                    <TableCell className="w-1/2">{row.volumeM3}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(row)}
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-gray-50 p-2 border rounded-md">
          <div className="text-sm text-muted-foreground px-2">
            Mostrando{' '}
            {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, data.length)} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} de{' '}
            {data.length} registros
          </div>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {/* Logic for displaying page numbers smartly */}
              {totalPages <= 7 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={() => handlePageChange(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )
              ) : (
                <>
                  {/* First Page */}
                  <PaginationItem>
                    <PaginationLink
                      isActive={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>

                  {/* Ellipsis if needed */}
                  {currentPage > 4 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Middle Pages */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page > 1 &&
                        page < totalPages &&
                        Math.abs(page - currentPage) <= 1,
                    )
                    .map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => handlePageChange(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                  {/* Ellipsis if needed */}
                  {currentPage < totalPages - 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Last Page */}
                  <PaginationItem>
                    <PaginationLink
                      isActive={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Button className="w-full" onClick={handleOpenAdd}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Ponto
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRow ? 'Editar Ponto' : 'Novo Ponto de Calibração'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Altura (mm)</Label>
                <Input
                  type="number"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Volume (m³)</Label>
                <Input
                  type="number"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  placeholder="0.000"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * Fator de Correção de Volume (FCV) será automaticamente definido
              como 1.0
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRow}
              disabled={isSaving || !heightMm || !volumeM3}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Calibração</DialogTitle>
            <DialogDescription>
              Selecione como deseja importar os dados do arquivo{' '}
              {selectedFile?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 border border-blue-200">
              <p className="font-semibold mb-1">Instruções de Importação:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  O arquivo CSV deve conter colunas para <strong>Altura</strong> e{' '}
                  <strong>Volume</strong>.
                </li>
                <li>
                  Cabeçalhos aceitos para Altura:{' '}
                  <em>
                    "Altura", "Height", "H", "Nível", "Level", "Height (mm)",
                    "Altura (mm)"
                  </em>
                </li>
                <li>
                  Cabeçalhos aceitos para Volume:{' '}
                  <em>
                    "Volume", "Vol", "V", "Capacidade", "Volume (m3)",
                    "Capacity"
                  </em>
                </li>
                <li>
                  <strong>Atenção:</strong> Os valores de Volume serão
                  automaticamente divididos por <strong>1.000</strong> para
                  conversão em m³ (ex: 2500 &rarr; 2.5).
                </li>
                <li>O FCV será definido automaticamente como 1.0.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant={importMode === 'overwrite' ? 'default' : 'outline'}
                onClick={() => setImportMode('overwrite')}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-semibold">
                    Sobrescrever (Recomendado)
                  </div>
                  <div className="text-xs font-normal opacity-80">
                    Apaga dados existentes e insere os novos.
                  </div>
                </div>
              </Button>
              <Button
                variant={importMode === 'append' ? 'default' : 'outline'}
                onClick={() => setImportMode('append')}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-semibold">Adicionar (Append)</div>
                  <div className="text-xs font-normal opacity-80">
                    Mantém dados existentes e adiciona os novos.
                  </div>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
