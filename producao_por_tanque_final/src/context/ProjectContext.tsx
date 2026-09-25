import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import {
  Project,
  ProjectScope,
  ProductionRow,
  CalibrationRow,
  SealRow,
  Tank,
  ProductionField,
  Well,
  TransferDestinationCategory,
  BatchCalibrationOperations,
  TankOperation,
  DailyProductionReport,
  ProjectMember,
  ProjectRole,
} from '@/lib/types'
import { INITIAL_PRODUCTION_ROW } from '@/lib/initialData'
import {
  calculateProductionRow,
  calculateOperationData,
  consolidateDailyOperations,
  getProductionDayWindow,
  calculateDailyMetrics,
  getReportDateFromTimestamp,
} from '@/lib/calculations'
import { projectService } from '@/services/projectService'
import { sheetService } from '@/services/sheetService'
import { operationService } from '@/services/operationService'
import { reportService } from '@/services/reportService'
import { settingsService } from '@/services/settingsService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format, addDays, parseISO } from 'date-fns'
import { fcvLogService } from '@/services/fcvLogService'
import { getUserFacingError } from '@/lib/user-facing-error'
import { groupOperationsByWell } from '@/lib/reportGrouping'

const mergeCalibrationRows = (
  baseRows: CalibrationRow[],
  extraRows: CalibrationRow[],
) => {
  const rowsById = new Map(baseRows.map((row) => [row.id, row]))
  extraRows.forEach((row) => rowsById.set(row.id, row))
  return Array.from(rowsById.values()).sort(
    (a, b) => a.altura_mm - b.altura_mm,
  )
}

interface RefreshOptions {
  showLoading?: boolean
  caller?: string
}

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  currentProjectRole: ProjectRole | null
  setCurrentProject: (project: Project | null) => void
  isLoadingProjects: boolean
  projectsError: string | null
  refreshProjects: (options?: string | RefreshOptions) => Promise<void>

  // Metadata
  productionFields: ProductionField[]
  wells: Well[]
  transferDestinationCategories: TransferDestinationCategory[] // Filtered (Global + Current Project)
  refreshMetadata: () => Promise<void>

  // Collaboration
  members: ProjectMember[]
  isLoadingMembers: boolean
  fetchMembers: () => Promise<void>
  inviteMember: (email: string) => Promise<void>
  updateMemberRole: (memberId: string, role: ProjectRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>

  // Global Settings
  logoUrl: string | null
  refreshLogo: () => Promise<void>
  updateLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>

  // Project Settings (Project specific logo)
  updateProjectLogo: (file: File) => Promise<void>
  removeProjectLogo: () => Promise<void>

  // Data Maps keyed by Sheet ID (or Tank ID for lookup)
  productionData: Record<string, ProductionRow[]>
  calibrationData: Record<string, CalibrationRow[]>
  calibrationLookupData: Record<string, CalibrationRow[]>
  loadTankCalibration: (tankId: string) => Promise<void>
  calibrationCounts: Record<string, number>
  sealData: Record<string, SealRow[]>

  // Operations Data
  tankOperations: Record<string, TankOperation[]>
  loadOperations: (tankId: string, date?: Date) => Promise<void>
  addOperation: (op: Omit<TankOperation, 'id'>) => Promise<void>
  updateOperation: (
    id: string,
    tankId: string,
    updates: Partial<Omit<TankOperation, 'id' | 'createdAt' | 'userId'>>,
  ) => Promise<void>
  deleteOperation: (id: string, tankId: string) => Promise<void>
  getLastClosedOperation: (tankId: string) => Promise<TankOperation | null>
  getLastOperationBefore: (
    tankId: string,
    date: string | Date,
    excludeOpId?: string,
  ) => Promise<TankOperation | null>
  getLastClosedReport: (
    tankId: string,
    wellId?: string,
  ) => Promise<DailyProductionReport | null>
  getLastOperationByReportId: (
    reportId: string,
  ) => Promise<TankOperation | null>
  getContinuityLevel: (tankId: string, date: Date) => Promise<number | null>

  // Reports
  getReports: (tankId: string) => Promise<DailyProductionReport[]>
  getReportByDate: (
    tankId: string,
    date: Date,
    wellId?: string,
  ) => Promise<DailyProductionReport | null>
  getReportsForTanksByDate: (
    tankIds: string[],
    date: Date,
  ) => Promise<DailyProductionReport[]>
  closeReport: (
    report: Omit<DailyProductionReport, 'id' | 'createdAt' | 'closedAt'>,
  ) => Promise<void>
  createDailyReport: (
    tankId: string,
    date: Date,
    wellId?: string,
  ) => Promise<DailyProductionReport>
  isDateClosed: (
    tankId: string,
    date: Date,
    wellId?: string,
  ) => Promise<boolean>
  closeDayAndStartNext: (tankId: string, date: Date) => Promise<void>

  // Loading States
  isSheetLoading: Record<string, boolean>

  // Actions
  addTank: (
    projectId: string,
    tank: Omit<Tank, 'id' | 'sheets'>,
  ) => Promise<void>
  updateTank: (
    tankId: string,
    updates: Partial<
      Pick<Tank, 'tag' | 'productionFieldId' | 'wellId' | 'geolocation'>
    >,
    reason: string,
  ) => Promise<void>
  deleteTank: (tankId: string) => Promise<void>
  createProject: (
    name: string,
    description: string,
    scope: ProjectScope,
  ) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  clearProjectData: (projectId: string) => Promise<void>

  // Metadata Actions
  createProductionField: (name: string) => Promise<void>
  updateProductionField: (id: string, name: string) => Promise<void>
  deleteProductionField: (id: string) => Promise<void>
  createWell: (
    name: string,
    productionFieldId: string,
    shortName?: string,
  ) => Promise<void>
  deleteWell: (id: string) => Promise<void>
  createTransferDestinationCategory: (
    name: string,
    projectId?: string | null,
  ) => Promise<TransferDestinationCategory>
  updateTransferDestinationCategory: (id: string, name: string) => Promise<void>
  deleteTransferDestinationCategory: (id: string) => Promise<void>

  // Production Actions
  updateProductionRow: (
    sheetId: string,
    index: number,
    field: keyof ProductionRow,
    value: any,
  ) => void
  addProductionRow: (sheetId: string) => void
  deleteProductionRow: (sheetId: string, index: number) => void
  recalculateProductionForDay: (
    tankId: string,
    date: Date,
    wellId?: string,
  ) => Promise<void>
  syncProductionConsolidation: (tankId: string) => Promise<void>

  // Calibration Actions
  setCalibrationDataForSheet: (sheetId: string, data: CalibrationRow[]) => void
  saveCalibrationDataWithReason: (
    sheetId: string,
    reason: string,
  ) => Promise<void>
  batchUpdateCalibration: (
    sheetId: string,
    operations: BatchCalibrationOperations,
    reason: string,
  ) => Promise<void>
  importCalibrationDataWithReason: (
    sheetId: string,
    file: File,
    reason: string,
  ) => Promise<number>
  exportCalibrationData: (sheetId: string) => Promise<void>
  deleteCalibrationTable: (sheetId: string, reason: string) => Promise<void>

  // Seal Actions
  setSealDataForSheet: (sheetId: string, data: SealRow[]) => void

  // Persistence
  loadSheetData: (
    sheetId: string,
    type: string,
    page?: number,
    pageSize?: number,
  ) => Promise<void>
  saveSheetData: (sheetId: string, type: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

const getTankIdFromSheetId = (sheetId: string): string | undefined => {
  if (!sheetId) return undefined
  const parts = sheetId.split('-')
  if (parts.length < 2) return undefined
  const prefix = parts[0]
  const tankId = sheetId.substring(prefix.length + 1)
  return tankId
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading: authLoading, role } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentProjectRole, setCurrentProjectRole] =
    useState<ProjectRole | null>(null)

  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  const [productionFields, setProductionFields] = useState<ProductionField[]>(
    [],
  )
  const [wells, setWells] = useState<Well[]>([])
  // rawTransferCategories contains everything fetched (Global + All visible projects)
  const [rawTransferCategories, setRawTransferCategories] = useState<
    TransferDestinationCategory[]
  >([])

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [productionData, setProductionData] = useState<
    Record<string, ProductionRow[]>
  >({})
  const productionDataRef = useRef<Record<string, ProductionRow[]>>({})
  const [calibrationData, setCalibrationData] = useState<
    Record<string, CalibrationRow[]>
  >({})
  const [calibrationLookupData, setCalibrationLookupData] = useState<
    Record<string, CalibrationRow[]>
  >({})
  const [calibrationCounts, setCalibrationCounts] = useState<
    Record<string, number>
  >({})
  const [sealData, setSealData] = useState<Record<string, SealRow[]>>({})
  const [tankOperations, setTankOperations] = useState<
    Record<string, TankOperation[]>
  >({})

  const [isSheetLoading, setIsSheetLoading] = useState<Record<string, boolean>>(
    {},
  )

  // Permissions Helpers
  const canManageCalibration =
    currentProjectRole !== 'viewer' ||
    ['admin', 'director', 'petroleum_engineer'].includes(role || '')

  const canManageReports =
    currentProjectRole !== 'viewer' ||
    [
      'admin',
      'director',
      'petroleum_engineer',
      'supervisor',
      'regulation',
    ].includes(role || '')

  const currentProjectRef = useRef(currentProject)
  useEffect(() => {
    productionDataRef.current = productionData
  }, [productionData])

  useEffect(() => {
    currentProjectRef.current = currentProject
    // Update role when project changes
    if (currentProject) {
      setCurrentProjectRole(currentProject.role || 'viewer')
    } else {
      setCurrentProjectRole(null)
    }
  }, [currentProject])

  useEffect(() => {
    // If project changes, fetch members if needed (e.g., if user is owner)
    if (
      currentProject &&
      (currentProject.role === 'owner' || currentProject.role === 'editor')
    ) {
      // Logic to fetch members if needed
    }
  }, [currentProject])

  // Filter transfer categories for current usage:
  // If a project is selected, show Global + Current Project categories.
  // If no project is selected (Management view), show ALL available categories.
  const transferDestinationCategories = useMemo(() => {
    if (!currentProject) return rawTransferCategories
    return rawTransferCategories.filter(
      (c) => !c.projectId || c.projectId === currentProject.id,
    )
  }, [currentProject, rawTransferCategories])

  const refreshLogo = useCallback(async () => {
    try {
      const url = await settingsService.getSetting('company_logo_url')
      setLogoUrl(url)
    } catch (e) {
      console.error('Error loading logo:', e)
    }
  }, [])

  const updateLogo = useCallback(
    async (file: File) => {
      if (!user) return
      try {
        const url = await settingsService.uploadLogo(file, user.id)
        setLogoUrl(url)
        toast.success('Logo atualizado com sucesso!')
      } catch (e: any) {
        console.error('Error updating logo:', e)
        toast.error('Erro ao atualizar logo: ' + e.message)
        throw e
      }
    },
    [user],
  )

  const removeLogo = useCallback(async () => {
    if (!user) return
    try {
      await settingsService.removeLogo(user.id)
      setLogoUrl(null)
      toast.success('Logo removido com sucesso!')
    } catch (e: any) {
      console.error('Error removing logo:', e)
      toast.error('Erro ao remover logo: ' + e.message)
    }
  }, [user])

  const refreshMetadata = useCallback(async () => {
    if (!user) return
    try {
      const [pf, w] = await Promise.all([
        projectService.getProductionFields(currentProject?.id),
        projectService.getWells(currentProject?.id),
      ])
      setProductionFields(pf)
      setWells(w)

      await refreshLogo()

      // Fetch categories for all visible projects to allow management across projects
      // We rely on RLS and projectService to filter visibility.
      // If we pass visible project IDs explicitly, we ensure we get what we need.
      const visibleProjectIds = projects.map((p) => p.id)
      const categories =
        await projectService.getTransferDestinationCategories(visibleProjectIds)
      setRawTransferCategories(categories)
    } catch (error) {
      console.error('[ProjectProvider] Error loading metadata:', error)
    }
  }, [user, currentProject, refreshLogo, projects])

  const refreshProjects = useCallback(
    async (optionsInput?: string | RefreshOptions) => {
      let options: RefreshOptions = {}
      if (typeof optionsInput === 'string') {
        options = { caller: optionsInput, showLoading: true }
      } else if (optionsInput) {
        options = optionsInput
      }

      const { showLoading = true } = options

      if (authLoading) return
      if (!user?.id) {
        setProjects([])
        setCurrentProject(null)
        setIsLoadingProjects(false)
        return
      }

      if (showLoading) setIsLoadingProjects(true)
      setProjectsError(null)

      try {
        // Pass the current role to getProjects to allow Admin/Director to fetch all projects
        const data = await projectService.getProjects(
          user.id,
          role || undefined,
        )
        setProjects(data)

        const currentProj = currentProjectRef.current
        if (currentProj) {
          const updatedCurrent = data.find((p) => p.id === currentProj.id)
          if (updatedCurrent) {
            setCurrentProject(updatedCurrent)
          }
        }
      } catch (err: any) {
        const errorMessage =
          err.message || 'Erro desconhecido ao carregar projetos'
        setProjectsError(errorMessage)
        toast.error('Erro ao carregar projetos: ' + errorMessage)
        setProjects([])
      } finally {
        setIsLoadingProjects(false)
      }
    },
    [user?.id, role, authLoading],
  )

  useEffect(() => {
    if (!authLoading) {
      refreshProjects({ caller: 'ProjectProvider Effect' })
    }
  }, [refreshProjects, authLoading])

  useEffect(() => {
    // We only refresh metadata if we have projects loaded or if we are not expecting project-specific data (init)
    // Actually refreshMetadata depends on projects to fetch categories efficiently
    if (!isLoadingProjects) {
      refreshMetadata()
    }
  }, [refreshMetadata, isLoadingProjects])

  // Member Management
  const fetchMembers = useCallback(async () => {
    if (!currentProject) return
    setIsLoadingMembers(true)
    try {
      const data = await projectService.getMembers(currentProject.id)
      setMembers(data)
    } catch (error: any) {
      toast.error('Erro ao carregar membros: ' + error.message)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [currentProject])

  const inviteMember = useCallback(
    async (email: string) => {
      if (!currentProject || !user) return
      try {
        await projectService.inviteMember(currentProject.id, email, user.id)
        toast.success('Membro convidado com sucesso!')
        fetchMembers()
      } catch (error: any) {
        toast.error(error.message)
        throw error
      }
    },
    [currentProject, user, fetchMembers],
  )

  const updateMemberRole = useCallback(
    async (memberId: string, role: ProjectRole) => {
      if (!user) return
      try {
        await projectService.updateMemberRole(memberId, role, user.id)
        toast.success('Permissão atualizada com sucesso.')
        fetchMembers()
      } catch (error: any) {
        toast.error('Erro ao atualizar permissão: ' + error.message)
        throw error
      }
    },
    [user, fetchMembers],
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!user) return
      try {
        await projectService.removeMember(memberId, user.id)
        toast.success('Membro removido do projeto.')
        fetchMembers()
      } catch (error: any) {
        toast.error('Erro ao remover membro: ' + error.message)
        throw error
      }
    },
    [user, fetchMembers],
  )

  const createProject = useCallback(
    async (name: string, description: string, scope: ProjectScope) => {
      if (!user) return
      try {
        await projectService.createProject(name, description, user.id, scope)
        await refreshProjects({ caller: 'createProject' })
        toast.success('Projeto criado com sucesso!')
      } catch (error: any) {
        toast.error('Erro ao criar projeto: ' + error.message)
      }
    },
    [user, refreshProjects],
  )

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user) return
      try {
        await projectService.deleteProject(projectId, user.id)
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
        if (currentProject && currentProject.id === projectId) {
          setCurrentProject(null)
        }
        toast.success('Projeto excluído com sucesso.')
      } catch (error: any) {
        toast.error('Erro ao excluir projeto: ' + error.message)
      }
    },
    [user, currentProject],
  )

  const clearProjectData = useCallback(
    async (projectId: string) => {
      if (!user) return
      try {
        await projectService.clearProjectData(projectId)

        if (currentProject && currentProject.id === projectId) {
          const tankIds = currentProject.tanks.map((t) => t.id)
          setTankOperations((prev) => {
            const next = { ...prev }
            tankIds.forEach((id) => delete next[id])
            return next
          })
          setProductionData((prev) => {
            const next = { ...prev }
            tankIds.forEach((id) => delete next[`prod-${id}`])
            return next
          })
          setSealData((prev) => {
            const next = { ...prev }
            tankIds.forEach((id) => delete next[`seal-${id}`])
            return next
          })
        }
        toast.success('Dados do projeto limpos com sucesso!')
      } catch (error: any) {
        toast.error('Erro ao limpar dados do projeto: ' + error.message)
        throw error
      }
    },
    [user, currentProject],
  )

  const updateProjectLogo = useCallback(
    async (file: File) => {
      if (!user || !currentProject) return
      try {
        const url = await projectService.uploadProjectLogo(
          currentProject.id,
          file,
          user.id,
        )
        setCurrentProject((prev) => (prev ? { ...prev, logoUrl: url } : null))
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id ? { ...p, logoUrl: url } : p,
          ),
        )
        toast.success('Logo do projeto atualizado com sucesso!')
      } catch (e: any) {
        console.error('Error updating project logo:', e)
        toast.error('Erro ao atualizar logo: ' + e.message)
        throw e
      }
    },
    [user, currentProject],
  )

  const removeProjectLogo = useCallback(async () => {
    if (!user || !currentProject) return
    try {
      await projectService.removeProjectLogo(currentProject.id, user.id)
      setCurrentProject((prev) => (prev ? { ...prev, logoUrl: null } : null))
      setProjects((prev) =>
        prev.map((p) =>
          p.id === currentProject.id ? { ...p, logoUrl: null } : p,
        ),
      )
      toast.success('Logo do projeto removido com sucesso!')
    } catch (e: any) {
      console.error('Error removing project logo:', e)
      toast.error('Erro ao remover logo: ' + e.message)
    }
  }, [user, currentProject])

  const addTank = useCallback(
    async (projectId: string, tankDetails: Omit<Tank, 'id' | 'sheets'>) => {
      try {
        await projectService.createTank(projectId, tankDetails)
        await refreshProjects({ caller: 'addTank' })
        toast.success('Tanque adicionado com sucesso!')
      } catch (error: any) {
        toast.error('Erro ao adicionar tanque: ' + error.message)
        throw error
      }
    },
    [refreshProjects],
  )

  const updateTank = useCallback(
    async (
      tankId: string,
      updates: Partial<
        Pick<Tank, 'tag' | 'productionFieldId' | 'wellId' | 'geolocation'>
      >,
      reason: string,
    ) => {
      if (!user) return
      try {
        await projectService.updateTank(tankId, updates, reason, user.id)
        await refreshProjects({ caller: 'updateTank' })
        toast.success('Tanque atualizado com sucesso!')
      } catch (error: any) {
        toast.error('Erro ao atualizar tanque: ' + error.message)
        throw error
      }
    },
    [user, refreshProjects],
  )

  const deleteTank = useCallback(
    async (tankId: string) => {
      if (!user) return
      try {
        await projectService.deleteTank(tankId, user.id)
        await refreshProjects({ caller: 'deleteTank' })
        toast.success('Tanque excluído com sucesso!')
      } catch (error) {
        toast.error(
          getUserFacingError(error, 'Não foi possível excluir o tanque.'),
        )
        throw error
      }
    },
    [user, refreshProjects],
  )

  const createProductionField = useCallback(
    async (name: string) => {
      if (!user) return
      try {
        await projectService.createProductionField(
          name,
          user.id,
          currentProject?.id,
        )
        await refreshMetadata()
        toast.success('Campo de produção criado!')
      } catch (error: any) {
        toast.error(
          getUserFacingError(error, 'Não foi possível criar o campo.'),
        )
        throw error
      }
    },
    [user, currentProject, refreshMetadata],
  )

  const updateProductionField = useCallback(
    async (id: string, name: string) => {
      if (!user) return
      try {
        await projectService.updateProductionField(id, name, user.id)
        await refreshMetadata()
        toast.success('Campo de produção atualizado!')
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user, refreshMetadata],
  )

  const deleteProductionField = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await projectService.deleteProductionField(id, user.id)
        await refreshMetadata()
        toast.success('Campo de produção excluído!')
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user, refreshMetadata],
  )

  const createWell = useCallback(
    async (
      name: string,
      productionFieldId: string,
      shortName?: string, // Added optional shortName
    ) => {
      if (!user) return
      try {
        await projectService.createWell(
          name,
          productionFieldId,
          user.id,
          shortName,
        )
        const w = await projectService.getWells(currentProject?.id)
        setWells(w)
        toast.success('Poço criado!')
      } catch (error: any) {
        toast.error(getUserFacingError(error, 'Não foi possível criar o poço.'))
        throw error
      }
    },
    [user, currentProject?.id],
  )

  const deleteWell = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await projectService.deleteWell(id, user.id)
        const w = await projectService.getWells(currentProject?.id)
        setWells(w)
        toast.success('Poço excluído!')
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user, currentProject?.id],
  )

  const createTransferDestinationCategory = useCallback(
    async (name: string, projectId?: string | null) => {
      if (!user) throw new Error('Unauthorized')
      const targetProjectId = projectId ?? currentProject?.id ?? null
      try {
        const newCategory =
          await projectService.createTransferDestinationCategory(
            name,
            user.id,
            targetProjectId,
          )
        setRawTransferCategories((prev) => [...prev, newCategory])
        toast.success('Categoria de destino criada!')
        return newCategory
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user, currentProject?.id],
  )

  const updateTransferDestinationCategory = useCallback(
    async (id: string, name: string) => {
      if (!user) return
      try {
        await projectService.updateTransferDestinationCategory(
          id,
          name,
          user.id,
        )
        setRawTransferCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name } : c)),
        )
        toast.success('Categoria de destino atualizada!')
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user],
  )

  const deleteTransferDestinationCategory = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await projectService.deleteTransferDestinationCategory(id, user.id)
        setRawTransferCategories((prev) => prev.filter((c) => c.id !== id))
        toast.success('Categoria de destino excluída!')
      } catch (error: any) {
        toast.error('Erro: ' + error.message)
        throw error
      }
    },
    [user],
  )

  // ... loadSheetData, saveSheetData ...
  const loadSheetData = useCallback(
    async (sheetId: string, type: string, page?: number, pageSize?: number) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId) return

      setIsSheetLoading((prev) => ({ ...prev, [sheetId]: true }))

      try {
        if (type === 'production') {
          const data = await sheetService.getProductionData(tankId)
          const validData = data.filter((row) => row.D_Data_fim_periodo)
          setProductionData((prev) => ({
            ...prev,
            [sheetId]: validData,
          }))
          const { data: fullCalData } =
            await sheetService.getCalibrationData(tankId)
          setCalibrationLookupData((prev) => ({
            ...prev,
            [tankId]: fullCalData,
          }))
          const ops = await operationService.getOperations(tankId)
          setTankOperations((prev) => ({ ...prev, [tankId]: ops }))
        } else if (type === 'calibration') {
          const { data, count } = await sheetService.getCalibrationData(
            tankId,
            page,
            pageSize,
          )
          setCalibrationData((prev) => ({ ...prev, [sheetId]: data }))
          setCalibrationCounts((prev) => ({ ...prev, [sheetId]: count }))
        } else if (type === 'seal') {
          const data = await sheetService.getSealData(tankId)
          setSealData((prev) => ({ ...prev, [sheetId]: data }))
        }
      } catch (error: any) {
        console.error('Error loading sheet data:', error)
        toast.error('Erro ao carregar dados da planilha.')
      } finally {
        setIsSheetLoading((prev) => ({ ...prev, [sheetId]: false }))
      }
    },
    [],
  )

  const saveSheetData = useCallback(
    async (sheetId: string, type: string) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId) return

      // Permission check
      if (currentProjectRole === 'viewer') {
        toast.error('Você não tem permissão para editar dados.')
        return
      }

      try {
        if (type === 'production') {
          const data = productionData[sheetId] || []
          await sheetService.saveProductionData(tankId, data)
        } else if (type === 'calibration') {
          const data = calibrationData[sheetId] || []
          await sheetService.saveCalibrationData(tankId, data)
        } else if (type === 'seal') {
          const data = sealData[sheetId] || []
          // Mark all records as saved before persisting to DB
          const dataToSave = data.map((r) => ({ ...r, isSaved: true }))
          await sheetService.saveSealData(tankId, dataToSave)
          // Update local state to reflect that all rows are now saved (and thus locked)
          setSealData((prev) => ({ ...prev, [sheetId]: dataToSave }))
        }
        toast.success('Dados salvos com sucesso!')
      } catch (error: any) {
        console.error('Error saving sheet data:', error)
        toast.error('Erro ao salvar dados: ' + error.message)
      }
    },
    [productionData, calibrationData, sealData, currentProjectRole],
  )

  const loadOperations = useCallback(async (tankId: string, date?: Date) => {
    try {
      const ops = await operationService.getOperations(tankId, date)
      setTankOperations((prev) => ({
        ...prev,
        [tankId]: ops,
      }))
    } catch (err) {
      console.error(err)
    }
  }, [])

  const getCalibrationDataForLevels = useCallback(
    async (tankId: string, levels: Array<number | undefined | null>) => {
      const { data } = await sheetService.getCalibrationData(tankId)
      const validLevels = levels.filter((level): level is number =>
        Number.isFinite(level),
      )

      const windows = await Promise.all(
        validLevels.map((level) =>
          sheetService.getCalibrationWindow(tankId, level),
        ),
      )
      const mergedData = mergeCalibrationRows(data, windows.flat())

      setCalibrationLookupData((prev) => ({
        ...prev,
        [tankId]: mergedData,
      }))

      return mergedData
    },
    [],
  )

  const getLastClosedOperation = useCallback(async (tankId: string) => {
    return operationService.getLastClosedOperation(tankId)
  }, [])

  const getLastOperationBefore = useCallback(
    async (tankId: string, date: string | Date, excludeOpId?: string) => {
      return operationService.getLastOperationBefore(tankId, date, excludeOpId)
    },
    [],
  )

  const getLastClosedReport = useCallback(async (tankId: string, wellId?: string) => {
    return reportService.getLastClosedReport(tankId, wellId)
  }, [])

  const getLastOperationByReportId = useCallback(async (reportId: string) => {
    return operationService.getLastOperationByReportId(reportId)
  }, [])

  const getContinuityLevel = useCallback(async (tankId: string, date: Date) => {
    try {
      const op = await operationService.getLastClosedOperation(tankId, date)
      if (!op) return null
      return op.finalLevelMm
    } catch (e) {
      console.error('Error fetching continuity level:', e)
      return null
    }
  }, [])

  const recalculateProductionForDay = useCallback(
    async (tankId: string, date: Date, wellId?: string) => {
      try {
        const ops = await operationService.getOperations(tankId)
        setTankOperations((prev) => ({ ...prev, [tankId]: ops }))

        const report = await reportService.getReportByDate(tankId, date, wellId)
        if (report?.status === 'draft') {
          const reportOps = ops.filter((op) => op.dailyReportId === report.id)
          const metrics = calculateDailyMetrics(reportOps)
          await reportService.updateDraftReportMetrics(report.id, metrics)
        }

        const sheetId = `prod-${tankId}`
        const currentRows = productionDataRef.current[sheetId] || []
        const dateStr = format(date, 'yyyy-MM-dd')
        const dailyOps = ops.filter(
          (op) =>
            format(getReportDateFromTimestamp(op.endTime), 'yyyy-MM-dd') ===
            dateStr,
        )
        const existingRow = currentRows.find(
          (r) =>
            r.D_Data_fim_periodo && r.D_Data_fim_periodo.startsWith(dateStr),
        )

        let newRows = currentRows.filter(
          (row) =>
            row.D_Data_fim_periodo &&
            !row.D_Data_fim_periodo.startsWith(dateStr),
        )
        if (dailyOps.length === 0) {
          // No operations remain for this day; removing only this day's row.
        } else {
          const prevRow =
            newRows.length > 0 ? newRows[newRows.length - 1] : undefined
          const consolidatedRow = consolidateDailyOperations(date, ops, prevRow)
          newRows.push({
            ...consolidatedRow,
            id: existingRow?.id || consolidatedRow.id,
          })
        }

        newRows.sort(
          (a, b) =>
            new Date(a.D_Data_fim_periodo).getTime() -
            new Date(b.D_Data_fim_periodo).getTime(),
        )

        const rowLevels = newRows.flatMap((row) => [
          Number(row.B_Altura_Liq_Inicial_mm),
          Number(row.E_Altura_Liq_Final_mm),
        ])
        const calData = await getCalibrationDataForLevels(tankId, rowLevels)
        for (let i = 0; i < newRows.length; i++) {
          const pRow = i > 0 ? newRows[i - 1] : undefined
          newRows[i] = calculateProductionRow(newRows[i], pRow, calData)
        }

        await sheetService.saveProductionData(tankId, newRows)
        productionDataRef.current = {
          ...productionDataRef.current,
          [sheetId]: newRows,
        }
        setProductionData((prev) => ({
          ...prev,
          [sheetId]: newRows,
        }))
      } catch (err) {
        console.error('Error in recalculateProductionForDay:', err)
        throw err
      }
    },
    [getCalibrationDataForLevels],
  )

  const syncProductionConsolidation = useCallback(
    async (tankId: string) => {
      try {
        const sheetId = `prod-${tankId}`
        const ops = await operationService.getOperations(tankId)
        setTankOperations((prev) => ({ ...prev, [tankId]: ops }))

        const existingRows = (await sheetService.getProductionData(tankId)).filter(
          (row) => row.D_Data_fim_periodo,
        )
        const existingRowsByDate = new Map(
          existingRows.map((row) => [
            row.D_Data_fim_periodo.slice(0, 10),
            row,
          ]),
        )

        const opLevels = ops.flatMap((op) => [
          op.initialLevelMm,
          op.finalLevelMm,
        ])
        const calData = await getCalibrationDataForLevels(tankId, opLevels)

        const reportDates = Array.from(
          new Set(
            ops.map((op) =>
              format(getReportDateFromTimestamp(op.endTime), 'yyyy-MM-dd'),
            ),
          ),
        ).sort()

        const reportKeys = Array.from(
          new Set(
            ops
              .filter((op) => op.wellId)
              .map(
                (op) =>
                  `${format(getReportDateFromTimestamp(op.endTime), 'yyyy-MM-dd')}|${op.wellId}`,
              ),
          ),
        )

        for (const reportKey of reportKeys) {
          const [dateStr, wellId] = reportKey.split('|')
          const date = new Date(`${dateStr}T12:00:00`)
          const report = await reportService.getReportByDate(tankId, date, wellId)
          if (report?.status === 'draft') {
            const reportOps = ops.filter((op) => op.dailyReportId === report.id)
            const metrics = calculateDailyMetrics(reportOps)
            await reportService.updateDraftReportMetrics(report.id, metrics)
          }
        }

        const rows = reportDates.map((dateStr, index, allDates) => {
          const date = new Date(`${dateStr}T12:00:00`)
          const prevDateStr = allDates[index - 1]
          const prevRow = prevDateStr
            ? existingRowsByDate.get(prevDateStr)
            : undefined
          const consolidatedRow = consolidateDailyOperations(date, ops, prevRow)
          const existingRow = existingRowsByDate.get(dateStr)

          return {
            ...consolidatedRow,
            id: existingRow?.id || consolidatedRow.id,
          }
        })

        for (let i = 0; i < rows.length; i++) {
          const previousRow = i > 0 ? rows[i - 1] : undefined
          rows[i] = calculateProductionRow(rows[i], previousRow, calData)
        }

        await sheetService.saveProductionData(tankId, rows)
        productionDataRef.current = {
          ...productionDataRef.current,
          [sheetId]: rows,
        }
        setProductionData((prev) => ({
          ...prev,
          [sheetId]: rows,
        }))
      } catch (err) {
        console.error('Error in syncProductionConsolidation:', err)
        throw err
      }
    },
    [getCalibrationDataForLevels],
  )

  const isDateClosed = useCallback(async (tankId: string, date: Date, wellId?: string) => {
    try {
      const report = await reportService.getReportByDate(tankId, date, wellId)
      return !!report && report.status === 'closed'
    } catch {
      return false
    }
  }, [])

  const addOperation = useCallback(
    async (op: Omit<TankOperation, 'id'>) => {
      if (!user) return
      if (currentProjectRole === 'viewer') {
        toast.error('Você não tem permissão para adicionar operações.')
        throw new Error('Permission denied')
      }

      try {
        if (!op.wellId) {
          throw new Error('Selecione o poço desta operação.')
        }
        let existingReport = await reportService.getReportForOperation(
          op.tankId,
          op.wellId,
          op.endTime,
        )

        if (!existingReport) {
          const opDate = getReportDateFromTimestamp(op.endTime)
          const { start, end } = getProductionDayWindow(opDate)
          const newReport: Omit<
            DailyProductionReport,
            'id' | 'createdAt' | 'closedAt' | 'closedBy'
          > = {
            tankId: op.tankId,
            wellId: op.wellId,
            reportDate: format(opDate, 'yyyy-MM-dd'),
            startDatetime: start.toISOString(),
            endDatetime: end.toISOString(),
            status: 'draft',
            stockVariation: 0,
            totalBswPercent: 0,
            drainedVolumeM3: 0,
            transferredVolumeM3: 0,
            uncorrectedOilVolumeM3: 0,
            emulsionWaterVolumeM3: 0,
            tempCorrectionFactorY: 1,
            correctedOilVolumeM3: 0,
            emulsionBswPercent: 0,
            fluidTempC: 0,
            fcv: 1,
            fe: 1,
            calculatedWellProductionM3: 0,
          }
          existingReport = await reportService.createDraftReport(
            newReport,
            user.id,
          )
        }

        if (existingReport.status === 'closed') {
          const reportDateStr = format(
            new Date(existingReport.reportDate + 'T12:00:00'),
            'dd/MM/yyyy',
          )
          toast.error(
            `O relatório de produção para ${reportDateStr} já está fechado.`,
          )
          throw new Error('Report closed')
        }

        const calData = await getCalibrationDataForLevels(op.tankId, [
          op.initialLevelMm,
          op.finalLevelMm,
        ])
        const calculatedOp = calculateOperationData(op, calData)
        calculatedOp.dailyReportId = existingReport.id

        const savedOp = await operationService.createOperation(
          calculatedOp,
          user.id,
        )

        setTankOperations((prev) => ({
          ...prev,
          [op.tankId]: [...(prev[op.tankId] || []), savedOp],
        }))

        const reportDate = new Date(existingReport.reportDate + 'T12:00:00')
        await recalculateProductionForDay(op.tankId, reportDate, op.wellId)

        toast.success('Operação adicionada e consolidada!')
      } catch (error: any) {
        if (
          error.message !== 'Report closed' &&
          error.message !== 'Permission denied'
        ) {
          toast.error('Erro ao adicionar operação: ' + error.message)
        }
        throw error
      }
    },
    [
      user,
      getCalibrationDataForLevels,
      recalculateProductionForDay,
      currentProjectRole,
    ],
  )

  const updateOperation = useCallback(
    async (
      id: string,
      tankId: string,
      updates: Partial<Omit<TankOperation, 'id' | 'createdAt' | 'userId'>>,
    ) => {
      if (!user) return
      if (currentProjectRole === 'viewer') {
        toast.error('Você não tem permissão para editar operações.')
        throw new Error('Permission denied')
      }

      try {
        const existingOp = tankOperations[tankId]?.find((o) => o.id === id)
        if (!existingOp) {
          toast.error('Operação não encontrada.')
          return
        }
        const previousReportDate = getReportDateFromTimestamp(existingOp.endTime)
        const mergedOp = { ...existingOp, ...updates }
        if (!mergedOp.wellId) {
          throw new Error('Selecione o poço desta operação.')
        }
        let existingReport = await reportService.getReportForOperation(
          tankId,
          mergedOp.wellId,
          mergedOp.endTime,
        )

        if (!existingReport) {
          const opDate = getReportDateFromTimestamp(mergedOp.endTime)
          const { start, end } = getProductionDayWindow(opDate)
          const newReport: Omit<
            DailyProductionReport,
            'id' | 'createdAt' | 'closedAt' | 'closedBy'
          > = {
            tankId,
            wellId: mergedOp.wellId,
            reportDate: format(opDate, 'yyyy-MM-dd'),
            startDatetime: start.toISOString(),
            endDatetime: end.toISOString(),
            status: 'draft',
            stockVariation: 0,
            totalBswPercent: 0,
            drainedVolumeM3: 0,
            transferredVolumeM3: 0,
            uncorrectedOilVolumeM3: 0,
            emulsionWaterVolumeM3: 0,
            tempCorrectionFactorY: 1,
            correctedOilVolumeM3: 0,
            emulsionBswPercent: 0,
            fluidTempC: 0,
            fcv: 1,
            fe: 1,
            calculatedWellProductionM3: 0,
          }
          existingReport = await reportService.createDraftReport(
            newReport,
            user.id,
          )
        }

        if (existingReport.status === 'closed') {
          toast.error('Relatório fechado.')
          return
        }

        updates.dailyReportId = existingReport.id
        const calData = await getCalibrationDataForLevels(tankId, [
          mergedOp.initialLevelMm,
          mergedOp.finalLevelMm,
        ])
        const calculatedOp = calculateOperationData(mergedOp, calData)

        const savedOp = await operationService.updateOperation(
          id,
          calculatedOp,
          user.id,
        )

        setTankOperations((prev) => ({
          ...prev,
          [tankId]: prev[tankId]?.map((o) => (o.id === id ? savedOp : o)) || [],
        }))

        const newReportDate = new Date(existingReport.reportDate + 'T12:00:00')
        if (
          format(previousReportDate, 'yyyy-MM-dd') !==
          format(newReportDate, 'yyyy-MM-dd')
        ) {
          await recalculateProductionForDay(
            tankId,
            previousReportDate,
            existingOp.wellId,
          )
        }
        await recalculateProductionForDay(tankId, newReportDate, mergedOp.wellId)

        toast.success('Operação atualizada e consolidada!')
      } catch (error: any) {
        if (error.message !== 'Permission denied') {
          toast.error('Erro ao atualizar operação: ' + error.message)
        }
        throw error
      }
    },
    [
      user,
      getCalibrationDataForLevels,
      tankOperations,
      recalculateProductionForDay,
      currentProjectRole,
    ],
  )

  const deleteOperation = useCallback(
    async (id: string, tankId: string) => {
      if (!user) return
      if (currentProjectRole === 'viewer') {
        toast.error('Você não tem permissão para excluir operações.')
        return
      }

      // Supervisor check: strictly prohibited from deleting historical records
      if (role === 'supervisor') {
        toast.error(
          'Supervisores não têm permissão para excluir registros históricos.',
        )
        return
      }

      try {
        const op = tankOperations[tankId]?.find((o) => o.id === id)
        if (op) {
          const reportDate = getReportDateFromTimestamp(op.endTime)
          const closed = await isDateClosed(tankId, reportDate, op.wellId)
          if (closed) {
            toast.error(
              'Não é possível remover operações de um dia com relatório fechado.',
            )
            return
          }
        }
        await operationService.deleteOperation(id, user.id)
        setTankOperations((prev) => ({
          ...prev,
          [tankId]: prev[tankId]?.filter((o) => o.id !== id) || [],
        }))
        if (op) {
          const reportDate = getReportDateFromTimestamp(op.endTime)
          await recalculateProductionForDay(tankId, reportDate, op.wellId)
        }
        toast.success('Operação removida!')
      } catch (error: any) {
        toast.error('Erro ao remover operação: ' + error.message)
      }
    },
    [
      user,
      tankOperations,
      recalculateProductionForDay,
      isDateClosed,
      currentProjectRole,
      role,
    ],
  )

  // ... Reports ...
  const getReports = useCallback(async (tankId: string) => {
    return reportService.getReports(tankId)
  }, [])

  const getReportByDate = useCallback(async (tankId: string, date: Date, wellId?: string) => {
    return reportService.getReportByDate(tankId, date, wellId)
  }, [])

  const getReportsForTanksByDate = useCallback(
    async (tankIds: string[], date: Date) => {
      const { data } = await reportService.getReportsByDateForTanks(
        tankIds,
        date,
      )
      return data
    },
    [],
  )

  const closeReport = useCallback(
    async (
      report: Omit<DailyProductionReport, 'id' | 'createdAt' | 'closedAt'>,
    ) => {
      if (!user) return
      if (!canManageReports) {
        toast.error('Você não tem permissão para fechar relatórios.')
        throw new Error('Permission denied')
      }
      try {
        await reportService.closeReport(report, user.id)
        toast.success('Relatório de produção fechado com sucesso!')
      } catch (error: any) {
        toast.error('Erro ao fechar relatório: ' + error.message)
        throw error
      }
    },
    [user, canManageReports],
  )

  const createDailyReport = useCallback(
    async (tankId: string, date: Date, requestedWellId?: string) => {
      if (!user) throw new Error('Unauthorized')
      if (currentProjectRole === 'viewer') {
        throw new Error('Você não tem permissão para criar relatórios.')
      }
      const wellId =
        requestedWellId ||
        currentProject?.tanks.find((tank) => tank.id === tankId)?.wellId
      if (!wellId) {
        throw new Error('Associe um poço ao tanque antes de criar o relatório.')
      }
      const { start, end } = getProductionDayWindow(date)
      const report: Omit<
        DailyProductionReport,
        'id' | 'createdAt' | 'closedAt' | 'closedBy'
      > = {
        tankId,
        wellId,
        reportDate: format(date, 'yyyy-MM-dd'),
        startDatetime: start.toISOString(),
        endDatetime: end.toISOString(),
        status: 'draft',
        stockVariation: 0,
        totalBswPercent: 0,
        drainedVolumeM3: 0,
        transferredVolumeM3: 0,
        uncorrectedOilVolumeM3: 0,
        emulsionWaterVolumeM3: 0,
        tempCorrectionFactorY: 1,
        correctedOilVolumeM3: 0,
        emulsionBswPercent: 0,
        fluidTempC: 0,
        fcv: 1,
        fe: 1,
        calculatedWellProductionM3: 0,
      }
      return reportService.createDraftReport(report, user.id)
    },
    [user, currentProject, currentProjectRole],
  )

  const closeDayAndStartNext = useCallback(
    async (tankId: string, date: Date) => {
      if (!user) return
      if (!canManageReports) {
        toast.error('Você não tem permissão para fechar dias.')
        throw new Error('Permission denied')
      }
      try {
        const { start, end } = getProductionDayWindow(date)
        const ops = await operationService.getOperations(tankId)
        const dailyOps = ops.filter((op) => {
          const operationEnd = parseISO(op.endTime)
          const reportDate = getReportDateFromTimestamp(operationEnd)
          return format(reportDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        })
        const operationsByWell = groupOperationsByWell(dailyOps)

        if (operationsByWell.size === 0) {
          throw new Error('Não há operações com poço identificado neste dia.')
        }

        const nextReportDate = addDays(date, 1)
        const { start: nextStart, end: nextEnd } =
          getProductionDayWindow(nextReportDate)

        for (const [wellId, wellOperations] of operationsByWell) {
          const metrics = calculateDailyMetrics(wellOperations)
          const createdReport = await reportService.closeReport(
            {
              tankId,
              wellId,
              reportDate: format(date, 'yyyy-MM-dd'),
              startDatetime: start.toISOString(),
              endDatetime: end.toISOString(),
              status: 'closed',
              stockVariation: metrics.stockVariation,
              drainedVolumeM3: metrics.drained,
              transferredVolumeM3: metrics.transferred,
              calculatedWellProductionM3: metrics.wellProduction,
              totalBswPercent: metrics.totalBswPercent,
              uncorrectedOilVolumeM3: metrics.uncorrectedOilVolume,
              emulsionWaterVolumeM3: metrics.emulsionWaterVolume,
              tempCorrectionFactorY: metrics.tempCorrectionFactorY,
              correctedOilVolumeM3: metrics.correctedOilVolume,
              emulsionBswPercent: metrics.emulsionBswPercent,
              fluidTempC: metrics.fluidTempC,
              fcv: metrics.fcv,
              fe: metrics.fe,
              densityAt20cGcm3: metrics.densityAt20cGcm3,
              transferObservedDensityGcm3:
                metrics.transferObservedDensityGcm3,
            },
            user.id,
          )
          await operationService.linkOperationsToReport(
            wellOperations.map((operation) => operation.id),
            createdReport.id,
          )

          const nextDraftReport = await reportService.createDraftReport(
            {
              tankId,
              wellId,
              reportDate: format(nextReportDate, 'yyyy-MM-dd'),
              startDatetime: nextStart.toISOString(),
              endDatetime: nextEnd.toISOString(),
              status: 'draft',
              stockVariation: 0,
              totalBswPercent: 0,
              drainedVolumeM3: 0,
              transferredVolumeM3: 0,
              uncorrectedOilVolumeM3: 0,
              emulsionWaterVolumeM3: 0,
              tempCorrectionFactorY: 1,
              correctedOilVolumeM3: 0,
              emulsionBswPercent: 0,
              fluidTempC: 0,
              fcv: 1,
              fe: 1,
              calculatedWellProductionM3: 0,
            },
            user.id,
          )

          const lastOp = [...wellOperations].sort(
            (a, b) =>
              new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
          )[0]
          const nextOp: Omit<TankOperation, 'id'> = {
            tankId,
            wellId,
            type: 'production',
            startTime: nextStart.toISOString(),
            endTime: nextEnd.toISOString(),
            initialLevelMm: lastOp.finalLevelMm,
            finalLevelMm: lastOp.finalLevelMm,
            bswPercent: lastOp.bswPercent,
            tempFluidC: lastOp.tempFluidC,
            tempAmbientC: lastOp.tempAmbientC,
            densityObservedGcm3: lastOp.densityObservedGcm3,
            dailyReportId: nextDraftReport.id,
          }
          const calData = await getCalibrationDataForLevels(tankId, [
            nextOp.initialLevelMm,
            nextOp.finalLevelMm,
          ])
          await operationService.createOperation(
            calculateOperationData(nextOp, calData),
            user.id,
          )
          await recalculateProductionForDay(tankId, nextReportDate, wellId)
        }
        toast.success('Dia fechado com sucesso! Boletim do próximo dia criado.')
      } catch (error: any) {
        console.error('Error closing day:', error)
        toast.error('Erro ao fechar dia: ' + error.message)
        throw error
      }
    },
    [
      user,
      getCalibrationDataForLevels,
      recalculateProductionForDay,
      canManageReports,
    ],
  )

  const loadTankCalibration = useCallback(async (tankId: string) => {
    try {
      const { data: fullCalData } =
        await sheetService.getCalibrationData(tankId)
      setCalibrationLookupData((prev) => ({
        ...prev,
        [tankId]: fullCalData,
      }))
    } catch (error) {
      console.error('Error refreshing calibration lookup:', error)
    }
  }, [])

  const saveCalibrationDataWithReason = useCallback(
    async (sheetId: string, reason: string) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId || !user) return
      if (!canManageCalibration) {
        toast.error('Você não tem permissão para editar arqueação.')
        throw new Error('Permission denied')
      }
      try {
        const data = calibrationData[sheetId] || []
        await sheetService.saveCalibrationData(tankId, data, reason, user.id)
        await loadTankCalibration(tankId)
        toast.success('Tabela de arqueação salva com sucesso!')
      } catch (error: any) {
        console.error('Error saving calibration data:', error)
        toast.error('Erro ao salvar dados: ' + error.message)
        throw error
      }
    },
    [calibrationData, user, loadTankCalibration, canManageCalibration],
  )

  const batchUpdateCalibration = useCallback(
    async (
      sheetId: string,
      operations: BatchCalibrationOperations,
      reason: string,
    ) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId || !user) return
      if (!canManageCalibration) {
        toast.error('Você não tem permissão para editar arqueação.')
        throw new Error('Permission denied')
      }
      try {
        await sheetService.batchUpdateCalibration(
          tankId,
          operations,
          reason,
          user.id,
        )
        await loadTankCalibration(tankId)
        toast.success('Alterações salvas com sucesso!')
      } catch (error: any) {
        console.error('Error batch updating calibration:', error)
        toast.error('Erro ao salvar alterações: ' + error.message)
        throw error
      }
    },
    [user, loadTankCalibration, canManageCalibration],
  )

  const importCalibrationDataWithReason = useCallback(
    async (sheetId: string, file: File, reason: string) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId || !user) return 0
      if (!canManageCalibration) {
        toast.error('Você não tem permissão para importar arqueação.')
        throw new Error('Permission denied')
      }
      try {
        const count = await sheetService.importCalibrationData(
          tankId,
          file,
          reason,
          user.id,
        )
        await loadTankCalibration(tankId)
        return count
      } catch (error: any) {
        console.error('Error importing calibration data:', error)
        throw error
      }
    },
    [user, loadTankCalibration, canManageCalibration],
  )

  const exportCalibrationData = useCallback(
    async (sheetId: string) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId) return
      let tankTag = tankId
      const project = projects.find((p) => p.tanks.some((t) => t.id === tankId))
      const tank = project?.tanks.find((t) => t.id === tankId)
      if (tank) tankTag = tank.tag
      try {
        const blob = await sheetService.exportCalibrationData(tankId)
        if (!blob || !(blob instanceof Blob))
          throw new Error('Dados recebidos em formato inválido.')
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cleanTag = tankTag.replace(/[^a-z0-9-_]/gi, '_')
        a.download = `calibration_data_${cleanTag}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Download iniciado!')
      } catch (error: any) {
        console.error('Error exporting data:', error)
        toast.error(error.message || 'Dados recebidos em formato inválido.')
      }
    },
    [projects],
  )

  const deleteCalibrationTable = useCallback(
    async (sheetId: string, reason: string) => {
      const tankId = getTankIdFromSheetId(sheetId)
      if (!tankId || !user) return
      if (!canManageCalibration) {
        toast.error('Você não tem permissão para deletar arqueação.')
        throw new Error('Permission denied')
      }
      try {
        await sheetService.deleteCalibrationData(tankId, reason, user.id)
        setCalibrationData((prev) => ({ ...prev, [sheetId]: [] }))
        setCalibrationCounts((prev) => ({ ...prev, [sheetId]: 0 }))
        setCalibrationLookupData((prev) => ({ ...prev, [tankId]: [] }))
        toast.success('Tabela de arqueação deletada com sucesso!')
      } catch (error: any) {
        console.error('Error deleting calibration data:', error)
        toast.error('Erro ao deletar tabela: ' + error.message)
        throw error
      }
    },
    [user, canManageCalibration],
  )

  const updateProductionRow = useCallback(
    (
      sheetId: string,
      index: number,
      field: keyof ProductionRow,
      value: any,
    ) => {
      if (currentProjectRole === 'viewer') {
        toast.error('Modo leitura.')
        return
      }
      setProductionData((prev) => {
        const currentRows = prev[sheetId] || []
        const newData = [...currentRows]

        if (field === 'AB_FCV') {
          if (value === '' || value === null || value === undefined) {
            const { AB_FCV_Manual: _AB_FCV_Manual, ...rest } = newData[index]
            newData[index] = rest as ProductionRow
          } else {
            newData[index] = { ...newData[index], AB_FCV_Manual: value }
          }
        } else {
          newData[index] = { ...newData[index], [field]: value }
        }

        const tankId = getTankIdFromSheetId(sheetId)
        const currentCalData = tankId ? calibrationLookupData[tankId] || [] : []

        for (let i = index; i < newData.length; i++) {
          const prevRow = i > 0 ? newData[i - 1] : undefined
          const newRow = calculateProductionRow(
            newData[i],
            prevRow,
            currentCalData,
          )

          // Logging FCV calculation if inputs changed and FCV is valid
          if (
            (field === 'X_Temp_Fluido' ||
              field === 'Z_Densidade_Lab_20C' ||
              field === 'AA_T_Observada_C') &&
            user
          ) {
            const fcv =
              typeof newRow.AB_FCV === 'number'
                ? newRow.AB_FCV
                : parseFloat(String(newRow.AB_FCV))
            const density =
              typeof newRow.Z_Densidade_Lab_20C === 'number'
                ? newRow.Z_Densidade_Lab_20C
                : parseFloat(String(newRow.Z_Densidade_Lab_20C))
            const temp =
              typeof newRow.AA_T_Observada_C === 'number'
                ? newRow.AA_T_Observada_C
                : parseFloat(String(newRow.AA_T_Observada_C))

            if (!isNaN(density) && !isNaN(temp) && !isNaN(fcv) && density > 0) {
              fcvLogService.logCalculation({
                userId: user.id,
                fluidTempC: temp,
                observedDensityGcm3: density,
                densityAt20cGcm3: density / fcv,
                fcv: fcv,
              })
            }
          }

          newData[i] = newRow
        }
        return { ...prev, [sheetId]: newData }
      })
    },
    [calibrationLookupData, user, currentProjectRole],
  )

  const addProductionRow = useCallback(
    (sheetId: string) => {
      if (currentProjectRole === 'viewer') {
        toast.error('Modo leitura.')
        return
      }
      setProductionData((prev) => {
        const currentRows = prev[sheetId] || []
        const lastRow = currentRows[currentRows.length - 1]
        const newRow: ProductionRow = {
          ...INITIAL_PRODUCTION_ROW,
          id: `row-${Date.now()}`,
        }
        if (lastRow && lastRow.E_Altura_Liq_Final_mm !== '') {
          newRow.B_Altura_Liq_Inicial_mm = lastRow.E_Altura_Liq_Final_mm
        }
        const tankId = getTankIdFromSheetId(sheetId)
        const currentCalData = tankId ? calibrationLookupData[tankId] || [] : []
        const calculatedNewRow = calculateProductionRow(
          newRow,
          lastRow,
          currentCalData,
        )
        return { ...prev, [sheetId]: [...currentRows, calculatedNewRow] }
      })
    },
    [calibrationLookupData, currentProjectRole],
  )

  const deleteProductionRow = useCallback(
    (sheetId: string, index: number) => {
      if (currentProjectRole === 'viewer') {
        toast.error('Modo leitura.')
        return
      }
      setProductionData((prev) => {
        const currentRows = prev[sheetId] || []
        const newData = currentRows.filter((_, i) => i !== index)
        const tankId = getTankIdFromSheetId(sheetId)
        const currentCalData = tankId ? calibrationLookupData[tankId] || [] : []
        for (let i = index; i < newData.length; i++) {
          const prevRow = i > 0 ? newData[i - 1] : undefined
          newData[i] = calculateProductionRow(
            newData[i],
            prevRow,
            currentCalData,
          )
        }
        return { ...prev, [sheetId]: newData }
      })
    },
    [calibrationLookupData, currentProjectRole],
  )

  const setCalibrationDataForSheet = useCallback(
    (sheetId: string, data: CalibrationRow[]) => {
      if (!canManageCalibration) {
        return
      }
      setCalibrationData((prev) => ({ ...prev, [sheetId]: data }))
    },
    [canManageCalibration],
  )

  const setSealDataForSheet = useCallback(
    (sheetId: string, data: SealRow[]) => {
      if (currentProjectRole === 'viewer') {
        return
      }
      setSealData((prev) => ({ ...prev, [sheetId]: data }))
    },
    [currentProjectRole],
  )

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        currentProjectRole,
        setCurrentProject,
        isLoadingProjects,
        projectsError,
        refreshProjects,
        productionFields,
        wells,
        transferDestinationCategories,
        refreshMetadata,
        members,
        isLoadingMembers,
        fetchMembers,
        inviteMember,
        updateMemberRole,
        removeMember,
        logoUrl,
        refreshLogo,
        updateLogo,
        removeLogo,
        updateProjectLogo,
        removeProjectLogo,
        productionData,
        calibrationData,
        calibrationLookupData,
        loadTankCalibration,
        calibrationCounts,
        sealData,
        tankOperations,
        loadOperations,
        addOperation,
        updateOperation,
        deleteOperation,
        getLastClosedOperation,
        getLastOperationBefore,
        getLastClosedReport,
        getLastOperationByReportId,
        getContinuityLevel,
        isSheetLoading,
        addTank,
        updateTank,
        deleteTank,
        createProject,
        deleteProject,
        clearProjectData,
        createProductionField,
        updateProductionField,
        deleteProductionField,
        createWell,
        deleteWell,
        createTransferDestinationCategory,
        updateTransferDestinationCategory,
        deleteTransferDestinationCategory,
        updateProductionRow,
        addProductionRow,
        deleteProductionRow,
        recalculateProductionForDay,
        syncProductionConsolidation,
        setCalibrationDataForSheet,
        saveCalibrationDataWithReason,
        batchUpdateCalibration,
        importCalibrationDataWithReason,
        exportCalibrationData,
        deleteCalibrationTable,
        setSealDataForSheet,
        loadSheetData,
        saveSheetData,
        getReports,
        getReportByDate,
        getReportsForTanksByDate,
        closeReport,
        createDailyReport,
        isDateClosed,
        closeDayAndStartNext,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context)
    throw new Error('useProject must be used within a ProjectProvider')
  return context
}
