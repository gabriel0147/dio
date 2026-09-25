import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Well,
  SrtTankSession,
  SrtCalibrationRow,
  SrtWellTest,
} from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/context/ProjectContext'
import { srtService } from '@/services/srtService'
import { fcvLogService } from '@/services/fcvLogService'
import { bswService, type ApplicableLabBsw } from '@/services/bswService'
import { lookupCalibrationValue } from '@/lib/calculations'
import { calculateFtc, calculateSrtMeasurement } from '@/lib/srtMeasurements'
import { toast } from 'sonner'
import {
  Loader2,
  Calculator,
  AlertTriangle,
  Droplets,
  Info,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const optionalNumber = z.union([
  z.number(),
  z.string().transform((val) => (val === '' ? undefined : Number(val))),
])

const testSchema = z.object({
  sessionId: z.string().min(1, 'Planejamento (Sessão) é obrigatório'),
  wellId: z.string().min(1, 'Tanque com poço vinculado é obrigatório'),
  testStartAt: z.string().min(1, 'Início é obrigatório'),
  testEndAt: z.string().min(1, 'Fim é obrigatório'),
  testType: z.enum([
    'apropriacao',
    'operacional',
    'diagnostico',
    'comissionamento',
  ]),
  status: z.enum(['rascunho', 'valido', 'invalido', 'vigente']),

  initialHeightMm: optionalNumber.optional(),
  finalHeightMm: optionalNumber.optional(),
  emulsionHeightMm: optionalNumber.optional(),

  vLiqTest: z.coerce.number().min(0), // Total Fluid (Emulsion + Free Water)
  vWatTest: z.coerce.number().min(0), // Total Water

  // Hidden breakdown fields for schema validation/persistence
  vEmulsion: z.coerce.number().min(0),
  vFreeWater: z.coerce.number().min(0),
  vWaterInEmulsion: z.coerce.number().min(0),
  vWaterTotal: z.coerce.number().min(0),

  vGasTest: z.coerce.number().min(0),

  bswEmulsionPct: z.coerce.number().min(0).max(100),

  temperatureAvg: optionalNumber.optional(),
  density: optionalNumber.optional(),

  fe: optionalNumber.optional(),
  fcv: optionalNumber.optional(),

  notes: z.string().optional(),
})

const toSixDecimals = (num: number) => {
  if (!Number.isFinite(num)) return '0.000000'
  return num.toFixed(6)
}

const safeParseFloat = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value
  const parsed = parseFloat(value.toString().replace(',', '.'))
  return isNaN(parsed) ? defaultValue : parsed
}

const parseFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const TEST_FORM_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000
type TestFormInput = z.input<typeof testSchema>
type TestFormValues = z.output<typeof testSchema>

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

interface TestFormProps {
  wells: Well[]
  openSessions: SrtTankSession[]
  preselectedSessionId?: string | null
  initialData?: SrtWellTest | null
}

export function TestForm({
  wells,
  openSessions,
  preselectedSessionId,
  initialData,
}: TestFormProps) {
  const { user } = useAuth()
  const { currentProject } = useProject()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tankCalibration, setTankCalibration] = useState<SrtCalibrationRow[]>(
    [],
  )
  const [isLoadingCalibration, setIsLoadingCalibration] = useState(false)
  const [calibrationNotice, setCalibrationNotice] = useState<string | null>(
    null,
  )
  const [fcvLookupMessage, setFcvLookupMessage] = useState<string | null>(null)
  const [isLookingUpFcv, setIsLookingUpFcv] = useState(false)
  const [hasFiscalFcv, setHasFiscalFcv] = useState(false)
  const [applicableLabBsw, setApplicableLabBsw] =
    useState<ApplicableLabBsw | null>(null)
  const [bswLookupMessage, setBswLookupMessage] = useState<string | null>(null)
  const [isLookingUpBsw, setIsLookingUpBsw] = useState(false)
  const lastHydratedSessionId = useRef<string | null>(null)
  const draftRestoredRef = useRef(false)
  const draftStorageKey = `srt-test-form-draft:${currentProject?.id || 'no-project'}:${initialData?.id || preselectedSessionId || 'new'}`

  // State for detailed breakdown
  const [breakdown, setBreakdown] = useState({
    vTotal: 0,
    vEmulsion: 0,
    vFreeWater: 0,
    vWatEmulsion: 0,
    vWatTotal: 0,
  })

  const form = useForm<TestFormInput, unknown, TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      sessionId: preselectedSessionId || '',
      wellId: '',
      testStartAt: '',
      testEndAt: '',
      testType: 'operacional',
      status: 'rascunho',
      vLiqTest: 0,
      vWatTest: 0,
      vEmulsion: 0,
      vFreeWater: 0,
      vWaterInEmulsion: 0,
      vWaterTotal: 0,
      vGasTest: 0,
      bswEmulsionPct: 0,
      fe: 1,
      fcv: undefined,
      initialHeightMm: undefined,
      finalHeightMm: undefined,
      emulsionHeightMm: undefined,
      notes: '',
    },
  })

  const clearDraft = () => {
    localStorage.removeItem(draftStorageKey)
  }

  useEffect(() => {
    if (initialData || draftRestoredRef.current) return

    const raw = localStorage.getItem(draftStorageKey)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as {
        updatedAt: number
        values: z.infer<typeof testSchema>
        breakdown?: typeof breakdown
      }

      if (
        !parsed.updatedAt ||
        Date.now() - parsed.updatedAt > TEST_FORM_DRAFT_MAX_AGE_MS
      ) {
        localStorage.removeItem(draftStorageKey)
        return
      }

      form.reset(parsed.values)
      if (parsed.breakdown) setBreakdown(parsed.breakdown)
      draftRestoredRef.current = true
    } catch {
      localStorage.removeItem(draftStorageKey)
    }
  }, [breakdown, draftStorageKey, form, initialData])

  useEffect(() => {
    if (initialData) return

    const subscription = form.watch((values) => {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          updatedAt: Date.now(),
          values,
          breakdown,
        }),
      )
    })

    return () => subscription.unsubscribe()
  }, [breakdown, draftStorageKey, form, initialData])

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      form.reset({
        sessionId: initialData.sessionId,
        wellId: initialData.wellId,
        testStartAt: new Date(initialData.testStartAt)
          .toISOString()
          .slice(0, 16),
        testEndAt: new Date(initialData.testEndAt).toISOString().slice(0, 16),
        testType: initialData.testType,
        status: initialData.status,
        vLiqTest: initialData.vLiqTest,
        vWatTest: initialData.vWatTest,
        vEmulsion: initialData.vEmulsion || 0,
        vFreeWater: initialData.vFreeWater || 0,
        vWaterInEmulsion: initialData.vWaterInEmulsion || 0,
        vWaterTotal: initialData.vWaterTotal || 0,
        vGasTest: initialData.vGasTest,
        bswEmulsionPct: initialData.bswEmulsionPct,
        fe: initialData.fe || 1,
        fcv:
          initialData.fcv !== undefined && initialData.fcv !== null
            ? (initialData.fcv.toFixed(6) as any)
            : undefined,
        temperatureAvg: initialData.temperatureAvg,
        density: initialData.density,
        initialHeightMm: initialData.initialHeightMm,
        finalHeightMm: initialData.finalHeightMm ?? initialData.totalHeightMm,
        emulsionHeightMm:
          initialData.emulsionHeightMm ?? initialData.afterDrainageHeightMm,
        notes: initialData.notes || '',
      })
      setHasFiscalFcv(initialData.fcv !== undefined && initialData.fcv !== null)

      // Update breakdown state
      setBreakdown({
        vTotal: initialData.vLiqTest || 0,
        vEmulsion: initialData.vEmulsion || 0,
        vFreeWater: initialData.vFreeWater || 0,
        vWatEmulsion: initialData.vWaterInEmulsion || 0,
        vWatTotal: initialData.vWaterTotal || 0,
      })
    }
  }, [initialData, form])

  const sessionId = form.watch('sessionId')
  const referenceTestEndAt = form.watch('testEndAt')
  const selectedSession = useMemo(
    () => openSessions.find((session) => session.id === sessionId),
    [openSessions, sessionId],
  )
  const tankOptions = useMemo(() => {
    const wellMap = new Map(wells.map((well) => [well.id, well.name]))
    const options = new Map<
      string,
      {
        tankId: string
        tankName: string
        wellId?: string
        wellName?: string
        sessionId?: string
      }
    >()

    currentProject?.tanks.forEach((tank) => {
      options.set(tank.id, {
        tankId: tank.id,
        tankName: tank.tag,
        wellId: tank.wellId,
        wellName:
          tank.wellName || (tank.wellId ? wellMap.get(tank.wellId) : undefined),
      })
    })

    openSessions.forEach((session) => {
      options.set(session.tankId, {
        tankId: session.tankId,
        tankName:
          session.tankName ||
          options.get(session.tankId)?.tankName ||
          'Tanque não identificado',
        wellId: session.wellId || options.get(session.tankId)?.wellId,
        wellName:
          session.wellName ||
          options.get(session.tankId)?.wellName ||
          (session.wellId ? wellMap.get(session.wellId) : undefined),
        sessionId: session.id,
      })
    })

    return Array.from(options.values()).sort((a, b) =>
      a.tankName.localeCompare(b.tankName),
    )
  }, [currentProject?.tanks, openSessions, wells])

  useEffect(() => {
    if (initialData || !selectedSession?.tankId || !selectedSession?.wellId) {
      setApplicableLabBsw(null)
      setBswLookupMessage(null)
      return
    }

    let isCurrent = true
    setIsLookingUpBsw(true)
    setBswLookupMessage('Buscando último lançamento de BSW do tanque/poço...')

    bswService
      .getApplicableLabBsw(
        selectedSession.tankId,
        selectedSession.wellId,
        referenceTestEndAt || new Date(),
      )
      .then((record) => {
        if (!isCurrent) return

        if (!record) {
          setApplicableLabBsw(null)
          setBswLookupMessage(
            'Nenhum lançamento de BSW encontrado para este tanque/poço.',
          )
          return
        }

        setApplicableLabBsw(record)
        form.setValue('bswEmulsionPct', record.bswEmulsionPct, {
          shouldValidate: true,
        })
        setBswLookupMessage(
          `BSWe laboratorial de ${format(parseISO(record.testEndAt), 'dd/MM/yyyy HH:mm')}.`,
        )
      })
      .catch((error) => {
        if (!isCurrent) return
        console.error('Erro ao buscar BSW do tanque/poço:', error)
        setApplicableLabBsw(null)
        setBswLookupMessage('Erro ao buscar o último lançamento de BSW.')
      })
      .finally(() => {
        if (isCurrent) setIsLookingUpBsw(false)
      })

    return () => {
      isCurrent = false
    }
  }, [
    initialData,
    referenceTestEndAt,
    selectedSession?.tankId,
    selectedSession?.wellId,
    form,
  ])

  const loadCalibration = useCallback(
    (selectedSessionId: string) => {
      setIsLoadingCalibration(true)
      setCalibrationNotice(null)
      srtService
        .getSessionCalibration(selectedSessionId)
        .then((data) => {
          const sortedData = [...data].sort((a, b) => a.heightMm - b.heightMm)
          setTankCalibration(sortedData)
          if (sortedData.length === 0) {
            setCalibrationNotice(
              `O tanque ${selectedSession?.tankName || ''} não possui tabela de arqueação cadastrada. Sem essa tabela, o sistema não consegue converter altura em volume.`,
            )
          }
        })
        .catch((error) => {
          console.error('Failed to fetch tank calibration', error)
          setTankCalibration([])
          setCalibrationNotice(
            'Não foi possível carregar a tabela de arqueação do tanque.',
          )
          toast.error('Erro ao carregar tabela de arqueação do tanque.')
        })
        .finally(() => {
          setIsLoadingCalibration(false)
        })
    },
    [selectedSession?.tankName],
  )

  useEffect(() => {
    if (sessionId) {
      // Find session in openSessions list OR fetch specifically if editing past session
      let session = openSessions.find((s) => s.id === sessionId)

      if (!session && initialData && initialData.sessionId === sessionId) {
        // If editing a test from a closed session, we might need to fetch session details specifically
        // For now, assume openSessions contains relevant sessions or we fetch separately.
        // If session not found in list, we can't load calibration easily without fetching session first.
        // Assuming openSessions list passed might include closed ones if needed, or we fetch session by ID.
        // Let's try to fetch if not found
        srtService
          .getSessions(false, currentProject?.id)
          .then((all) => {
            const found = all.find((s) => s.id === sessionId)
            if (found) {
              loadCalibration(found.id)
            }
          })
          .catch(() => {})
      } else if (session) {
        if (!initialData && session.wellId) {
          form.setValue('wellId', session.wellId)
        }
        loadCalibration(session.id)
      }
    } else {
      setTankCalibration([])
      setCalibrationNotice(null)
    }
  }, [
    sessionId,
    openSessions,
    form,
    initialData,
    currentProject,
    loadCalibration,
  ])

  useEffect(() => {
    if (initialData || !selectedSession) return

    const sessionChanged = lastHydratedSessionId.current !== selectedSession.id

    if (
      selectedSession.wellId &&
      (sessionChanged || !form.getValues('wellId'))
    ) {
      form.setValue('wellId', selectedSession.wellId, { shouldValidate: true })
    }

    const sessionStartAt = toDateTimeLocalValue(selectedSession.startAt)
    if (sessionStartAt && (sessionChanged || !form.getValues('testStartAt'))) {
      form.setValue('testStartAt', sessionStartAt)
    }

    if (
      selectedSession.notes?.trim() &&
      (sessionChanged || !form.getValues('notes')?.trim())
    ) {
      form.setValue('notes', selectedSession.notes)
    }

    lastHydratedSessionId.current = selectedSession.id
  }, [selectedSession, form, initialData])

  const initialHeightMmRaw = form.watch('initialHeightMm')
  const finalHeightMmRaw = form.watch('finalHeightMm')
  const emulsionHeightMmRaw = form.watch('emulsionHeightMm')
  const bswEmulsionRaw = form.watch('bswEmulsionPct')
  const startAt = form.watch('testStartAt')
  const endAt = form.watch('testEndAt')
  const temperatureAvgRaw = form.watch('temperatureAvg')
  const densityRaw = form.watch('density')
  const feRaw = form.watch('fe')
  const fcvRaw = form.watch('fcv')

  useEffect(() => {
    const temp = safeParseFloat(temperatureAvgRaw)
    const density = safeParseFloat(densityRaw)

    const hasTemperature =
      temperatureAvgRaw !== null &&
      temperatureAvgRaw !== undefined &&
      temperatureAvgRaw !== ''
    const hasDensity =
      densityRaw !== null && densityRaw !== undefined && densityRaw !== ''

    if (!hasTemperature || !hasDensity || density <= 0) {
      setFcvLookupMessage(
        'Informe Temp. Média e Densidade para buscar o FCV no Fiscal Log.',
      )
      setHasFiscalFcv(false)
      form.setValue('fcv', undefined, { shouldValidate: true })
      return
    }

    let isCurrent = true
    setIsLookingUpFcv(true)
    setFcvLookupMessage('Buscando FCV no histórico fiscal...')

    const timer = window.setTimeout(async () => {
      try {
        const log = await fcvLogService.findMatchingCalculation(temp, density)
        if (!isCurrent) return

        if (log) {
          form.setValue('fcv', log.fcv.toFixed(6) as any, {
            shouldValidate: true,
          })
          setHasFiscalFcv(true)
          setFcvLookupMessage(
            `FCV puxado do Fiscal Log em ${format(parseISO(log.calculatedAt), 'dd/MM/yyyy HH:mm')}.`,
          )
        } else {
          form.setValue('fcv', undefined, { shouldValidate: true })
          setHasFiscalFcv(false)
          setFcvLookupMessage(
            'Não existe cálculo de FCV para essa temperatura e densidade. Faça o cálculo na tela de FCV para liberar este campo.',
          )
        }
      } catch (error) {
        if (!isCurrent) return
        console.error('Erro ao buscar FCV no histórico fiscal:', error)
        form.setValue('fcv', undefined, { shouldValidate: true })
        setHasFiscalFcv(false)
        setFcvLookupMessage('Erro ao buscar FCV no histórico fiscal.')
      } finally {
        if (isCurrent) setIsLookingUpFcv(false)
      }
    }, 350)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
    }
  }, [temperatureAvgRaw, densityRaw, form])

  const calculations = useMemo(() => {
    const feVal = safeParseFloat(feRaw, 1)
    const fcvVal = safeParseFloat(fcvRaw, 1)
    const tempVal =
      temperatureAvgRaw !== undefined && temperatureAvgRaw !== ''
        ? safeParseFloat(temperatureAvgRaw)
        : 20
    const ftc = calculateFtc(tempVal)
    let durationH = 0
    if (startAt && endAt) {
      const start = new Date(startAt)
      const end = new Date(endAt)
      if (end > start) {
        durationH = (end.getTime() - start.getTime()) / 3_600_000
      }
    }

    const empty = {
      durationH,
      vOilNet: 0,
      vWatTotal: 0,
      potLiq: 0,
      potOil: 0,
      potWat: 0,
      bswTotal: 0,
      ftc,
      vOilCorrected: 0,
      vGrossLiquid: 0,
      initialVolumeM3: 0,
      finalVolumeM3: 0,
      emulsionLevelVolumeM3: 0,
      valid: false,
    }

    if (
      tankCalibration.length === 0 ||
      initialHeightMmRaw === undefined ||
      initialHeightMmRaw === '' ||
      finalHeightMmRaw === undefined ||
      finalHeightMmRaw === '' ||
      emulsionHeightMmRaw === undefined ||
      emulsionHeightMmRaw === '' ||
      durationH <= 0
    ) {
      return empty
    }

    const initialHeight = parseFiniteNumber(initialHeightMmRaw)
    const finalHeight = parseFiniteNumber(finalHeightMmRaw)
    const emulsionHeight = parseFiniteNumber(emulsionHeightMmRaw)
    const minimumHeight = tankCalibration[0]?.heightMm
    const maximumHeight = tankCalibration[tankCalibration.length - 1]?.heightMm
    if (
      initialHeight === null ||
      finalHeight === null ||
      emulsionHeight === null ||
      minimumHeight === undefined ||
      maximumHeight === undefined ||
      initialHeight < minimumHeight ||
      finalHeight > maximumHeight ||
      initialHeight > emulsionHeight ||
      emulsionHeight > finalHeight
    ) {
      return empty
    }

    const calibration = tankCalibration.map((row) => ({
      ...row,
      altura_mm: row.heightMm,
      volume_m3: row.volumeM3,
    }))
    const initialVolumeM3 = lookupCalibrationValue(
      initialHeight,
      calibration,
      'volume_m3',
    )
    const finalVolumeM3 = lookupCalibrationValue(
      finalHeight,
      calibration,
      'volume_m3',
    )
    const emulsionLevelVolumeM3 = lookupCalibrationValue(
      emulsionHeight,
      calibration,
      'volume_m3',
    )

    try {
      const result = calculateSrtMeasurement({
        initialVolumeM3,
        finalVolumeM3,
        emulsionLevelVolumeM3,
        bswEmulsionPct: safeParseFloat(bswEmulsionRaw),
        fcv: fcvVal,
        fe: feVal,
        ftc,
        durationHours: durationH,
      })
      return {
        durationH,
        vOilNet: result.uncorrectedOilVolumeM3,
        vWatTotal: result.totalWaterVolumeM3,
        potLiq: result.liquidPotential24hM3,
        potOil: result.correctedOilPotential24hM3,
        potWat: result.waterPotential24hM3,
        bswTotal: result.totalBswPct,
        ftc,
        vOilCorrected: result.correctedOilVolumeM3,
        vGrossLiquid: result.totalVolumeM3,
        initialVolumeM3,
        finalVolumeM3,
        emulsionLevelVolumeM3,
        valid: true,
      }
    } catch {
      return empty
    }
  }, [
    emulsionHeightMmRaw,
    finalHeightMmRaw,
    initialHeightMmRaw,
    bswEmulsionRaw,
    startAt,
    endAt,
    temperatureAvgRaw,
    feRaw,
    fcvRaw,
    tankCalibration,
  ])

  useEffect(() => {
    const nextBreakdown = calculations.valid
      ? {
          vTotal: calculations.vGrossLiquid,
          vEmulsion:
            calculations.finalVolumeM3 - calculations.emulsionLevelVolumeM3,
          vFreeWater:
            calculations.emulsionLevelVolumeM3 - calculations.initialVolumeM3,
          vWatEmulsion:
            calculations.vWatTotal -
            (calculations.emulsionLevelVolumeM3 - calculations.initialVolumeM3),
          vWatTotal: calculations.vWatTotal,
        }
      : { vTotal: 0, vEmulsion: 0, vFreeWater: 0, vWatEmulsion: 0, vWatTotal: 0 }
    setBreakdown(nextBreakdown)
    form.setValue('vLiqTest', nextBreakdown.vTotal)
    form.setValue('vWatTest', nextBreakdown.vWatTotal)
    form.setValue('vEmulsion', nextBreakdown.vEmulsion)
    form.setValue('vFreeWater', nextBreakdown.vFreeWater)
    form.setValue('vWaterInEmulsion', nextBreakdown.vWatEmulsion)
    form.setValue('vWaterTotal', nextBreakdown.vWatTotal)
  }, [calculations, form])

  const parsedInitialHeight = parseFiniteNumber(initialHeightMmRaw)
  const parsedEmulsionHeight = parseFiniteNumber(emulsionHeightMmRaw)
  const parsedFinalHeight = parseFiniteNumber(finalHeightMmRaw)
  const minimumCalibrationHeight = tankCalibration[0]?.heightMm
  const maximumCalibrationHeight = tankCalibration.at(-1)?.heightMm
  const heightOrderInvalid =
    parsedInitialHeight !== null &&
    parsedEmulsionHeight !== null &&
    parsedFinalHeight !== null &&
    (parsedInitialHeight > parsedEmulsionHeight ||
      parsedEmulsionHeight > parsedFinalHeight)
  const heightRangeInvalid =
    parsedInitialHeight !== null &&
    parsedFinalHeight !== null &&
    minimumCalibrationHeight !== undefined &&
    maximumCalibrationHeight !== undefined &&
    (parsedInitialHeight < minimumCalibrationHeight ||
      parsedFinalHeight > maximumCalibrationHeight)

  const onSubmit = async (values: TestFormValues) => {
    if (!user) return

    if (!calculations.valid || heightOrderInvalid || heightRangeInvalid) {
      toast.error(
        'Informe alturas válidas respeitando Mi ≤ Me ≤ Mf e os limites da tabela de arqueação.',
      )
      return
    }

    if (calculations.durationH < 4 && calculations.durationH > 0) {
      toast.warning('Aviso: Duração do teste abaixo de 4 horas.')
    }

    if (!hasFiscalFcv) {
      toast.error(
        'FCV não encontrado no Fiscal Log. Faça o cálculo na tela de FCV antes de salvar o teste.',
      )
      return
    }

    const session = openSessions.find((s) => s.id === values.sessionId)
    // Only check dates if session is open and we are creating new, or logic applies to updates too?
    // Let's keep logic but be aware session might be closed/undefined if loading old data
    if (session) {
      const testStart = parseISO(values.testStartAt)
      const testEnd = parseISO(values.testEndAt)
      const sessionStart = parseISO(session.startAt)
      const sessionEnd = session.endAt ? parseISO(session.endAt) : null

      if (testStart < sessionStart) {
        toast.error(
          'Erro R4: O teste não pode iniciar antes da abertura do planejamento.',
        )
        return
      }
      if (sessionEnd && testEnd > sessionEnd) {
        toast.error(
          'Erro R4: O teste não pode terminar após o fechamento do planejamento.',
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      const metricsJson = JSON.stringify(
        {
          breakdown: {
            vTotal: breakdown.vTotal,
            vFreeWater: breakdown.vFreeWater,
            vEmulsion: breakdown.vEmulsion,
            vWatEmulsion: breakdown.vWatEmulsion,
            vWatTotal: breakdown.vWatTotal,
          },
        },
        null,
        2,
      )

      const finalNotes =
        (values.notes ? values.notes + '\n\n' : '') +
        `[System Metrics]\n${metricsJson}`

      const payload = {
        sessionId: values.sessionId,
        wellId: values.wellId,
        testStartAt: new Date(values.testStartAt).toISOString(),
        testEndAt: new Date(values.testEndAt).toISOString(),
        testType: values.testType as any,
        status: values.status as any,
        vLiqTest: safeParseFloat(values.vLiqTest),
        vOilTest: calculations.vOilNet || 0,
        vWatTest: calculations.vWatTotal || 0,
        vGasTest: safeParseFloat(values.vGasTest),
        vEmulsion: values.vEmulsion,
        vFreeWater: values.vFreeWater,
        vWaterInEmulsion: values.vWaterInEmulsion,
        vWaterTotal: values.vWaterTotal,
        bswEmulsionPct: safeParseFloat(values.bswEmulsionPct),
        temperatureAvg:
          values.temperatureAvg !== undefined
            ? safeParseFloat(values.temperatureAvg)
            : undefined,
        density:
          values.density !== undefined
            ? safeParseFloat(values.density)
            : undefined,
        fe: values.fe !== undefined ? safeParseFloat(values.fe) : undefined,
        fcv: values.fcv !== undefined ? safeParseFloat(values.fcv) : undefined,
        fdt: calculations.ftc,
        ftc: calculations.ftc,
        vOilCorrected: calculations.vOilCorrected || 0,
        initialHeightMm: safeParseFloat(values.initialHeightMm),
        finalHeightMm: safeParseFloat(values.finalHeightMm),
        emulsionHeightMm: safeParseFloat(values.emulsionHeightMm),
        initialLevelVolumeM3: calculations.initialVolumeM3,
        finalLevelVolumeM3: calculations.finalVolumeM3,
        emulsionLevelVolumeM3: calculations.emulsionLevelVolumeM3,
        sourceBswTestId: applicableLabBsw?.testId,
        totalHeightMm: safeParseFloat(values.finalHeightMm),
        afterDrainageHeightMm: safeParseFloat(values.emulsionHeightMm),
        notes: finalNotes,
      }

      if (initialData) {
        await srtService.updateTest(initialData.id, payload, user.id)
        toast.success('Teste atualizado com sucesso!')
      } else {
        await srtService.createTest(payload, user.id)
        toast.success('Teste registrado com sucesso!')
        clearDraft()
        form.reset()
        setBreakdown({
          vTotal: 0,
          vEmulsion: 0,
          vFreeWater: 0,
          vWatEmulsion: 0,
          vWatTotal: 0,
        })
      }
    } catch (e: any) {
      toast.error('Erro ao salvar teste: ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              {selectedSession && (
                <CardContent className="border-b bg-muted/20 py-4">
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <span className="font-semibold">Tanque:</span>{' '}
                      {selectedSession.tankName || '-'}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Poço do Planejamento:
                      </span>{' '}
                      {selectedSession.wellName || '-'}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Início do Planejamento:
                      </span>{' '}
                      {toDateTimeLocalValue(selectedSession.startAt).replace(
                        'T',
                        ' ',
                      )}
                    </div>
                  </div>
                  {selectedSession.notes?.trim() && (
                    <div className="mt-3 rounded-md border bg-background p-3 text-sm">
                      <span className="font-semibold">
                        Observações do Planejamento:
                      </span>{' '}
                      {selectedSession.notes}
                    </div>
                  )}
                </CardContent>
              )}
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planejamento (Sessão)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!preselectedSessionId || !!initialData}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o planejamento..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {openSessions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.tankName}
                              {s.wellName ? ` - ${s.wellName}` : ''} - Iniciado
                              em {new Date(s.startAt).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wellId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanque</FormLabel>
                      <Select
                        onValueChange={(selectedTankId) => {
                          const session = openSessions.find(
                            (item) => item.tankId === selectedTankId,
                          )
                          const tank = tankOptions.find(
                            (item) => item.tankId === selectedTankId,
                          )

                          form.setValue('sessionId', session?.id || '', {
                            shouldValidate: true,
                          })
                          field.onChange(session?.wellId || tank?.wellId || '')
                        }}
                        value={selectedSession?.tankId || ''}
                        disabled={!!preselectedSessionId || !!initialData}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tanque..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tankOptions.map((tank) => (
                            <SelectItem key={tank.tankId} value={tank.tankId}>
                              {tank.tankName}
                              {tank.wellName ? ` - ${tank.wellName}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" {...field} />
                      <FormMessage />
                      {selectedSession?.wellId && (
                        <FormDescription>
                          Tanque e poço herdados do planejamento selecionado.
                        </FormDescription>
                      )}
                      {!selectedSession?.wellId && selectedSession && (
                        <FormDescription>
                          O tanque selecionado não possui poço vinculado.
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="testStartAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início do Teste</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="testEndAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim do Teste</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="testType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="operacional">
                            Operacional
                          </SelectItem>
                          <SelectItem value="apropriacao">
                            Apropriação
                          </SelectItem>
                          <SelectItem value="diagnostico">
                            Diagnóstico
                          </SelectItem>
                          <SelectItem value="comissionamento">
                            Comissionamento
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="valido">Válido</SelectItem>
                          <SelectItem value="vigente">
                            Vigente (Atual)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" /> Medições e
                  Volumes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {calibrationNotice && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div>
                        <div className="font-semibold">
                          Tabela de arqueação indisponível
                        </div>
                        <div>{calibrationNotice}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ordem operacional definida no procedimento: Mi / Mf / Me */}
                <div
                  className="grid grid-cols-1 gap-4 md:grid-cols-3"
                  data-testid="srt-measurement-heights"
                >
                  {(
                    [
                      ['initialHeightMm', 'Mi — Medição inicial (mm)', 'Volume Vi'],
                      ['finalHeightMm', 'Mf — Medição final (mm)', 'Volume Vf'],
                      ['emulsionHeightMm', 'Me — Interface da emulsão (mm)', 'Volume Vm'],
                    ] as const
                  ).map(([name, label, volumeLabel]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              aria-invalid={heightOrderInvalid || heightRangeInvalid}
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormDescription>
                            {volumeLabel}:{' '}
                            {toSixDecimals(
                              name === 'initialHeightMm'
                                ? calculations.initialVolumeM3
                                : name === 'finalHeightMm'
                                  ? calculations.finalVolumeM3
                                  : calculations.emulsionLevelVolumeM3,
                            )}{' '}
                            m³
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {heightOrderInvalid ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle /> As alturas devem respeitar Mi ≤ Me ≤ Mf.
                  </p>
                ) : null}
                {heightRangeInvalid ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4" /> As alturas devem
                    ficar entre {minimumCalibrationHeight} mm e{' '}
                    {maximumCalibrationHeight} mm, conforme a arqueação.
                  </p>
                ) : null}

                <div className="border-t"></div>

                {/* Breakdown Result Section */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
                  <h4 className="font-semibold text-sm text-slate-700 uppercase tracking-wide flex justify-between">
                    <span>Detalhamento de Fluidos</span>
                    {isLoadingCalibration && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </h4>
                  {bswLookupMessage && (
                    <p
                      className={`text-xs ${
                        applicableLabBsw
                          ? 'text-muted-foreground'
                          : 'text-destructive'
                      }`}
                    >
                      {isLookingUpBsw ? 'Buscando BSW...' : bswLookupMessage}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Volume Emulsão (Calculated) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">
                        Volume de Emulsão (m³)
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-blue-50/50 px-3 py-2 text-sm text-blue-900 shadow-sm font-semibold">
                        {toSixDecimals(breakdown.vEmulsion)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Volume correspondente à altura da emulsão
                        (pós-drenagem).
                      </p>
                    </div>

                    {/* BSW Input */}
                    <FormField
                      control={form.control}
                      name="bswEmulsionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-600 font-bold">
                            BSW da Emulsão (%)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              max={100}
                               readOnly={!!applicableLabBsw}
                              {...field}
                               className={applicableLabBsw ? 'bg-muted font-bold' : 'font-bold'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Volume Agua Livre (Calculated) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">
                        Volume de Água Livre (m³)
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm">
                        {toSixDecimals(breakdown.vFreeWater)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Volume Total - Volume de Emulsão.
                      </p>
                    </div>

                    {/* Volume Agua Emulsão (Calculated) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">
                        Volume de Água da Emulsão (m³)
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-blue-50/50 px-3 py-2 text-sm text-blue-900 shadow-sm">
                        {toSixDecimals(breakdown.vWatEmulsion)}
                      </div>
                    </div>

                    {/* Volume Agua Total (Calculated) */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-bold text-blue-700">
                        Volume de Água Total (m³)
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-blue-200 bg-blue-100 px-3 py-2 text-base font-bold text-blue-900 shadow-sm">
                        {toSixDecimals(breakdown.vWatTotal)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Soma da água livre e água da emulsão.
                      </p>
                    </div>

                    {/* Hidden Form Fields for Submission Binding */}
                    <div className="hidden">
                      <Input {...form.register('vLiqTest')} />
                      <Input {...form.register('vWatTest')} />
                      <Input {...form.register('vEmulsion')} />
                      <Input {...form.register('vFreeWater')} />
                      <Input {...form.register('vWaterInEmulsion')} />
                      <Input {...form.register('vWaterTotal')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vGasTest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Gás (m³)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parâmetros e Correções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperatureAvg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temp. Média (°C)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="density"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Densidade (g/cm³)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.0001"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="fcv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FCV</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            readOnly
                            placeholder="Busque por temp. e densidade"
                            className="bg-muted font-mono"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        {fcvLookupMessage && (
                          <p
                            className={
                              hasFiscalFcv
                                ? 'text-xs text-muted-foreground'
                                : 'text-xs text-destructive'
                            }
                          >
                            {fcvLookupMessage}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FE</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>FTC</FormLabel>
                    <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted text-sm flex items-center">
                      {toSixDecimals(calculations.ftc)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionais sobre o teste..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isSubmitting || isLookingUpFcv || !hasFiscalFcv}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : initialData ? (
                'Salvar Alterações'
              ) : (
                'Registrar Teste'
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <Card className="sticky top-4 border-blue-200 bg-blue-50/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Calculator className="h-5 w-5" /> Resultados da Medição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tankCalibration.length === 0 && !isLoadingCalibration && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Os volumes e potenciais ficam zerados enquanto o tanque da
                sessão não tiver tabela de arqueação cadastrada.
              </div>
            )}
            {calculations.durationH > 0 ||
            calculations.vOilCorrected > 0 ||
            calculations.vOilNet > 0 ? (
              <>
                <div className="space-y-1 border-b pb-3">
                  <h4 className="text-sm font-bold uppercase text-blue-800">
                    Volumes medidos
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Vi, Vm e Vf foram convertidos da arqueação do tanque; os
                    volumes abaixo usam esses valores sem arredondamento
                    intermediário.
                  </p>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Duração</span>
                  <span className="font-semibold">
                    {toSixDecimals(calculations.durationH)} h
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">
                    Volume bruto medido (Vt)
                  </span>
                  <span className="font-semibold">
                    {toSixDecimals(calculations.vGrossLiquid)} m³
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">
                    Óleo sem correção (Vo)
                  </span>
                  <span className="font-semibold">
                    {toSixDecimals(calculations.vOilNet)} m³
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 bg-blue-100/50 p-2 rounded">
                  <span className="text-sm text-blue-800 font-medium">
                    Óleo corrigido (Voc)
                  </span>
                  <span className="font-bold text-blue-900">
                    {toSixDecimals(calculations.vOilCorrected)} m³
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">
                    BSW Total
                  </span>
                  <span className="font-semibold">
                    {toSixDecimals(calculations.bswTotal)} %
                  </span>
                </div>

                <div className="pt-4 space-y-2">
                  <h4 className="font-bold text-sm text-blue-800 uppercase">
                    Projeções para 24h
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Líquido — Vt / duração × 24
                    </span>
                    <span className="font-mono font-bold text-lg">
                      {toSixDecimals(calculations.potLiq)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Óleo corrigido — Voc / duração × 24
                    </span>
                    <span className="font-mono font-bold text-lg text-green-700">
                      {toSixDecimals(calculations.potOil)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Água — Va / duração × 24
                    </span>
                    <span className="font-mono font-bold text-lg text-blue-600">
                      {toSixDecimals(calculations.potWat)}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded text-xs text-amber-800 border border-amber-100 mt-4">
                  <div className="flex items-center gap-1 font-bold mb-1">
                    <Info className="h-3 w-3" /> Nota de Cálculo
                  </div>
                  Vt = Vf − Vi; Ve = Vf − Vm; Val = Vm − Vi; Vo = Ve ×
                  (1 − BSWe); Va = Val + (Ve × BSWe); Voc = Vo × FCV × FE ×
                  FTC. O BSW Total é Va / Vt.
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Preencha os horários, alturas e BSW para ver o cálculo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
