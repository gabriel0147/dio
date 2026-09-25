import { useState, useEffect, useMemo } from 'react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TankOperation, OperationType, CalibrationRow } from '@/lib/types'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import {
  lookupCalibrationValue,
  getReportDateFromTimestamp,
  getCalibrationLevelRange,
  isCalibrationLevelInRange,
} from '@/lib/calculations'
import { Label } from '@/components/ui/label'
import { format, parseISO, addDays, isValid } from 'date-fns'
import { fcvLogService } from '@/services/fcvLogService'
import { bswService } from '@/services/bswService'
import { sheetService } from '@/services/sheetService'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const formatSix = (value: number) => {
  if (!Number.isFinite(value)) return '0.000000'
  return value.toFixed(6)
}

const operationSchema = z.object({
  type: z.enum(['production', 'drainage', 'transfer', 'stock_variation']),
  wellId: z.string().uuid('Selecione o poço desta operação'),
  startTime: z.string().min(1, 'Hora de início é obrigatória'),
  endTime: z.string().min(1, 'Hora de fim é obrigatória'),
  initialLevelMm: z.coerce
    .number({
      required_error: 'Nível é obrigatório',
      invalid_type_error: 'Informe um nível válido',
    })
    .min(0, 'Nível deve ser positivo')
    .max(7000, 'Valor inserido fora da tabela de arqueação'),
  finalLevelMm: z.coerce
    .number({
      required_error: 'Nível é obrigatório',
      invalid_type_error: 'Informe um nível válido',
    })
    .min(0, 'Nível deve ser positivo')
    .max(7000, 'Valor inserido fora da tabela de arqueação'),

  // Optional based on type
  tempFluidC: z.coerce.number().optional(),
  tempAmbientC: z.coerce.number().optional(),
  densityObservedGcm3: z.coerce.number().optional(),
  bswPercent: z.coerce.number().min(0).max(100).optional(),

  // New Fields for Transfer
  fcv: z.coerce.number().optional(),
  fe: z.coerce.number().optional(),
  transferDestination: z.string().optional(),

  comments: z.string().optional(),
})

interface OperationFormProps {
  tankId: string
  onSubmit: (data: Omit<TankOperation, 'id'>) => Promise<void>
  onCancel: () => void
  forcedType?: OperationType
  initialData?: TankOperation | null
}

export function OperationForm({
  tankId,
  onSubmit,
  onCancel,
  forcedType,
  initialData,
}: OperationFormProps) {
  const {
    calibrationLookupData,
    tankOperations,
    getLastClosedReport,
    getLastOperationBefore,
    loadTankCalibration,
    transferDestinationCategories,
    createTransferDestinationCategory,
    currentProject,
    wells,
  } = useProject()
  const selectedTank = useMemo(
    () => currentProject?.tanks.find((tank) => tank.id === tankId),
    [currentProject?.tanks, tankId],
  )
  const eligibleWells = useMemo(
    () =>
      wells
        .filter(
          (well) => well.productionFieldId === selectedTank?.productionFieldId,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [selectedTank?.productionFieldId, wells],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(!initialData)
  const [isQuickAddOpen, setQuickAddOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [fcvLookupMessage, setFcvLookupMessage] = useState<string | null>(null)
  const [isLookingUpFcv, setIsLookingUpFcv] = useState(false)
  const [hasFiscalFcv, setHasFiscalFcv] = useState(false)
  const [bswLookupMessage, setBswLookupMessage] = useState<string | null>(null)
  const [isLookingUpBsw, setIsLookingUpBsw] = useState(false)
  const [hasLatestBsw, setHasLatestBsw] = useState(false)
  const [calibrationWindowData, setCalibrationWindowData] = useState<
    Record<string, CalibrationRow[]>
  >({})

  // Ensure calibration data is loaded for validation
  useEffect(() => {
    loadTankCalibration(tankId)
  }, [tankId, loadTankCalibration])

  useEffect(() => {
    setCalibrationWindowData({})
  }, [tankId])

  // Format date for datetime-local input
  const formatDateForInput = (dateStr: string, preserveStoredTime = false) => {
    try {
      if (!dateStr) return ''
      if (preserveStoredTime) {
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
        if (match) return `${match[1]}T${match[2]}`
      }
      return format(parseISO(dateStr), "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ''
    }
  }

  // Helper to get current time for input pre-filling
  const getCurrentTimeForInput = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const form = useForm<z.infer<typeof operationSchema>>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      type: forcedType || 'stock_variation',
      wellId: '',
      startTime: '',
      endTime: '',
      initialLevelMm: undefined as any,
      finalLevelMm: 0,
      tempFluidC: 0,
      tempAmbientC: 0,
      densityObservedGcm3: 0,
      bswPercent: 0,
      fcv: 1.0,
      fe: 1.0,
      transferDestination: '',
      comments: '',
    },
  })

  // Watch startTime to calculate report date dynamically and auto-fill endTime for stock_variation
  const startTime = form.watch('startTime')
  const endTime = form.watch('endTime')
  const selectedWellId = form.watch('wellId')
  const type = form.watch('type')

  // Calculate dynamic title based on operation type
  const formTitle = useMemo(() => {
    switch (type) {
      case 'stock_variation':
        return 'Lançamento da Variação do Estoque'
      case 'drainage':
        return 'Lançamento da Drenagem'
      case 'transfer':
        return 'Lançamento da Transferência'
      case 'production':
        return 'Lançamento da Produção'
      default:
        return 'Lançamento de Operação'
    }
  }, [type])

  // Auto-fill End Time for Stock Variation
  useEffect(() => {
    if (initialData) return

    if (type === 'stock_variation' && startTime) {
      try {
        const startDate = parseISO(startTime)
        if (isValid(startDate)) {
          const endStr = format(startDate, "yyyy-MM-dd'T'23:59")
          const currentEnd = form.getValues('endTime')
          if (currentEnd !== endStr) {
            form.setValue('endTime', endStr)
          }
        }
      } catch {
        // ignore invalid dates
      }
    }
  }, [startTime, type, initialData, form])

  // Calculate summary dates based on requirements
  const summaryDates = useMemo(() => {
    let refDate = new Date()

    if (startTime) {
      try {
        const parsedStart = parseISO(startTime)
        refDate = getReportDateFromTimestamp(parsedStart)
      } catch {
        // invalid date
      }
    } else if (initialData?.endTime) {
      refDate = getReportDateFromTimestamp(parseISO(initialData.startTime))
    }

    const reportDateStr = format(refDate, 'dd/MM/yyyy')

    return {
      report: reportDateStr,
    }
  }, [initialData, startTime])

  // Load initial data for editing OR pre-fill for new
  useEffect(() => {
    const loadData = async () => {
      if (initialData) {
        form.reset({
          type: initialData.type,
          wellId: initialData.wellId || '',
          startTime: formatDateForInput(initialData.startTime, true),
          endTime: formatDateForInput(initialData.endTime, true),
          initialLevelMm: initialData.initialLevelMm,
          finalLevelMm: initialData.finalLevelMm,
          tempFluidC: initialData.tempFluidC ?? 0,
          tempAmbientC: initialData.tempAmbientC ?? 0,
          densityObservedGcm3: initialData.densityObservedGcm3 ?? 0,
          bswPercent: initialData.bswPercent ?? 0,
          fcv:
            initialData.fcv !== undefined && initialData.fcv !== null
              ? (initialData.fcv.toFixed(6) as any)
              : ('' as any),
          fe: initialData.fe ?? 1.0,
          transferDestination: initialData.transferDestination ?? '',
          comments: initialData.comments ?? '',
        })
        setHasFiscalFcv(
          initialData.fcv !== undefined && initialData.fcv !== null,
        )
        setHasLatestBsw(
          initialData.bswPercent !== undefined && initialData.bswPercent !== null,
        )
        setBswLookupMessage(
          initialData.bswPercent !== undefined && initialData.bswPercent !== null
            ? 'BSW carregado do registro salvo.'
            : null,
        )
        setFcvLookupMessage(
          initialData.fcv !== undefined && initialData.fcv !== null
            ? 'FCV carregado do registro salvo.'
            : null,
        )
        setIsLoadingDefaults(false)
      } else {
        let startVal = ''
        let endVal = ''

        try {
          const lastReport = await getLastClosedReport(
            tankId,
            selectedTank?.wellId,
          )
          const currentType = forcedType || 'stock_variation'

          if (
            currentType === 'production' ||
            currentType === 'stock_variation'
          ) {
            if (lastReport) {
              const lastReportDate = parseISO(lastReport.reportDate)
              const nextDay = addDays(lastReportDate, 1)
              startVal = format(nextDay, "yyyy-MM-dd'T'00:00")
            } else {
              startVal = format(new Date(), "yyyy-MM-dd'T'00:00")
            }

            if (currentType === 'stock_variation' && startVal) {
              const startDate = parseISO(startVal)
              if (isValid(startDate)) {
                endVal = format(startDate, "yyyy-MM-dd'T'23:59")
              }
            }
          } else {
            if (lastReport) {
              startVal = formatDateForInput(lastReport.endDatetime)
            } else {
              startVal = getCurrentTimeForInput()
            }
          }

          form.reset({
            type: currentType,
            wellId: selectedTank?.wellId || '',
            startTime: startVal,
            endTime: endVal,
            initialLevelMm: undefined as any,
            finalLevelMm: 0,
            tempFluidC: 0,
            tempAmbientC: 0,
            densityObservedGcm3: 0,
            bswPercent: 0,
            fcv: '' as any,
            fe: 1.0,
            transferDestination: '',
            comments: '',
          })
        } catch (e) {
          console.error('Error loading default values:', e)
        } finally {
          setIsLoadingDefaults(false)
        }
      }
    }
    loadData()
  }, [
    initialData,
    forcedType,
    form,
    tankId,
    getLastClosedReport,
    selectedTank?.wellId,
  ])

  // Auto-fill Initial Level when Start Time changes
  useEffect(() => {
    if (initialData) return

    const fetchLevel = async () => {
      if (!startTime) return

      try {
        const lastOp = await getLastOperationBefore(
          tankId,
          startTime,
        )

        if (lastOp) {
          form.setValue('initialLevelMm', lastOp.finalLevelMm)
        } else {
          form.setValue('initialLevelMm', undefined as any)
        }
      } catch (err) {
        console.error('Error fetching previous level:', err)
      }
    }

    const timer = setTimeout(fetchLevel, 300)
    return () => clearTimeout(timer)
  }, [startTime, tankId, initialData, getLastOperationBefore, form])

  // Pre-fill FE for Transfer (ONLY for new records)
  useEffect(() => {
    if (
      !initialData &&
      type === 'transfer' &&
      tankOperations[tankId] &&
      tankOperations[tankId].length > 0
    ) {
      const ops = [...tankOperations[tankId]].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
      )
      const lastOpWithFe = ops.find((o) => o.fe !== undefined && o.fe !== null)

      if (!form.getFieldState('fe').isDirty && lastOpWithFe?.fe) {
        form.setValue('fe', lastOpWithFe.fe)
      }
    }
  }, [type, tankOperations, tankId, form, initialData])

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsCreatingCategory(true)
    try {
      const newCategory = await createTransferDestinationCategory(
        newCategoryName.trim(),
      )
      form.setValue('transferDestination', newCategory.name)
      setNewCategoryName('')
      setQuickAddOpen(false)
    } catch {
      // Error handled by context
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const initialLevelMm = form.watch('initialLevelMm')
  const finalLevelMm = form.watch('finalLevelMm')
  const bswPercent = form.watch('bswPercent')
  const tempFluidC = form.watch('tempFluidC')
  const densityObservedGcm3 = form.watch('densityObservedGcm3')
  const fcv = form.watch('fcv')
  const fe = form.watch('fe')
  const isDrainage = type === 'drainage'
  const isTransfer = type === 'transfer'
  const isProduction = type === 'production'
  const isStockVariation = type === 'stock_variation'
  const showTempDensity = isTransfer || isProduction
  const showBSW = !isDrainage
  const bswLabel = isTransfer ? 'BSW Emulsão (%)' : 'BSW Total (%)'
  const isTransferFcvBlocked = isTransfer && (!hasFiscalFcv || isLookingUpFcv)
  useEffect(() => {
    if (initialData) return

    if (!showBSW) {
      setBswLookupMessage(null)
      setHasLatestBsw(false)
      return
    }

    if (!selectedWellId) {
      form.setValue('bswPercent', '' as any, { shouldValidate: true })
      setHasLatestBsw(false)
      setBswLookupMessage('Selecione o poço para buscar o BSW aplicável.')
      return
    }

    const referenceAt = endTime || startTime
    if (!referenceAt) return

    let isCurrent = true
    setIsLookingUpBsw(true)
    setBswLookupMessage('Buscando último BSW salvo para este tanque/poço...')

    const lookup = isTransfer
      ? bswService.getApplicableLabBsw(tankId, selectedWellId, referenceAt)
      : bswService.getApplicableTotalBsw(tankId, selectedWellId, referenceAt)

    lookup
      .then((record) => {
        if (!isCurrent) return

        if (!record) {
          form.setValue('bswPercent', '' as any, { shouldValidate: true })
          setHasLatestBsw(false)
          setBswLookupMessage(
            isTransfer
              ? 'Não existe BSW da Emulsão laboratorial válido para este tanque, poço e horário.'
              : 'Não existe BSW Total medido para este tanque, poço e horário.',
          )
          return
        }

        const nextBsw = isTransfer
          ? record.bswEmulsionPct
          : record.bswTotalPct
        const recordDate = isTransfer ? record.testEndAt : record.date
        form.setValue('bswPercent', nextBsw.toFixed(6) as any, {
          shouldValidate: true,
        })
        setHasLatestBsw(true)
        setBswLookupMessage(
          `${bswLabel} obtido do lançamento válido de ${format(parseISO(recordDate), 'dd/MM/yyyy HH:mm')}.`,
        )
      })
      .catch((error) => {
        if (!isCurrent) return
        console.error('Erro ao buscar BSW:', error)
        form.setValue('bswPercent', '' as any, { shouldValidate: true })
        setHasLatestBsw(false)
        setBswLookupMessage('Erro ao buscar o último BSW salvo.')
      })
      .finally(() => {
        if (isCurrent) setIsLookingUpBsw(false)
      })

    return () => {
      isCurrent = false
    }
  }, [
    initialData,
    showBSW,
    selectedWellId,
    tankId,
    isTransfer,
    bswLabel,
    endTime,
    startTime,
    form,
  ])
  useEffect(() => {
    if (initialData) return

    if (!showTempDensity) {
      setFcvLookupMessage(null)
      setHasFiscalFcv(false)
      return
    }

    const temp = Number(tempFluidC)
    const density = Number(densityObservedGcm3)
    if (!temp || !density) {
      setFcvLookupMessage(
        'Informe temperatura do fluido e massa específica para buscar o FCV.',
      )
      setHasFiscalFcv(false)
      form.setValue('fcv', '' as any)
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
          form.setValue('fcv', '' as any, { shouldValidate: true })
          setHasFiscalFcv(false)
          setFcvLookupMessage(
            'Não existe cálculo de FCV para essa temperatura e massa específica. Faça o cálculo na tela de FCV para liberar este campo.',
          )
        }
      } catch (error) {
        if (!isCurrent) return
        console.error('Erro ao buscar FCV no histórico fiscal:', error)
        form.setValue('fcv', '' as any, { shouldValidate: true })
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
  }, [initialData, showTempDensity, tempFluidC, densityObservedGcm3, form])

  const calibrationData = useMemo(() => {
    const rowsById = new Map(
      (calibrationLookupData[tankId] || []).map((row) => [row.id, row]),
    )

    Object.values(calibrationWindowData)
      .flat()
      .forEach((row) => rowsById.set(row.id, row))

    return Array.from(rowsById.values()).sort(
      (a, b) => a.altura_mm - b.altura_mm,
    )
  }, [calibrationLookupData, calibrationWindowData, tankId])
  const calibrationRange = useMemo(
    () => getCalibrationLevelRange(calibrationData),
    [calibrationData],
  )

  useEffect(() => {
    const levels = [Number(initialLevelMm), Number(finalLevelMm)].filter(
      (level) =>
        Number.isFinite(level) &&
        !isCalibrationLevelInRange(level, calibrationData) &&
        !calibrationWindowData[`${tankId}:${level}`],
    )

    if (levels.length === 0) return

    let isCurrent = true
    const timer = window.setTimeout(async () => {
      try {
        const windows = await Promise.all(
          levels.map(async (level) => ({
            level,
            rows: await sheetService.getCalibrationWindow(tankId, level),
          })),
        )

        if (!isCurrent) return

        setCalibrationWindowData((prev) => {
          const next = { ...prev }
          windows.forEach(({ level, rows }) => {
            next[`${tankId}:${level}`] = rows
          })
          return next
        })
      } catch (error) {
        console.error('Erro ao buscar janela de arqueação:', error)
      }
    }, 250)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
    }
  }, [
    initialLevelMm,
    finalLevelMm,
    calibrationData,
    calibrationWindowData,
    tankId,
  ])

  const calibrationRangeMessage = calibrationRange
    ? `Informe um nível entre ${calibrationRange.min} mm e ${calibrationRange.max} mm para este tanque.`
    : 'Este tanque não possui tabela de arqueação carregada.'

  const getVolumeDisplay = (level: number) => {
    if (!calibrationData || calibrationData.length === 0) return 'N/A'
    if (level === undefined || level === null || isNaN(level)) return 'N/A'
    if (!isCalibrationLevelInRange(level, calibrationData)) return 'N/A'
    const vol = lookupCalibrationValue(level, calibrationData, 'volume_m3')
    return formatSix(vol)
  }

  const initialVolumeDisplay = getVolumeDisplay(initialLevelMm)
  const finalVolumeDisplay = getVolumeDisplay(finalLevelMm)

  const absDiffVolumeDisplay = (() => {
    if (initialVolumeDisplay === 'N/A' || finalVolumeDisplay === 'N/A')
      return 'N/A'
    const init = parseFloat(initialVolumeDisplay)
    const final = parseFloat(finalVolumeDisplay)
    return formatSix(Math.abs(init - final))
  })()

  const variationVolumeDisplay = (() => {
    if (initialVolumeDisplay === 'N/A' || finalVolumeDisplay === 'N/A')
      return 'N/A'
    const init = parseFloat(initialVolumeDisplay)
    const final = parseFloat(finalVolumeDisplay)
    return formatSix(final - init)
  })()

  const transferCalculations = (() => {
    if (type !== 'transfer' || absDiffVolumeDisplay === 'N/A') return null

    const gross = parseFloat(absDiffVolumeDisplay)
    const bsw = bswPercent || 0
    const temp = tempFluidC || 20
    const fcvVal = Number(fcv) || 1.0
    const feVal = fe || 1.0

    const water = gross * (bsw / 100)
    const oilUncorrected = gross - water
    const yFactor = 1 + (temp - 20) * 0.000012
    const oilCorrected = oilUncorrected * yFactor * fcvVal * feVal

    return {
      water: formatSix(water),
      oilUncorrected: formatSix(oilUncorrected),
      yFactor: formatSix(yFactor),
      oilCorrected: formatSix(oilCorrected),
    }
  })()

  const ftcDisplay = useMemo(() => {
    if (type !== 'transfer') return ''
    const temp =
      tempFluidC !== undefined &&
      tempFluidC !== null &&
      String(tempFluidC) !== ''
        ? Number(tempFluidC)
        : 20
    const yFactor = 1 + (temp - 20) * 0.000012
    return formatSix(yFactor)
  }, [type, tempFluidC])

  const handleSubmit = async (values: z.infer<typeof operationSchema>) => {
    setIsSubmitting(true)
    try {
      const isDrainage = values.type === 'drainage'

      const showTempDensityPayload =
        values.type === 'transfer' || values.type === 'production'

      const showBSWPayload = !isDrainage

      const initialLevelOutOfRange = !isCalibrationLevelInRange(
        values.initialLevelMm,
        calibrationData,
      )
      const finalLevelOutOfRange = !isCalibrationLevelInRange(
        values.finalLevelMm,
        calibrationData,
      )

      if (initialLevelOutOfRange || finalLevelOutOfRange) {
        if (initialLevelOutOfRange) {
          form.setError('initialLevelMm', {
            type: 'manual',
            message: calibrationRangeMessage,
          })
        }

        if (finalLevelOutOfRange) {
          form.setError('finalLevelMm', {
            type: 'manual',
            message: calibrationRangeMessage,
          })
        }

        toast.error(
          `Nível fora da tabela de arqueação. ${calibrationRangeMessage}`,
        )
        return
      }

      if (values.type === 'transfer' && !hasFiscalFcv) {
        toast.error(
          'FCV não encontrado no Fiscal Log. Faça o cálculo na tela de FCV antes de registrar a transferência.',
        )
        return
      }

      if (!isDrainage && !hasLatestBsw) {
        toast.error(`Não existe ${bswLabel} válido para o tanque, poço e data informados.`)
        return
      }

      await onSubmit({
        tankId,
        wellId: values.wellId,
        type: values.type,
        startTime: values.startTime,
        endTime: values.endTime,
        initialLevelMm: values.initialLevelMm,
        finalLevelMm: values.finalLevelMm,
        tempFluidC: showTempDensityPayload ? values.tempFluidC : undefined,
        tempAmbientC: showTempDensityPayload ? values.tempAmbientC : undefined,
        densityObservedGcm3: showTempDensityPayload
          ? values.densityObservedGcm3
          : undefined,
        bswPercent: showBSWPayload ? values.bswPercent : undefined,
        fcv: values.type === 'transfer' ? values.fcv : undefined,
        fe: values.type === 'transfer' ? values.fe : undefined,
        transferDestination:
          values.type === 'transfer' ? values.transferDestination : undefined,
        comments: values.comments,
      })
      if (!initialData) {
        form.reset({
          type: values.type,
          wellId: values.wellId,
          startTime: getCurrentTimeForInput(),
          endTime: '',
          initialLevelMm: values.finalLevelMm,
          finalLevelMm: 0,
          tempFluidC: 0,
          tempAmbientC: 0,
          densityObservedGcm3: 0,
          bswPercent: 0,
          fcv: '' as any,
          fe: 1.0,
          transferDestination: '',
          comments: '',
        })
      }
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingDefaults) {
    return (
      <Card className="border shadow-sm min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Production Period Summary */}
        <div className="bg-muted/30 border rounded-md p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1 text-blue-700">
                Relatório de Produção: {summaryDates.report}
              </h4>
              <p className="text-xs text-muted-foreground">
                Baseado no horário, esta operação será contabilizada no
                relatório do dia {summaryDates.report} (Janela: 00:00 - 23:59).
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {!forcedType && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Operação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!initialData}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stock_variation">Estoque</SelectItem>
                        <SelectItem value="production">
                          Produção (Legado)
                        </SelectItem>
                        <SelectItem value="drainage">Drenagem</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="wellId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poço</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!initialData}
                  >
                    <FormControl>
                      <SelectTrigger aria-label="Poço da operação">
                        <SelectValue placeholder="Selecione o poço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {eligibleWells.map((well) => (
                          <SelectItem key={well.id} value={well.id}>
                            {well.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="initialLevelMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível Inicial (mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? undefined
                              : event.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="finalLevelMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível Final (mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? undefined
                              : event.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(isProduction || isStockVariation) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/30 p-4 rounded-md border">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Volume Inicial
                  </Label>
                  <Input
                    value={
                      initialVolumeDisplay === 'N/A'
                        ? 'N/A'
                        : `${initialVolumeDisplay} m³`
                    }
                    readOnly
                    className="bg-muted font-mono"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Volume Final
                  </Label>
                  <Input
                    value={
                      finalVolumeDisplay === 'N/A'
                        ? 'N/A'
                        : `${finalVolumeDisplay} m³`
                    }
                    readOnly
                    className="bg-muted font-mono"
                  />
                </div>
                <div>
                  <Label className="text-primary font-semibold text-xs">
                    Variação do Estoque
                  </Label>
                  <Input
                    value={
                      variationVolumeDisplay === 'N/A'
                        ? 'N/A'
                        : `${variationVolumeDisplay} m³`
                    }
                    readOnly
                    className="bg-primary/5 border-primary/20 font-mono font-semibold text-primary"
                  />
                </div>
              </div>
            )}

            {(isDrainage || isTransfer) && (
              <div className="bg-muted/30 p-4 rounded-md border">
                <div>
                  <Label className="text-primary font-semibold text-xs">
                    {isTransfer ? 'Volume Transferido' : 'Volume Drenado'}
                  </Label>
                  <Input
                    value={
                      absDiffVolumeDisplay === 'N/A'
                        ? 'N/A'
                        : `${absDiffVolumeDisplay} m³`
                    }
                    readOnly
                    className="bg-primary/5 border-primary/20 font-mono font-semibold text-primary mt-1"
                  />
                </div>
              </div>
            )}

            {isTransfer && transferCalculations && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-md border border-blue-100">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Volume de Óleo sem Correção
                  </Label>
                  <Input
                    value={`${transferCalculations.oilUncorrected} m³`}
                    readOnly
                    className="bg-background font-mono h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Volume de Água Emulsão
                  </Label>
                  <Input
                    value={`${transferCalculations.water} m³`}
                    readOnly
                    className="bg-background font-mono h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-primary font-semibold text-xs">
                    Volume de Óleo Corrigido
                  </Label>
                  <Input
                    value={`${transferCalculations.oilCorrected} m³`}
                    readOnly
                    className="bg-primary/5 border-primary/20 font-mono font-semibold text-primary h-8 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {showTempDensity && (
                <>
                  <FormField
                    control={form.control}
                    name="tempFluidC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temp. Fluido (°C)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tempAmbientC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temp. Ambiente (°C)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="densityObservedGcm3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Massa Específica Obs. (g/cm³)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.0001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {showBSW && (
                <FormField
                  control={form.control}
                  name="bswPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{bswLabel}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          readOnly
                          step="0.000001"
                          className="bg-muted font-mono"
                          placeholder="Buscando último BSW salvo"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {bswLookupMessage && (
                        <p
                          className={cn(
                            'text-xs',
                            hasLatestBsw
                              ? 'text-muted-foreground'
                              : 'text-destructive',
                          )}
                        >
                          {isLookingUpBsw ? 'Buscando...' : bswLookupMessage}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
            </div>

            {isTransfer && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fcv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            FCV (Fator de Correção de Volume)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              readOnly
                              placeholder="Busque pelo temp. fluido e massa"
                              className="bg-muted font-mono"
                              {...field}
                            />
                          </FormControl>
                          {fcvLookupMessage && (
                            <p
                              className={cn(
                                'text-xs',
                                hasFiscalFcv
                                  ? 'text-muted-foreground'
                                  : 'text-destructive',
                              )}
                            >
                              {fcvLookupMessage}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        FTC (Fator de Correção da Temperatura)
                      </Label>
                      <Input value={ftcDisplay} readOnly className="bg-muted" />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="fe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FE (Fator de Encolhimento)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="transferDestination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino da Transferência</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Selecione o destino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {transferDestinationCategories.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                            {/* If current value is legacy (not in list) and not empty, show it */}
                            {field.value &&
                              !transferDestinationCategories.some(
                                (c) => c.name === field.value,
                              ) && (
                                <SelectItem value={field.value}>
                                  {field.value} (Legado)
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setQuickAddOpen(true)}
                          title="Adicionar nova categoria"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isTransferFcvBlocked ||
                  (showBSW && (!hasLatestBsw || isLookingUpBsw))
                }
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {initialData ? 'Atualizar Operação' : 'Salvar Operação'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      <Dialog open={isQuickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria de Destino</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria de destino para transferências.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Nome da Categoria</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Tanque TQ-02"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickAddOpen(false)}
              disabled={isCreatingCategory}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleQuickAddCategory}
              disabled={!newCategoryName.trim() || isCreatingCategory}
            >
              {isCreatingCategory ? 'Criando...' : 'Criar e Selecionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
