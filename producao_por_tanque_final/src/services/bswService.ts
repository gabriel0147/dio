import { supabase } from '@/lib/supabase/client'
import { WellBSWRecord } from '@/lib/types'
import { auditService } from './auditService'
import { selectApplicableLabBsw } from '@/lib/bswSelection'

type BSWQuery = {
  eq: (column: string, value: string) => BSWQuery
  gte: (column: string, value: string) => BSWQuery
  lte: (column: string, value: string) => BSWQuery
  limit: (count: number) => BSWQuery
  range: (from: number, to: number) => BSWQuery
  then: PromiseLike<any>['then']
}

export interface BSWFilter {
  tankId?: string
  wellId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}

export interface ApplicableLabBsw {
  testId: string
  tankId: string
  wellId: string
  testEndAt: string
  bswEmulsionPct: number
}

const calculatePercent = (part: unknown, total: unknown) => {
  const partValue = Number(part || 0)
  const totalValue = Number(total || 0)
  if (totalValue <= 0) return null
  return (partValue / totalValue) * 100
}

export const bswService = {
  async getAllEntries(filters: BSWFilter): Promise<WellBSWRecord[]> {
    const buildQuery = () => {
      let query = supabase
        .from('unified_well_bsw')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }) as unknown as BSWQuery

      if (filters.wellId && filters.wellId !== 'all') {
        query = query.eq('well_id', filters.wellId)
      }
      if (filters.tankId && filters.tankId !== 'all') {
        query = query.eq('tank_id', filters.tankId)
      }
      if (filters.startDate) {
        query = query.gte('date', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        query = query.lte('date', end.toISOString())
      }
      if (filters.limit) query = query.limit(filters.limit)
      return query
    }

    const pageSize = filters.limit || 1000
    const firstQuery = buildQuery().range(0, pageSize - 1)

    // 2. Fetch BSW data and Wells data in parallel for performance and decoupling
    const [bswResponse, wellsResponse] = await Promise.all([
      firstQuery,
      supabase.from('wells').select('id, name'),
    ])

    const { data: firstPage, error: bswError } = bswResponse
    const { data: wellsData, error: wellsError } = wellsResponse

    if (bswError) throw bswError
    if (wellsError) throw wellsError

    const bswData = [...(firstPage || [])]
    if (!filters.limit) {
      let from = pageSize
      while (bswData.length === from) {
        const { data: nextPage, error } = await buildQuery().range(
          from,
          from + pageSize - 1,
        )
        if (error) throw error
        bswData.push(...(nextPage || []))
        if (!nextPage || nextPage.length < pageSize) break
        from += pageSize
      }
    }

    // 3. Create a Map for O(1) well name lookup
    const wellMap = new Map<string, string>()
    if (wellsData) {
      wellsData.forEach((w: any) => {
        wellMap.set(w.id, w.name)
      })
    }

    // 4. Map BSW data with well names
    return bswData.map((d: any) => {
      const calculatedEmulsionBsw = calculatePercent(
        d.emulsion_water_volume_m3,
        d.emulsion_volume_m3,
      )
      const calculatedTotalBsw = calculatePercent(
        d.total_water_volume_m3,
        d.total_volume_m3,
      )

      return {
        id: d.id,
        tankId: d.tank_id || undefined,
        wellId: d.well_id,
        wellName: wellMap.get(d.well_id) || 'Desconhecido',
        date: d.date,
        totalVolumeM3: Number(d.total_volume_m3 || 0),
        emulsionVolumeM3: Number(d.emulsion_volume_m3 || 0),
        freeWaterVolumeM3: Number(d.free_water_volume_m3 || 0),
        emulsionWaterVolumeM3: Number(d.emulsion_water_volume_m3 || 0),
        oilVolumeM3: Number(d.oil_volume_m3 || 0),
        totalWaterVolumeM3: Number(d.total_water_volume_m3 || 0),
        bswEmulsionPct:
          calculatedEmulsionBsw ?? Number(d.bsw_emulsion_pct || 0),
        bswTotalPct: calculatedTotalBsw ?? Number(d.bsw_total_pct || 0),
        sourceSrtTestId: d.source_srt_test_id || undefined,
        origin: d.origin,
        userId: d.user_id,
        createdAt: d.created_at,
      }
    })
  },

  async createManualEntry(
    entry: Omit<WellBSWRecord, 'id' | 'origin' | 'createdAt' | 'wellName'>,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('well_bsw_manual_entries')
      .insert({
        well_id: entry.wellId,
        tank_id: entry.tankId || null,
        report_date: entry.date.slice(0, 10),
        measured_at: entry.date,
        total_volume_m3: entry.totalVolumeM3 || 0,
        emulsion_volume_m3: entry.emulsionVolumeM3 || 0,
        free_water_volume_m3: entry.freeWaterVolumeM3 || 0,
        emulsion_water_volume_m3: entry.emulsionWaterVolumeM3 || 0,
        oil_volume_m3: entry.oilVolumeM3 || 0,
        total_water_volume_m3: entry.totalWaterVolumeM3 || 0,
        bsw_emulsion_pct: entry.bswEmulsionPct,
        bsw_total_pct: entry.bswTotalPct,
        source_srt_test_id: entry.sourceSrtTestId || null,
        user_id: entry.userId,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId: entry.userId || '',
      entityType: 'well_bsw_manual_entry',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Lançamento manual de BSW',
      newValue: JSON.stringify(data),
    })
  },

  async getLatestForWell(wellId: string): Promise<WellBSWRecord | null> {
    const records = await this.getAllEntries({ wellId, limit: 1 })
    return records[0] || null
  },

  async getLatestForTankWell(
    tankId: string,
    wellId: string,
  ): Promise<WellBSWRecord | null> {
    const exactRecords = await this.getAllEntries({ tankId, wellId, limit: 1 })
    return exactRecords[0] || null
  },

  async getApplicableLabBsw(
    tankId: string,
    wellId: string,
    referenceAt: string | Date,
  ): Promise<ApplicableLabBsw | null> {
    const referenceIso =
      referenceAt instanceof Date ? referenceAt.toISOString() : referenceAt
    const { data, error } = await supabase
      .from('srt_well_tests')
      .select(
        'id, well_id, test_end_at, bsw_emulsion_pct, status, session:srt_tank_sessions!inner(tank_id)',
      )
      .eq('well_id', wellId)
      .eq('session.tank_id', tankId)
      .in('status', ['valido', 'vigente'])
      .not('bsw_emulsion_pct', 'is', null)
      .lte('test_end_at', referenceIso)
      .order('test_end_at', { ascending: false })
      .limit(1)

    if (error) throw error
    const selected = selectApplicableLabBsw(
      (data || []).map((record) => ({
        testId: record.id,
        tankId: record.session.tank_id,
        wellId: record.well_id,
        testEndAt: record.test_end_at,
        bswEmulsionPct:
          record.bsw_emulsion_pct === null
            ? null
            : Number(record.bsw_emulsion_pct),
        status: record.status,
      })),
      tankId,
      wellId,
      referenceIso,
    )
    if (!selected || selected.bswEmulsionPct === null) return null
    return { ...selected, bswEmulsionPct: selected.bswEmulsionPct }
  },

  async getApplicableTotalBsw(
    tankId: string,
    wellId: string,
    referenceAt: string | Date,
  ): Promise<WellBSWRecord | null> {
    const referenceIso =
      referenceAt instanceof Date ? referenceAt.toISOString() : new Date(referenceAt).toISOString()
    const { data, error } = await supabase
      .from('well_bsw_manual_entries')
      .select('*')
      .eq('tank_id', tankId)
      .eq('well_id', wellId)
      .lte('measured_at', referenceIso)
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: data.id,
      tankId: data.tank_id,
      wellId: data.well_id,
      date: data.measured_at,
      totalVolumeM3: Number(data.total_volume_m3),
      emulsionVolumeM3: Number(data.emulsion_volume_m3),
      freeWaterVolumeM3: Number(data.free_water_volume_m3),
      emulsionWaterVolumeM3: Number(data.emulsion_water_volume_m3),
      oilVolumeM3: Number(data.oil_volume_m3),
      totalWaterVolumeM3: Number(data.total_water_volume_m3),
      bswEmulsionPct: Number(data.bsw_emulsion_pct),
      bswTotalPct: Number(data.bsw_total_pct),
      sourceSrtTestId: data.source_srt_test_id || undefined,
      origin: 'Lançado',
      userId: data.user_id || undefined,
      createdAt: data.created_at,
    }
  },

  async deleteManualEntry(id: string, userId: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from('well_bsw_manual_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('well_bsw_manual_entries')
      .delete()
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'well_bsw_manual_entry',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de lançamento manual de BSW',
      oldValue: JSON.stringify(current),
    })
  },

  async deleteTestEntry(id: string, userId: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from('srt_well_tests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase.from('srt_well_tests').delete().eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_test',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusao de teste via gerenciamento de BSW',
      oldValue: JSON.stringify(current),
    })
  },

  async deleteEntry(record: Pick<WellBSWRecord, 'id' | 'origin'>, userId: string) {
    if (record.origin === 'Teste') {
      await this.deleteTestEntry(record.id, userId)
      return
    }

    await this.deleteManualEntry(record.id, userId)
  },
}
