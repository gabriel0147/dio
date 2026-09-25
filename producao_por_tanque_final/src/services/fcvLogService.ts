import { supabase } from '@/lib/supabase/client'
import { DbFcvCalculationLog } from '@/lib/db-types'

export interface FcvLogEntry {
  id: string
  userId: string
  requestedByUserId: string | null
  requestedByName?: string
  calculatedAt: string
  fluidTempC: number
  observedDensityGcm3: number
  densityAt20cGcm3: number
  fcv: number
  pressureKpag: number
  referenceBase: string
  appliedNorm: string
  algorithmVersion: string
  calculationReason: string | null
}

export interface FcvLogData {
  userId: string
  fluidTempC: number
  observedDensityGcm3: number
  densityAt20cGcm3: number
  fcv: number
  pressureKpag?: number
  algorithmVersion?: string
  appliedNorm?: string
  calculationReason?: string
  requestedByUserId?: string
}

export const fcvLogService = {
  async logCalculation(data: FcvLogData) {
    const payload = {
      user_id: data.userId,
      requested_by_user_id: data.requestedByUserId || data.userId,
      fluid_temp_c: data.fluidTempC,
      observed_density_gcm3: data.observedDensityGcm3,
      density_at_20c_gcm3: data.densityAt20cGcm3,
      fcv: data.fcv,
      pressure_kpag: data.pressureKpag ?? 0,
      algorithm_version: data.algorithmVersion || 'local_v1',
      applied_norm: data.appliedNorm || 'API MPMS 11.1',
      calculation_reason: data.calculationReason || null,
    }

    const { error } = await supabase
      .from('fcv_calculation_logs')
      .insert(payload as any)
    if (error) console.error('Failed to log FCV calculation', error)
  },

  async findMatchingCalculation(
    fluidTempC: number,
    observedDensityGcm3: number,
  ): Promise<FcvLogEntry | null> {
    const tempTolerance = 0.0001
    const densityTolerance = 0.000001
    const { data, error } = await supabase
      .from('fcv_calculation_logs')
      .select('*')
      .gte('fluid_temp_c', fluidTempC - tempTolerance)
      .lte('fluid_temp_c', fluidTempC + tempTolerance)
      .gte('observed_density_gcm3', observedDensityGcm3 - densityTolerance)
      .lte('observed_density_gcm3', observedDensityGcm3 + densityTolerance)
      .order('calculated_at', { ascending: false })
      .limit(1)

    if (error) throw error
    if (!data?.length) return null

    const { data: mapped } = await this.hydrateLogEntries(
      data as DbFcvCalculationLog[],
    )
    return mapped[0] || null
  },

  async getLogs(
    userId?: string,
    limit = 50,
  ): Promise<{ data: FcvLogEntry[]; count: number }> {
    let query = supabase
      .from('fcv_calculation_logs')
      .select('*', { count: 'exact' })
      .order('calculated_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error, count } = await query

    if (error) throw error

    const hydrated = await this.hydrateLogEntries(data as DbFcvCalculationLog[])
    return { data: hydrated.data, count: count || 0 }
  },

  async hydrateLogEntries(
    rows: DbFcvCalculationLog[],
  ): Promise<{ data: FcvLogEntry[] }> {
    const userIds = [
      ...new Set(
        rows
          .flatMap((d: any) => [d.user_id, d.requested_by_user_id])
          .filter((id: string | null) => !!id),
      ),
    ]

    const userMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (error) {
        console.warn('Failed to enrich FCV logs with requester names.', error)
      }

      ;(profiles || []).forEach((profile: any) => {
        userMap.set(profile.id, profile.full_name || 'Usuário registrado')
      })
    }

    const mappedData: FcvLogEntry[] = rows.map((d: any) => {
      const requestedByUserId = d.requested_by_user_id || d.user_id || null
      return {
        id: d.id,
        userId: d.user_id,
        requestedByUserId,
        requestedByName: requestedByUserId
          ? userMap.get(requestedByUserId) || 'Usuário registrado'
          : undefined,
        calculatedAt: d.calculated_at,
        fluidTempC: d.fluid_temp_c,
        observedDensityGcm3: d.observed_density_gcm3,
        densityAt20cGcm3: d.density_at_20c_gcm3,
        fcv: d.fcv,
        pressureKpag: d.pressure_kpag ?? 0,
        referenceBase: d.reference_base,
        appliedNorm: d.applied_norm,
        algorithmVersion: d.algorithm_version,
        calculationReason: d.calculation_reason || null,
      }
    })

    return { data: mappedData }
  },

  async exportLogs(
    startDate: Date,
    endDate: Date,
    formatType: 'csv' | 'json',
  ): Promise<Blob> {
    const { data, error } = await supabase
      .from('fcv_calculation_logs')
      .select('*')
      .gte('calculated_at', startDate.toISOString())
      .lte('calculated_at', endDate.toISOString())
      .order('calculated_at', { ascending: false })

    if (error) throw error

    const { data: logs } = await this.hydrateLogEntries(
      (data || []) as DbFcvCalculationLog[],
    )

    if (formatType === 'json') {
      return new Blob([JSON.stringify(logs, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
    }

    const headers = [
      'id',
      'solicitante',
      'requested_by_user_id',
      'calculated_at',
      'fluid_temp_c',
      'observed_density_gcm3',
      'density_at_20c_gcm3',
      'fcv',
      'reference_base',
      'applied_norm',
      'algorithm_version',
      'calculation_reason',
    ]

    const csvValue = (value: unknown) => {
      if (value === null || value === undefined) return ''
      const text = String(value)
      if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
      return text
    }

    const rows = logs.map((log) =>
      [
        log.id,
        log.requestedByName || '',
        log.requestedByUserId || '',
        log.calculatedAt,
        log.fluidTempC,
        log.observedDensityGcm3,
        log.densityAt20cGcm3,
        log.fcv,
        log.referenceBase,
        log.appliedNorm,
        log.algorithmVersion,
        log.calculationReason || '',
      ]
        .map(csvValue)
        .join(','),
    )

    const content = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`

    return new Blob([content], { type: 'text/csv;charset=utf-8' })
  },
}
