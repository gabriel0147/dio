import { supabase } from '@/lib/supabase/client'
import { DailyProductionReport } from '@/lib/types'
import { DbDailyProductionReport } from '@/lib/db-types'
import { auditService } from './auditService'
import { format } from 'date-fns'
import { notificationService } from './notificationService'
import type { DailyMetrics } from '@/lib/calculations'

interface GetReportsOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const reportService = {
  async getReports(tankId: string): Promise<DailyProductionReport[]> {
    const { data, error } = await supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)')
      .eq('tank_id', tankId)
      .order('report_date', { ascending: false })

    if (error) throw error

    // Fetch user profiles for closedBy
    const reports = data.map(mapToDailyProductionReport)
    return await enrichReportsWithUserProfiles(reports)
  },

  async getReportsByDateForTanks(
    tankIds: string[],
    date: Date,
    options?: GetReportsOptions,
  ): Promise<{ data: DailyProductionReport[]; count: number }> {
    if (tankIds.length === 0) return { data: [], count: 0 }

    const dateStr = format(date, 'yyyy-MM-dd')

    let query = supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)', { count: 'exact' })
      .in('tank_id', tankIds)
      .eq('report_date', dateStr)

    if (options?.sortBy) {
      const sortField = camelToSnake(options.sortBy)
      query = query.order(sortField, { ascending: options.sortOrder === 'asc' })
    } else {
      query = query.order('tank_id', { ascending: true })
    }

    if (options?.page && options?.pageSize) {
      const from = (options.page - 1) * options.pageSize
      const to = from + options.pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) throw error

    const reports = (data || []).map(mapToDailyProductionReport)
    const enrichedReports = await enrichReportsWithUserProfiles(reports)

    return {
      data: enrichedReports,
      count: count || 0,
    }
  },

  async getReportsByDateRangeForExport(
    tankIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<
    (DailyProductionReport & { tankTag: string; productionFieldName: string })[]
  > {
    if (tankIds.length === 0) return []
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('daily_production_reports')
      .select(
        `
        *,
        tank:tanks (
          tag,
          production_field:production_fields (
            name
          )
        ),
        well:wells (name)
      `,
      )
      .in('tank_id', tankIds)
      .gte('report_date', startStr)
      .lte('report_date', endStr)
      .order('report_date', { ascending: true })

    if (error) throw error

    const reports = data.map((item: any) => {
      const report = mapToDailyProductionReport(item)
      return {
        ...report,
        tankTag: item.tank?.tag || '',
        wellName: item.well?.name || '',
        productionFieldName: item.tank?.production_field?.name || '',
      }
    })

    const enrichedReports = await enrichReportsWithUserProfiles(reports)
    return enrichedReports as any
  },

  async getReportByDate(
    tankId: string,
    date: Date,
    wellId?: string,
  ): Promise<DailyProductionReport | null> {
    const dateStr = format(date, 'yyyy-MM-dd')
    let query = supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)')
      .eq('tank_id', tankId)
      .eq('report_date', dateStr)

    if (wellId) query = query.eq('well_id', wellId)
    const { data, error } = await query.limit(1).maybeSingle()

    if (error) throw error
    if (!data) return null

    const report = mapToDailyProductionReport(data)
    const [enriched] = await enrichReportsWithUserProfiles([report])
    return enriched
  },

  async getReportForOperation(
    tankId: string,
    wellId: string,
    operationEndTime: string,
  ): Promise<DailyProductionReport | null> {
    const { data, error } = await supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)')
      .eq('tank_id', tankId)
      .eq('well_id', wellId)
      .lte('start_datetime', operationEndTime)
      .gte('end_datetime', operationEndTime)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return null
    }

    const report = mapToDailyProductionReport(data)
    const [enriched] = await enrichReportsWithUserProfiles([report])
    return enriched
  },

  async getClosedReportByEndDate(
    tankId: string,
    endDate: Date,
    wellId?: string,
  ): Promise<DailyProductionReport | null> {
    const isoString = endDate.toISOString()
    let query = supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)')
      .eq('tank_id', tankId)
      .eq('end_datetime', isoString)
      .eq('status', 'closed')

    if (wellId) query = query.eq('well_id', wellId)
    const { data, error } = await query.limit(1).maybeSingle()

    if (error) throw error
    if (!data) return null

    const report = mapToDailyProductionReport(data)
    const [enriched] = await enrichReportsWithUserProfiles([report])
    return enriched
  },

  async getLastClosedReport(
    tankId: string,
    wellId?: string,
  ): Promise<DailyProductionReport | null> {
    let query = supabase
      .from('daily_production_reports')
      .select('*, well:wells(name)')
      .eq('tank_id', tankId)
      .eq('status', 'closed')
      .order('end_datetime', { ascending: false })
      .limit(1)

    if (wellId) query = query.eq('well_id', wellId)
    const { data, error } = await query.maybeSingle()

    if (error) throw error
    if (!data) return null

    const report = mapToDailyProductionReport(data)
    const [enriched] = await enrichReportsWithUserProfiles([report])
    return enriched
  },

  async createDraftReport(
    report: Omit<
      DailyProductionReport,
      'id' | 'createdAt' | 'closedAt' | 'closedBy'
    >,
    userId: string,
  ): Promise<DailyProductionReport> {
    const dbReport: any = {
      tank_id: report.tankId,
      well_id: report.wellId || null,
      report_date: report.reportDate,
      start_datetime: report.startDatetime,
      end_datetime: report.endDatetime,
      status: 'draft',
      stock_variation: 0,
      drained_volume_m3: 0,
      transferred_volume_m3: 0,
      calculated_well_production_m3: 0,
    }

    const { data, error } = await supabase
      .from('daily_production_reports')
      .insert(dbReport)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'report',
      entityId: data.id,
      operationType: 'insert',
      reason: `Relatório rascunho criado para ${report.reportDate}`,
    })

    try {
      const { data: tank } = await supabase
        .from('tanks')
        .select('project_id')
        .eq('id', report.tankId)
        .single()
      if (tank?.project_id) {
        await notificationService.notifyProjectUpdate(
          tank.project_id,
          'report',
          data,
        )
      }
    } catch (e) {
      console.warn('Failed to notify report creation', e)
    }

    return mapToDailyProductionReport(data)
  },

  async updateDraftReportMetrics(
    reportId: string,
    metrics: DailyMetrics,
  ): Promise<void> {
    const { error } = await supabase
      .from('daily_production_reports')
      .update({
        stock_variation: metrics.stockVariation,
        total_bsw_percent: metrics.totalBswPercent,
        drained_volume_m3: metrics.drained,
        transferred_volume_m3: metrics.transferred,
        uncorrected_oil_volume_m3: metrics.uncorrectedOilVolume,
        emulsion_water_volume_m3: metrics.emulsionWaterVolume,
        temp_correction_factor_y: metrics.tempCorrectionFactorY,
        corrected_oil_volume_m3: metrics.correctedOilVolume,
        emulsion_bsw_percent: metrics.emulsionBswPercent,
        fluid_temp_c: metrics.fluidTempC,
        fcv: metrics.fcv,
        fe: metrics.fe,
        density_at_20c_gcm3: metrics.densityAt20cGcm3,
        transfer_observed_density_gcm3:
          metrics.transferObservedDensityGcm3,
        calculated_well_production_m3: metrics.wellProduction,
      })
      .eq('id', reportId)
      .eq('status', 'draft')

    if (error) throw error
  },

  async closeReport(
    report: Omit<DailyProductionReport, 'id' | 'createdAt' | 'closedAt'>,
    userId: string,
  ): Promise<DailyProductionReport> {
    const { data: existing } = await supabase
      .from('daily_production_reports')
      .select('id')
      .eq('tank_id', report.tankId)
      .eq('well_id', report.wellId || '')
      .eq('report_date', report.reportDate)
      .maybeSingle()

    const dbReportUpdates: any = {
      start_datetime: report.startDatetime,
      end_datetime: report.endDatetime,
      stock_variation: report.stockVariation,
      total_bsw_percent: report.totalBswPercent,
      drained_volume_m3: report.drainedVolumeM3,
      transferred_volume_m3: report.transferredVolumeM3,
      uncorrected_oil_volume_m3: report.uncorrectedOilVolumeM3,
      emulsion_water_volume_m3: report.emulsionWaterVolumeM3,
      temp_correction_factor_y: report.tempCorrectionFactorY,
      corrected_oil_volume_m3: report.correctedOilVolumeM3,
      emulsion_bsw_percent: report.emulsionBswPercent,
      fluid_temp_c: report.fluidTempC,
      fcv: report.fcv,
      fe: report.fe,
      density_at_20c_gcm3: report.densityAt20cGcm3,
      transfer_observed_density_gcm3: report.transferObservedDensityGcm3,
      calculated_well_production_m3: report.calculatedWellProductionM3,
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: userId,
      well_id: report.wellId || null,
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('daily_production_reports')
        .update(dbReportUpdates)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('daily_production_reports')
        .insert({
          tank_id: report.tankId,
          well_id: report.wellId || null,
          report_date: report.reportDate,
          ...dbReportUpdates,
        })
        .select()
        .single()
      if (error) throw error
      result = data
    }

    await auditService.createLog({
      userId,
      entityType: 'report',
      entityId: result.id,
      operationType: 'close_report',
      reason: `Relatório fechado para ${report.reportDate}`,
    })

    try {
      const { data: tank } = await supabase
        .from('tanks')
        .select('project_id')
        .eq('id', report.tankId)
        .single()

      if (tank?.project_id) {
        await notificationService.notifyProjectUpdate(
          tank.project_id,
          'report',
          result,
        )

        const recent = new Date()
        recent.setSeconds(recent.getSeconds() - 10)

        const { data: alerts } = await supabase
          .from('alert_notifications')
          .select('*, alert_rule:alert_rules(name)')
          .eq('daily_report_id', result.id)
          .gt('triggered_at', recent.toISOString())

        if (alerts && alerts.length > 0) {
          await notificationService.notifyProjectUpdate(
            tank.project_id,
            'alert',
            alerts,
          )
        }
      }
    } catch (e) {
      console.warn('Failed to notify report close', e)
    }

    const mappedReport = mapToDailyProductionReport(result)
    // Fetch profile for the current user (who just closed it)
    const [enriched] = await enrichReportsWithUserProfiles([mappedReport])
    return enriched
  },
}

async function enrichReportsWithUserProfiles(
  reports: DailyProductionReport[],
): Promise<DailyProductionReport[]> {
  const userIds = [
    ...new Set(reports.map((r) => r.closedBy).filter(Boolean)),
  ] as string[]

  if (userIds.length === 0) return reports

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email') // We'll fetch email from auth if needed, but profile might store it or we assume it's just name
    // Actually user_profiles currently doesn't store email by default in schema provided, but we can try fetching.
    // If user_profiles doesn't have email column, we might miss it.
    // However, usually we can join or assume profiles has it if synced.
    // Let's assume we might need to fetch from edge function if email is critical and not in profile.
    // But for now let's just fetch full_name.
    .in('id', userIds)

  // If we can't get email from profiles (schema limitation), we might need to rely on what's available.
  // The UserStory says "fetch and display the full_name ... instead of just their ID or email".
  // So name is priority.

  if (error) {
    console.error('Error fetching user profiles for reports:', error)
    return reports
  }

  const profileMap = new Map(
    profiles?.map((p: any) => [p.id, { fullName: p.full_name, email: '' }]),
  )

  return reports.map((r) => {
    if (r.closedBy && profileMap.has(r.closedBy)) {
      const profile = profileMap.get(r.closedBy)
      return {
        ...r,
        closedByUser: {
          fullName: profile?.fullName,
          email: profile?.email, // Might be empty if not in profile table
        },
      }
    }
    return r
  })
}

function mapToDailyProductionReport(
  db: DbDailyProductionReport,
): DailyProductionReport {
  return {
    id: db.id,
    tankId: db.tank_id,
    wellId: db.well_id || undefined,
    wellName: (db as any).well?.name || undefined,
    reportDate: db.report_date,
    startDatetime: db.start_datetime,
    endDatetime: db.end_datetime,
    stockVariation: Number(db.stock_variation),
    totalBswPercent: Number(db.total_bsw_percent),
    drainedVolumeM3: Number(db.drained_volume_m3),
    transferredVolumeM3: Number(db.transferred_volume_m3),
    uncorrectedOilVolumeM3: Number(db.uncorrected_oil_volume_m3),
    emulsionWaterVolumeM3: Number(db.emulsion_water_volume_m3),
    tempCorrectionFactorY: Number(db.temp_correction_factor_y),
    correctedOilVolumeM3: Number(db.corrected_oil_volume_m3),
    emulsionBswPercent: Number(db.emulsion_bsw_percent),
    fluidTempC: Number(db.fluid_temp_c),
    fcv: Number(db.fcv),
    fe: Number(db.fe),
    densityAt20cGcm3: db.density_at_20c_gcm3
      ? Number(db.density_at_20c_gcm3)
      : undefined,
    transferObservedDensityGcm3: db.transfer_observed_density_gcm3
      ? Number(db.transfer_observed_density_gcm3)
      : undefined,
    calculatedWellProductionM3: Number(db.calculated_well_production_m3),
    status: db.status as 'draft' | 'closed',
    createdAt: db.created_at,
    closedAt: db.closed_at || undefined,
    closedBy: db.closed_by || undefined,
  }
}

function camelToSnake(str: string): string {
  const map: Record<string, string> = {
    tankId: 'tank_id',
    calculatedWellProductionM3: 'calculated_well_production_m3',
    stockVariation: 'stock_variation',
    drainedVolumeM3: 'drained_volume_m3',
    transferredVolumeM3: 'transferred_volume_m3',
    correctedOilVolumeM3: 'corrected_oil_volume_m3',
    uncorrectedOilVolumeM3: 'uncorrected_oil_volume_m3',
    emulsionBswPercent: 'emulsion_bsw_percent',
    totalBswPercent: 'total_bsw_percent',
    fluidTempC: 'fluid_temp_c',
    tempCorrectionFactorY: 'temp_correction_factor_y',
    densityAt20cGcm3: 'density_at_20c_gcm3',
  }
  return (
    map[str] || str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  )
}
