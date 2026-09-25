import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileText, Download, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { sheetService } from '@/services/sheetService'

export default function SealReportPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject, projects, refreshProjects } =
    useProject()
  const { user } = useAuth()
  const [selectedTankId, setSelectedTankId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!currentProject && projectId) {
      // Try to find in already loaded projects
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        setCurrentProject(project)
      } else {
        // Force refresh if needed, but usually ProjectProvider handles this
        refreshProjects()
      }
    }
  }, [projectId, currentProject, projects, setCurrentProject, refreshProjects])

  const handleGenerateReport = async () => {
    if (!selectedTankId || !user) return

    setIsGenerating(true)
    const toastId = toast.loading('Gerando relatório PDF...')

    try {
      // Metadata generation
      const reportNumber = crypto.randomUUID()
      const issuedAt = new Date().toISOString()
      const selectedTank = currentProject?.tanks.find(
        (tank) => tank.id === selectedTankId,
      )

      let blob: Blob
      try {
        blob = await sheetService.generateSealReport(
          selectedTankId,
          reportNumber,
          issuedAt,
        )
      } catch (edgeError) {
        const sealRows = await sheetService.getSealData(selectedTankId)
        console.warn('Using local seal report generator:', edgeError)

        blob = sheetService.buildSealReportPdf({
          tankTag: selectedTank?.tag || 'tanque',
          productionField: selectedTank?.productionField,
          emitterEmail: user.email || 'Desconhecido',
          reportNumber,
          issuedAt,
          rows: sealRows,
        })
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const tankTag = selectedTank?.tag || 'tanque'
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `relatorio_lacres_${tankTag}_${dateStr}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)

      toast.success('Relatório gerado com sucesso!', { id: toastId })
    } catch (error: any) {
      console.error('Error generating report:', error)
      toast.error(
        'Erro ao gerar relatório: ' + (error.message || 'Erro desconhecido'),
        { id: toastId },
      )
    } finally {
      setIsGenerating(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl animate-fade-in">
      <Button
        variant="ghost"
        className="mb-6 pl-0 hover:pl-2 transition-all"
        onClick={() => navigate(`/project/${projectId}/dashboard`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Relatório de Registro de Lacres</CardTitle>
              <CardDescription>
                Gere um documento PDF oficial contendo o histórico de lacres do
                tanque selecionado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tank-select">Selecione o Tanque</Label>
            <Select value={selectedTankId} onValueChange={setSelectedTankId}>
              <SelectTrigger id="tank-select" className="w-full">
                <SelectValue placeholder="Escolha um tanque..." />
              </SelectTrigger>
              <SelectContent>
                {currentProject.tanks.map((tank) => (
                  <SelectItem key={tank.id} value={tank.id}>
                    {tank.tag} {tank.wellName ? `(${tank.wellName})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              O relatório incluirá todos os registros históricos de lacres de
              entrada, dreno e saída.
            </p>
          </div>

          <div className="bg-muted/30 border rounded-md p-4 text-sm">
            <h4 className="font-medium mb-2">Metadados do Relatório:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Identificação Única (UUID)</li>
              <li>Dados do Emissor ({user?.email})</li>
              <li>Data e Hora da Emissão</li>
              <li>Histórico completo de lacres</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedTankId || isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
