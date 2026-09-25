import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { ProductionSheet } from '@/components/sheets/ProductionSheet'
import { CalibrationSheet } from '@/components/sheets/CalibrationSheet'
import { SealSheet } from '@/components/sheets/SealSheet'
import { ReportsSheet } from '@/components/sheets/ReportsSheet'
import { ChecklistSheet } from '@/components/sheets/ChecklistSheet'

export default function SheetPage() {
  const { projectId, sheetId } = useParams()
  const { projects, setCurrentProject } = useProject()
  const navigate = useNavigate()

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      setCurrentProject(project)
    } else {
      // If projects are loaded but project not found, redirect
      if (projects.length > 0) {
        navigate('/')
      }
    }
  }, [projectId, projects, setCurrentProject, navigate])

  const project = projects.find((p) => p.id === projectId)
  if (!project || !sheetId) return null

  const sheet = project.tanks
    .flatMap((tank) => tank.sheets)
    .find((s) => s.id === sheetId)

  if (!sheet) return <div>Planilha não encontrada</div>

  return (
    <div className="animate-fade-in">
      {sheet.type === 'production' && <ProductionSheet sheetId={sheetId} />}
      {sheet.type === 'calibration' && <CalibrationSheet sheetId={sheetId} />}
      {sheet.type === 'seal' && <SealSheet sheetId={sheetId} />}
      {sheet.type === 'reports' && <ReportsSheet sheetId={sheetId} />}
      {sheet.type === 'checklist' && <ChecklistSheet sheetId={sheetId} />}
    </div>
  )
}
