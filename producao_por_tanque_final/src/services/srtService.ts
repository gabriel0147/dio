import { supabase } from '@/lib/supabase/client'
import {
  SrtMobileTank,
  SrtTankSession,
  SrtWellTest,
  SrtCalibrationRow,
  SrtTestType,
} from '@/lib/types'
import { auditService } from './auditService'
import { calculateSrtMeasurement } from '@/lib/srtMeasurements'

export const srtService = {
  // Mobile Tanks
  async getMobileTanks(
    onlyActive = false,
    projectId?: string,
  ): Promise<SrtMobileTank[]> {
    let query = supabase.from('srt_mobile_tanks').select('*')
    if (onlyActive) {
      query = query.eq('active', true)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    const { data, error } = await query.order('tank_name')
    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      tankName: d.tank_name,
      capacity: Number(d.capacity),
      unit: d.unit,
      notes: d.notes,
      active: d.active,
      wellId: d.well_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async getAvailableMobileTanks(projectId?: string): Promise<SrtMobileTank[]> {
    // 1. Get all active tanks
    let tanksQuery = supabase
      .from('srt_mobile_tanks')
      .select('*')
      .eq('active', true)
      .order('tank_name')

    if (projectId) {
      tanksQuery = tanksQuery.eq('project_id', projectId)
    }

    const { data: tanks, error: tanksError } = await tanksQuery

    if (tanksError) throw tanksError

    // 2. Get IDs of tanks with open sessions (where end_at is null)
    let sessionsQuery = supabase
      .from('srt_tank_sessions')
      .select('tank_id')
      .is('end_at', null)

    if (projectId) {
      sessionsQuery = sessionsQuery.eq('project_id', projectId)
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) throw sessionsError

    const busyTankIds = new Set(sessions.map((s: any) => s.tank_id))

    // 3. Prefer available tanks, but fall back to all active tanks if legacy
    // open sessions would otherwise hide the whole list. Duplicate allocation
    // is still prevented in startSession().
    const availableTanks = tanks.filter((d: any) => !busyTankIds.has(d.id))
    const visibleTanks = availableTanks.length > 0 ? availableTanks : tanks

    return visibleTanks.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      tankName: d.tank_name,
      capacity: Number(d.capacity),
      unit: d.unit,
      notes: d.notes,
      active: d.active,
      wellId: d.well_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async getAvailableTanks(projectId?: string): Promise<SrtMobileTank[]> {
    let sessionsQuery = supabase
      .from('srt_tank_sessions')
      .select('tank_id')
      .is('end_at', null)

    if (projectId) {
      sessionsQuery = sessionsQuery.eq('project_id', projectId)
    }

    const [mobileResult, regularResult, sessionsResult] =
      await Promise.allSettled([
        this.getMobileTanks(true, projectId),
        projectId
          ? supabase
              .from('tanks')
              .select('id, project_id, tag, well_id, created_at, updated_at')
              .eq('project_id', projectId)
              .order('tag', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        sessionsQuery,
      ])

    const mobileTanks =
      mobileResult.status === 'fulfilled' ? mobileResult.value : []
    const regularResponse =
      regularResult.status === 'fulfilled'
        ? regularResult.value
        : { data: [], error: regularResult.reason }
    const sessionsResponse =
      sessionsResult.status === 'fulfilled'
        ? sessionsResult.value
        : { data: [], error: sessionsResult.reason }

    if (regularResponse.error) throw regularResponse.error
    if (sessionsResponse.error) throw sessionsResponse.error

    const busyTankIds = new Set(
      (sessionsResponse.data || []).map((session: any) => session.tank_id),
    )

    const regularTanks: SrtMobileTank[] = (regularResponse.data || []).map(
      (tank: any) => ({
        id: tank.id,
        projectId: tank.project_id,
        tankName: tank.tag,
        capacity: 0,
        unit: 'm3',
        active: true,
        wellId: tank.well_id || undefined,
        createdAt: tank.created_at,
        updatedAt: tank.updated_at,
      }),
    )

    return [...regularTanks, ...mobileTanks]
      .filter((tank) => !busyTankIds.has(tank.id))
      .sort((a, b) => a.tankName.localeCompare(b.tankName))
  },

  async getMobileTankById(id: string): Promise<SrtMobileTank> {
    const { data, error } = await supabase
      .from('srt_mobile_tanks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      id: data.id,
      projectId: data.project_id,
      tankName: data.tank_name,
      capacity: Number(data.capacity),
      unit: data.unit,
      notes: data.notes,
      active: data.active,
      wellId: data.well_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async createMobileTank(
    tank: Omit<SrtMobileTank, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<SrtMobileTank> {
    const { data, error } = await supabase
      .from('srt_mobile_tanks')
      .insert({
        project_id: tank.projectId || null,
        tank_name: tank.tankName,
        capacity: tank.capacity,
        unit: tank.unit,
        notes: tank.notes,
        active: tank.active,
        well_id: tank.wellId,
      } as any)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_mobile_tank',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de tanque móvel',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      tankName: data.tank_name,
      capacity: Number(data.capacity),
      unit: data.unit,
      notes: data.notes,
      active: data.active,
      wellId: data.well_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateMobileTank(
    id: string,
    updates: Partial<SrtMobileTank>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.tankName) dbUpdates.tank_name = updates.tankName
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity
    if (updates.unit) dbUpdates.unit = updates.unit
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.active !== undefined) dbUpdates.active = updates.active
    if (updates.wellId !== undefined) dbUpdates.well_id = updates.wellId
    if (updates.projectId !== undefined)
      dbUpdates.project_id = updates.projectId

    const { error } = await supabase
      .from('srt_mobile_tanks')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_mobile_tank',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de tanque móvel',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  // Sessions (Planejamento de Testes)
  async getSessions(
    openOnly = false,
    projectId?: string,
  ): Promise<SrtTankSession[]> {
    let query = supabase
      .from('srt_tank_sessions')
      .select('*')
      .order('start_at', { ascending: false })

    if (openOnly) {
      query = query.is('end_at', null)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    let { data, error } = await query

    if (error && projectId) {
      console.warn(
        'Failed to load SRT sessions scoped by project_id; retrying with local filter.',
        error,
      )

      let fallbackQuery = supabase
        .from('srt_tank_sessions')
        .select('*')
        .order('start_at', { ascending: false })

      if (openOnly) {
        fallbackQuery = fallbackQuery.is('end_at', null)
      }

      const fallback = await fallbackQuery
      if (fallback.error) throw error

      data = (fallback.data || []).filter(
        (session: any) => session.project_id === projectId,
      )
      error = null
    }

    if (error) throw error

    const rows = data || []

    const tankIds = [...new Set(rows.map((session: any) => session.tank_id))]
    const wellIds = [
      ...new Set(
        rows
          .map((session: any) => session.well_id)
          .filter((wellId: string | null) => !!wellId),
      ),
    ]
    const sessionsMissingResponsible = rows
      .filter((session: any) => !session.responsible_user_id)
      .map((session: any) => session.id)

    const sessionResponsibleFallbackMap = new Map<string, string>()
    if (sessionsMissingResponsible.length > 0) {
      const { data: testsWithResponsible, error: testsResponsibleError } =
        await supabase
          .from('srt_well_tests')
          .select('session_id, responsible_user_id, created_at')
          .in('session_id', sessionsMissingResponsible)
          .not('responsible_user_id', 'is', null)
          .order('created_at', { ascending: false })

      if (testsResponsibleError) {
        console.warn(
          'Failed to enrich SRT sessions with test responsible users.',
          testsResponsibleError,
        )
      }

      ;(testsWithResponsible || []).forEach((test: any) => {
        if (!sessionResponsibleFallbackMap.has(test.session_id)) {
          sessionResponsibleFallbackMap.set(
            test.session_id,
            test.responsible_user_id,
          )
        }
      })
    }

    const userIds = [
      ...new Set(
        [
          ...rows.map((session: any) => session.responsible_user_id),
          ...Array.from(sessionResponsibleFallbackMap.values()),
        ].filter((userId: string | null) => !!userId),
      ),
    ]

    const [mobileTanksResult, regularTanksResult, wellsResult, usersResult] =
      await Promise.allSettled([
        tankIds.length > 0
          ? supabase
              .from('srt_mobile_tanks')
              .select('id, tank_name')
              .in('id', tankIds)
          : Promise.resolve({ data: [], error: null }),
        tankIds.length > 0
          ? supabase.from('tanks').select('id, tag').in('id', tankIds)
          : Promise.resolve({ data: [], error: null }),
        wellIds.length > 0
          ? supabase.from('wells').select('id, name').in('id', wellIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length > 0
          ? supabase
              .from('user_profiles')
              .select('id, full_name')
              .in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
      ])

    const mobileTanksResponse =
      mobileTanksResult.status === 'fulfilled'
        ? mobileTanksResult.value
        : { data: [], error: mobileTanksResult.reason }
    const regularTanksResponse =
      regularTanksResult.status === 'fulfilled'
        ? regularTanksResult.value
        : { data: [], error: regularTanksResult.reason }
    const wellsResponse =
      wellsResult.status === 'fulfilled'
        ? wellsResult.value
        : { data: [], error: wellsResult.reason }
    const usersResponse =
      usersResult.status === 'fulfilled'
        ? usersResult.value
        : { data: [], error: usersResult.reason }

    if (mobileTanksResponse.error) {
      console.warn(
        'Failed to enrich SRT sessions with mobile tank names.',
        mobileTanksResponse.error,
      )
    }
    if (regularTanksResponse.error) {
      console.warn(
        'Failed to enrich SRT sessions with tank names.',
        regularTanksResponse.error,
      )
    }
    if (wellsResponse.error) {
      console.warn(
        'Failed to enrich SRT sessions with well names.',
        wellsResponse.error,
      )
    }
    if (usersResponse.error) {
      console.warn(
        'Failed to enrich SRT sessions with responsible user names.',
        usersResponse.error,
      )
    }

    const tankMap = new Map<string, string>()
    ;(regularTanksResponse.data || []).forEach((tank: any) => {
      tankMap.set(tank.id, tank.tag)
    })
    ;(mobileTanksResponse.data || []).forEach((tank: any) => {
      tankMap.set(tank.id, tank.tank_name)
    })

    const wellMap = new Map<string, string>()
    ;(wellsResponse.data || []).forEach((well: any) => {
      wellMap.set(well.id, well.name)
    })

    const userMap = new Map<string, string>()
    ;(usersResponse.data || []).forEach((user: any) => {
      userMap.set(user.id, user.full_name || 'Responsável registrado')
    })

    return rows.map((d: any) => {
      const responsibleUserId =
        d.responsible_user_id || sessionResponsibleFallbackMap.get(d.id)

      return {
        id: d.id,
        projectId: d.project_id,
        tankId: d.tank_id,
        tankName: tankMap.get(d.tank_id),
        wellId: d.well_id,
        wellName: d.well_id ? wellMap.get(d.well_id) : undefined,
        startAt: d.start_at,
        endAt: d.end_at,
        responsibleUserId,
        responsibleUserName: responsibleUserId
          ? userMap.get(responsibleUserId) || 'Responsável registrado'
          : undefined,
        notes: d.notes,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }
    })
  },

  async startSession(
    projectId: string,
    tankId: string,
    userId: string,
    notes?: string,
    startAt?: string,
    wellId?: string,
  ): Promise<SrtTankSession> {
    const { data: mobileTank, error: mobileTankError } = await supabase
      .from('srt_mobile_tanks')
      .select('id, project_id, well_id')
      .eq('id', tankId)
      .maybeSingle()

    if (mobileTankError) throw mobileTankError

    const { data: regularTank, error: regularTankError } = await supabase
      .from('tanks')
      .select('id, project_id, well_id')
      .eq('id', tankId)
      .maybeSingle()

    if (regularTankError) throw regularTankError

    const tank = mobileTank || regularTank
    if (!tank) {
      throw new Error('Tanque nao encontrado.')
    }
    if (tank.project_id && tank.project_id !== projectId) {
      throw new Error('O tanque selecionado pertence a outro projeto.')
    }
    if (wellId && tank.well_id && tank.well_id !== wellId) {
      throw new Error('O poco selecionado nao corresponde ao poco do tanque.')
    }

    // 1. Check if the tank has an open session (prevent double allocation)
    const { data: existing, error: checkError } = await supabase
      .from('srt_tank_sessions')
      .select('id')
      .eq('tank_id', tankId)
      .is('end_at', null)
      .maybeSingle()

    if (checkError) throw checkError
    if (existing) {
      throw new Error(
        'Este tanque já está associado a um planejamento ativo. Conclua o anterior antes de iniciar um novo.',
      )
    }

    // 2. Create the session
    const { data, error } = await supabase
      .from('srt_tank_sessions')
      .insert({
        project_id: projectId,
        tank_id: tankId,
        start_at: startAt || new Date().toISOString(),
        responsible_user_id: userId,
        notes,
        well_id: wellId || null,
      } as any)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_session',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Abertura de planejamento de teste',
    })

    return {
      id: data.id,
      projectId: data.project_id,
      tankId: data.tank_id,
      wellId: data.well_id,
      startAt: data.start_at,
      endAt: data.end_at,
      responsibleUserId: data.responsible_user_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async assignSessionResponsible(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('srt_tank_sessions')
      .update({ responsible_user_id: userId })
      .eq('id', sessionId)
      .is('responsible_user_id', null)

    if (error) throw error
  },

  async closeSession(
    sessionId: string,
    userId: string,
    notes?: string,
    endAt?: string,
  ): Promise<void> {
    const updates: any = {
      end_at: endAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (notes) updates.notes = notes

    const { error } = await supabase
      .from('srt_tank_sessions')
      .update(updates)
      .eq('id', sessionId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_session',
      entityId: sessionId,
      operationType: 'update',
      reason: 'Fechamento de planejamento de teste',
    })
  },

  async updateSession(
    sessionId: string,
    updates: {
      projectId: string
      tankId: string
      wellId: string
      startAt: string
      notes?: string
    },
    userId: string,
  ): Promise<void> {
    const { data: current, error: currentError } = await supabase
      .from('srt_tank_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (currentError) throw currentError

    const { data: mobileTank, error: mobileTankError } = await supabase
      .from('srt_mobile_tanks')
      .select('id, project_id, well_id')
      .eq('id', updates.tankId)
      .maybeSingle()

    if (mobileTankError) throw mobileTankError

    const { data: regularTank, error: regularTankError } = await supabase
      .from('tanks')
      .select('id, project_id, well_id')
      .eq('id', updates.tankId)
      .maybeSingle()

    if (regularTankError) throw regularTankError

    const tank = mobileTank || regularTank
    if (!tank) {
      throw new Error('Tanque nao encontrado.')
    }
    if (tank.project_id && tank.project_id !== updates.projectId) {
      throw new Error('O tanque selecionado pertence a outro projeto.')
    }
    if (tank.well_id && tank.well_id !== updates.wellId) {
      throw new Error('O poco selecionado nao corresponde ao poco do tanque.')
    }

    const { data: existing, error: checkError } = await supabase
      .from('srt_tank_sessions')
      .select('id')
      .eq('tank_id', updates.tankId)
      .is('end_at', null)
      .neq('id', sessionId)
      .maybeSingle()

    if (checkError) throw checkError
    if (existing) {
      throw new Error(
        'Este tanque ja esta associado a outro planejamento ativo.',
      )
    }

    const dbUpdates = {
      project_id: updates.projectId,
      tank_id: updates.tankId,
      well_id: updates.wellId,
      start_at: updates.startAt,
      notes: updates.notes || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('srt_tank_sessions')
      .update(dbUpdates)
      .eq('id', sessionId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_session',
      entityId: sessionId,
      operationType: 'update',
      reason: 'Atualizacao de planejamento de teste',
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { data: current, error: currentError } = await supabase
      .from('srt_tank_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (currentError) throw currentError

    const { data: tests, error: testsError } = await supabase
      .from('srt_well_tests')
      .select('*')
      .eq('session_id', sessionId)

    if (testsError) throw testsError

    if ((tests || []).length > 0) {
      const { error: testsDeleteError } = await supabase
        .from('srt_well_tests')
        .delete()
        .eq('session_id', sessionId)

      if (testsDeleteError) throw testsDeleteError
    }

    const { error } = await supabase
      .from('srt_tank_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_session',
      entityId: sessionId,
      operationType: 'delete',
      reason: 'Exclusao de planejamento de teste',
      oldValue: JSON.stringify({
        session: current,
        tests: tests || [],
      }),
    })
  },

  // Well Tests
  async getTests(sessionId: string): Promise<SrtWellTest[]> {
    const { data, error } = await supabase
      .from('srt_well_tests')
      .select('*, well:wells(name)')
      .eq('session_id', sessionId)
      .order('test_start_at', { ascending: false })

    if (error) throw error

    return data.map(mapDbTestToType)
  },

  async getTestsByWell(wellId: string): Promise<SrtWellTest[]> {
    const { data, error } = await supabase
      .from('srt_well_tests')
      .select('*, well:wells(name)')
      .eq('well_id', wellId)
      .order('test_start_at', { ascending: false })

    if (error) throw error
    return data.map(mapDbTestToType)
  },

  async getTestById(testId: string): Promise<SrtWellTest | null> {
    const { data, error } = await supabase
      .from('srt_well_tests')
      .select('*, well:wells(name)')
      .eq('id', testId)
      .single()

    if (error) return null
    return mapDbTestToType(data)
  },

  async getWellPotential(wellId: string): Promise<SrtWellTest | null> {
    const { data, error } = await supabase
      .from('srt_well_tests')
      .select('*, well:wells(name)')
      .eq('well_id', wellId)
      .eq('status', 'vigente')
      .eq('test_type', 'apropriacao')
      .order('test_end_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return mapDbTestToType(data)
  },

  async getTestsForLabAnalysis(limit?: number): Promise<SrtWellTest[]> {
    const pageSize = limit || 1000
    const rows: any[] = []
    let from = 0

    while (true) {
      let query = supabase
        .from('srt_well_tests')
        .select('*, well:wells(name)')
        .neq('status', 'invalido')
        .order('test_end_at', { ascending: false })

      if (limit) query = query.limit(limit)
      const { data, error } = await query.range(from, from + pageSize - 1)
      if (error) throw error
      rows.push(...(data || []))
      if (limit || !data || data.length < pageSize) break
      from += pageSize
    }

    return rows.map(mapDbTestToType)
  },

  async getRecentTests(limit = 50): Promise<SrtWellTest[]> {
    return this.searchTests({ limit })
  },

  async searchTests(filters: {
    wellId?: string
    testType?: SrtTestType | 'all'
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<SrtWellTest[]> {
    let query = supabase
      .from('srt_well_tests')
      .select('*, well:wells(name)')
      .neq('status', 'invalido')
      .order('test_end_at', { ascending: false })

    if (filters.wellId && filters.wellId !== 'all') {
      query = query.eq('well_id', filters.wellId)
    }

    if (filters.testType && filters.testType !== 'all') {
      query = query.eq('test_type', filters.testType)
    }

    if (filters.startDate) {
      query = query.gte('test_end_at', filters.startDate.toISOString())
    }

    if (filters.endDate) {
      // Use end of day
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('test_end_at', end.toISOString())
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data.map(mapDbTestToType)
  },

  async createTest(
    test: Omit<
      SrtWellTest,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'durationH'
      | 'qLiq'
      | 'qOil'
      | 'qWat'
      | 'potLiq24h'
      | 'potOil24h'
      | 'potWat24h'
      | 'bswTotalPct'
    >,
    userId: string,
  ): Promise<SrtWellTest> {
    const { count, error: countError } = await supabase
      .from('srt_well_tests')
      .select('id', { count: 'exact', head: true })
      .eq('well_id', test.wellId)
      .lte('test_start_at', test.testEndAt)
      .gte('test_end_at', test.testStartAt)

    if (countError) throw countError
    if (count && count > 0) {
      throw new Error(
        'Conflito de horário: Já existe um teste registrado para este poço neste intervalo.',
      )
    }

    const dbData = mapTypeToDbTest(test, userId)

    const { data, error } = await supabase
      .from('srt_well_tests')
      .insert(dbData)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_test',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Registro de novo teste de poço',
    })

    return mapDbTestToType(data)
  },

  async updateTest(
    id: string,
    updates: Partial<SrtWellTest>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = {}
    if (updates.status) dbUpdates.status = updates.status
    if (updates.testType) dbUpdates.test_type = updates.testType
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.testStartAt) dbUpdates.test_start_at = updates.testStartAt
    if (updates.testEndAt) dbUpdates.test_end_at = updates.testEndAt
    if (updates.vLiqTest !== undefined) dbUpdates.v_liq_test = updates.vLiqTest
    if (updates.vOilTest !== undefined) dbUpdates.v_oil_test = updates.vOilTest
    if (updates.vWatTest !== undefined) dbUpdates.v_wat_test = updates.vWatTest
    if (updates.vGasTest !== undefined) dbUpdates.v_gas_test = updates.vGasTest
    if (updates.temperatureAvg !== undefined)
      dbUpdates.temperature_avg = updates.temperatureAvg
    if (updates.density !== undefined) dbUpdates.density = updates.density
    if (updates.bswEmulsionPct !== undefined)
      dbUpdates.bsw_emulsion_pct = updates.bswEmulsionPct

    // New Breakdown Columns
    if (updates.vEmulsion !== undefined)
      dbUpdates.v_emulsion = updates.vEmulsion
    if (updates.vFreeWater !== undefined)
      dbUpdates.v_free_water = updates.vFreeWater
    if (updates.vWaterInEmulsion !== undefined)
      dbUpdates.v_water_in_emulsion = updates.vWaterInEmulsion
    if (updates.vWaterTotal !== undefined)
      dbUpdates.v_water_total = updates.vWaterTotal

    if (updates.fe !== undefined) dbUpdates.fe = updates.fe
    if (updates.fcv !== undefined) dbUpdates.fcv = updates.fcv
    if (updates.fdt !== undefined) dbUpdates.fdt = updates.fdt
    if (updates.vOilCorrected !== undefined)
      dbUpdates.v_oil_corrected = updates.vOilCorrected

    if (updates.totalHeightMm !== undefined)
      dbUpdates.total_height_mm = updates.totalHeightMm
    if (updates.afterDrainageHeightMm !== undefined)
      dbUpdates.after_drainage_height_mm = updates.afterDrainageHeightMm
    if (updates.initialHeightMm !== undefined)
      dbUpdates.initial_height_mm = updates.initialHeightMm
    if (updates.finalHeightMm !== undefined)
      dbUpdates.final_height_mm = updates.finalHeightMm
    if (updates.emulsionHeightMm !== undefined)
      dbUpdates.emulsion_height_mm = updates.emulsionHeightMm
    if (updates.initialLevelVolumeM3 !== undefined)
      dbUpdates.initial_level_volume_m3 = updates.initialLevelVolumeM3
    if (updates.finalLevelVolumeM3 !== undefined)
      dbUpdates.final_level_volume_m3 = updates.finalLevelVolumeM3
    if (updates.emulsionLevelVolumeM3 !== undefined)
      dbUpdates.emulsion_level_volume_m3 = updates.emulsionLevelVolumeM3
    if (updates.ftc !== undefined) dbUpdates.ftc = updates.ftc
    if (updates.sourceBswTestId !== undefined)
      dbUpdates.source_bsw_test_id = updates.sourceBswTestId || null

    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('srt_well_tests')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_test',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de teste de poço',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async updateTestLabData(
    id: string,
    labData: {
      bswEmulsionPct: number
      bswMethod?: string
      bswQuality?: string
      ipswValue?: number
      ipswUnit?: string
      analysisNotes?: string
      labReportAttachment?: string
      status?: string
    },
    userId: string,
  ): Promise<void> {
    const { data: currentTest, error: fetchError } = await supabase
      .from('srt_well_tests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const durationHours =
      (new Date(currentTest.test_end_at).getTime() -
        new Date(currentTest.test_start_at).getTime()) /
      3_600_000
    const updates: any = {
      bsw_emulsion_pct: labData.bswEmulsionPct,
      bsw_method: labData.bswMethod,
      bsw_quality: labData.bswQuality,
      ipsw_value: labData.ipswValue,
      ipsw_unit: labData.ipswUnit,
      analysis_notes: labData.analysisNotes,
      lab_report_attachment: labData.labReportAttachment,
      updated_at: new Date().toISOString(),
    }

    const hasNewMeasurement =
      currentTest.initial_level_volume_m3 !== null &&
      currentTest.final_level_volume_m3 !== null &&
      currentTest.emulsion_level_volume_m3 !== null

    if (hasNewMeasurement && durationHours > 0) {
      const measurement = calculateSrtMeasurement({
        initialVolumeM3: Number(currentTest.initial_level_volume_m3),
        finalVolumeM3: Number(currentTest.final_level_volume_m3),
        emulsionLevelVolumeM3: Number(currentTest.emulsion_level_volume_m3),
        bswEmulsionPct: labData.bswEmulsionPct,
        fcv: Number(currentTest.fcv || 1),
        fe: Number(currentTest.fe || 1),
        ftc: Number(currentTest.ftc || currentTest.fdt || 1),
        durationHours,
      })
      updates.v_oil_test = measurement.uncorrectedOilVolumeM3
      updates.v_water_in_emulsion = measurement.emulsionWaterVolumeM3
      updates.v_wat_test = measurement.totalWaterVolumeM3
      updates.v_water_total = measurement.totalWaterVolumeM3
      updates.v_oil_corrected = measurement.correctedOilVolumeM3
    }

    if (labData.status) {
      updates.status = labData.status
    }

    const { error } = await supabase
      .from('srt_well_tests')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_test',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de dados de laboratório (BSW)',
      newValue: JSON.stringify(updates),
    })
  },

  async uploadLabReport(testId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `lab-report-${testId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath)
    return data.publicUrl
  },

  async getCalibration(tankId: string): Promise<SrtCalibrationRow[]> {
    const PAGE_SIZE = 1000
    let allRows: any[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('srt_mobile_tank_calibration')
        .select('*')
        .eq('tank_id', tankId)
        .order('height_mm', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error

      if (data && data.length > 0) {
        allRows = [...allRows, ...data]
        if (data.length < PAGE_SIZE) {
          hasMore = false
        } else {
          from += PAGE_SIZE
        }
      } else {
        hasMore = false
      }
    }

    return allRows.map((d: any) => ({
      id: d.id,
      tankId: d.tank_id,
      heightMm: Number(d.height_mm),
      volumeM3: Number(d.volume_m3),
      fcv: d.fcv ? Number(d.fcv) : 1.0,
      createdAt: d.created_at,
    }))
  },

  async getSessionCalibration(sessionId: string): Promise<SrtCalibrationRow[]> {
    const { data: session, error: sessionError } = await supabase
      .from('srt_tank_sessions')
      .select('tank_id')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    const tankId = session.tank_id
    const { data: mobileTank, error: mobileTankError } = await supabase
      .from('srt_mobile_tanks')
      .select('id')
      .eq('id', tankId)
      .maybeSingle()

    if (mobileTankError) throw mobileTankError

    if (mobileTank) {
      return this.getCalibration(tankId)
    }

    const { data: regularTank, error: regularTankError } = await supabase
      .from('tanks')
      .select('id')
      .eq('id', tankId)
      .maybeSingle()

    if (regularTankError) throw regularTankError

    if (!regularTank) {
      throw new Error('Tanque do planejamento não encontrado.')
    }

    const PAGE_SIZE = 1000
    let allRows: any[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('calibration_data')
        .select('*')
        .eq('tank_id', tankId)
        .order('height_mm', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error

      if (data && data.length > 0) {
        allRows = [...allRows, ...data]
        if (data.length < PAGE_SIZE) {
          hasMore = false
        } else {
          from += PAGE_SIZE
        }
      } else {
        hasMore = false
      }
    }

    return allRows.map((d: any) => ({
      id: d.id,
      tankId: d.tank_id,
      heightMm: Number(d.height_mm),
      volumeM3: Number(d.volume_m3),
      fcv: d.fcv ? Number(d.fcv) : 1.0,
      createdAt: d.created_at,
    }))
  },

  async saveCalibrationRow(
    tankId: string,
    row: Omit<SrtCalibrationRow, 'id' | 'tankId' | 'createdAt'>,
    userId: string,
  ): Promise<SrtCalibrationRow> {
    const { data, error } = await supabase
      .from('srt_mobile_tank_calibration')
      .insert({
        tank_id: tankId,
        height_mm: row.heightMm,
        volume_m3: row.volumeM3,
        fcv: row.fcv ?? 1.0,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_calibration',
      entityId: tankId,
      operationType: 'insert',
      reason: 'Adição de ponto de calibração',
      newValue: JSON.stringify(row),
    })

    return {
      id: data.id,
      tankId: data.tank_id,
      heightMm: Number(data.height_mm),
      volumeM3: Number(data.volume_m3),
      fcv: data.fcv ? Number(data.fcv) : 1.0,
      createdAt: data.created_at,
    }
  },

  async updateCalibrationRow(
    id: string,
    row: Partial<Omit<SrtCalibrationRow, 'id' | 'tankId' | 'createdAt'>>,
    userId: string,
  ): Promise<void> {
    const updates: any = {}
    if (row.heightMm !== undefined) updates.height_mm = row.heightMm
    if (row.volumeM3 !== undefined) updates.volume_m3 = row.volumeM3
    if (row.fcv !== undefined) updates.fcv = row.fcv

    const { error } = await supabase
      .from('srt_mobile_tank_calibration')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_calibration',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de ponto de calibração',
      newValue: JSON.stringify(updates),
    })
  },

  async deleteCalibrationRow(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('srt_mobile_tank_calibration')
      .delete()
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_calibration',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de ponto de calibração',
    })
  },

  async clearCalibration(tankId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('srt_mobile_tank_calibration')
      .delete()
      .eq('tank_id', tankId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'srt_calibration',
      entityId: tankId,
      operationType: 'clear_srt_calibration',
      reason: 'Limpeza de tabela de arqueação',
    })
  },

  async importCalibration(
    tankId: string,
    file: File,
    mode: 'overwrite' | 'append',
    userId: string,
  ): Promise<number> {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      throw new Error('Importe um arquivo CSV com colunas Altura e Volume.')
    }

    const parseNumber = (value: string) => {
      const compact = value.trim().replace(/\s/g, '')
      const normalized = compact.includes(',')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : NaN
    }

    const splitCsvLine = (line: string, separator: string) => {
      const cells: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"' && nextChar === '"') {
          current += '"'
          i += 1
        } else if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === separator && !inQuotes) {
          cells.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      cells.push(current.trim())
      return cells
    }

    const normalizeHeader = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    const text = await file.text()
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      throw new Error('O arquivo CSV está vazio.')
    }

    const separator = lines[0].includes(';')
      ? ';'
      : lines[0].includes('\t')
        ? '\t'
        : ','

    const rows = lines.map((line) => splitCsvLine(line, separator))
    const header = rows[0].map(normalizeHeader)
    const heightIdx = header.findIndex((h) =>
      [
        'altura',
        'alturamm',
        'height',
        'heightmm',
        'h',
        'nivel',
        'level',
      ].includes(h),
    )
    const volumeIdx = header.findIndex((h) =>
      ['volume', 'volumem3', 'vol', 'v', 'capacidade', 'capacity'].includes(h),
    )
    const hasHeader = heightIdx >= 0 && volumeIdx >= 0
    const dataRows = hasHeader ? rows.slice(1) : rows
    const effectiveHeightIdx = hasHeader ? heightIdx : 0
    const effectiveVolumeIdx = hasHeader ? volumeIdx : 1

    const parsedRows = dataRows
      .map((row) => {
        const height = parseNumber(row[effectiveHeightIdx] ?? '')
        const rawVolume = parseNumber(row[effectiveVolumeIdx] ?? '')
        return {
          height_mm: height,
          volume_m3: rawVolume > 100 ? rawVolume / 1000 : rawVolume,
          fcv: 1.0,
        }
      })
      .filter(
        (row) =>
          Number.isFinite(row.height_mm) &&
          Number.isFinite(row.volume_m3) &&
          row.height_mm >= 0 &&
          row.volume_m3 >= 0,
      )

    if (parsedRows.length === 0) {
      throw new Error(
        'Nenhuma linha válida foi encontrada. Verifique se o CSV tem Altura e Volume numéricos.',
      )
    }

    if (mode === 'overwrite') {
      const { error: deleteError } = await supabase
        .from('srt_mobile_tank_calibration')
        .delete()
        .eq('tank_id', tankId)

      if (deleteError) throw deleteError
    }

    const rowsToInsert = parsedRows.map((row) => ({
      tank_id: tankId,
      ...row,
    }))

    const batchSize = 1000
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const { error } = await supabase
        .from('srt_mobile_tank_calibration')
        .insert(rowsToInsert.slice(i, i + batchSize))

      if (error) throw error
    }

    await auditService.createLog({
      userId,
      entityType: 'srt_calibration',
      entityId: tankId,
      operationType: 'import_srt_calibration',
      reason: `Importação de calibração (${mode})`,
    })

    return parsedRows.length
  },
}

function mapDbTestToType(d: any): SrtWellTest {
  const vLiqTest = Number(d.v_liq_test || 0)
  const vWatTest = Number(d.v_wat_test || 0)
  const vOilTest = Number(d.v_oil_test || 0)
  const vOilCorrected = Number(d.v_oil_corrected || 0)
  // Calculate BSW Total (%) based on total water and total liquid volume
  const bswTotalPct = vLiqTest > 0 ? (vWatTest / vLiqTest) * 100 : 0

  const start = new Date(d.test_start_at).getTime()
  const end = new Date(d.test_end_at).getTime()
  const durationH = start && end ? (end - start) / (3600 * 1000) : 0

  const potLiq24h = durationH > 0 ? (vLiqTest / durationH) * 24 : 0
  const potOil24h = durationH > 0 ? (vOilCorrected / durationH) * 24 : 0
  const potWat24h = durationH > 0 ? (vWatTest / durationH) * 24 : 0

  return {
    id: d.id,
    sessionId: d.session_id,
    wellId: d.well_id,
    wellName: d.well?.name,
    testStartAt: d.test_start_at,
    testEndAt: d.test_end_at,
    testType: d.test_type,
    status: d.status,
    responsibleUserId: d.responsible_user_id,
    notes: d.notes,
    vLiqTest: vLiqTest,
    vOilTest: vOilTest,
    vWatTest: vWatTest,
    vGasTest: Number(d.v_gas_test),
    vEmulsion: d.v_emulsion !== null ? Number(d.v_emulsion) : undefined,
    vFreeWater: d.v_free_water !== null ? Number(d.v_free_water) : undefined,
    vWaterInEmulsion: d.v_water_in_emulsion !== null
      ? Number(d.v_water_in_emulsion)
      : undefined,
    vWaterTotal:
      d.v_water_total !== null ? Number(d.v_water_total) : undefined,
    totalHeightMm:
      d.total_height_mm !== null ? Number(d.total_height_mm) : undefined,
    afterDrainageHeightMm:
      d.after_drainage_height_mm !== null
        ? Number(d.after_drainage_height_mm)
        : undefined,
    initialHeightMm:
      d.initial_height_mm !== null ? Number(d.initial_height_mm) : undefined,
    finalHeightMm:
      d.final_height_mm !== null ? Number(d.final_height_mm) : undefined,
    emulsionHeightMm:
      d.emulsion_height_mm !== null ? Number(d.emulsion_height_mm) : undefined,
    initialLevelVolumeM3:
      d.initial_level_volume_m3 !== null
        ? Number(d.initial_level_volume_m3)
        : undefined,
    finalLevelVolumeM3:
      d.final_level_volume_m3 !== null
        ? Number(d.final_level_volume_m3)
        : undefined,
    emulsionLevelVolumeM3:
      d.emulsion_level_volume_m3 !== null
        ? Number(d.emulsion_level_volume_m3)
        : undefined,
    fe: d.fe !== null ? Number(d.fe) : undefined,
    fcv: d.fcv !== null ? Number(d.fcv) : undefined,
    fdt: d.fdt !== null ? Number(d.fdt) : undefined,
    ftc:
      d.ftc !== null && d.ftc !== undefined
        ? Number(d.ftc)
        : d.fdt !== null
          ? Number(d.fdt)
          : undefined,
    sourceBswTestId: d.source_bsw_test_id || undefined,
    vOilCorrected:
      d.v_oil_corrected !== null ? vOilCorrected : undefined,
    temperatureAvg: Number(d.temperature_avg),
    density: Number(d.density),
    densityRefTemp: Number(d.density_ref_temp),
    ipswValue: Number(d.ipsw_value),
    ipswUnit: d.ipsw_unit,
    analysisNotes: d.analysis_notes,
    labReportAttachment: d.lab_report_attachment,
    bswEmulsionPct: Number(d.bsw_emulsion_pct),
    bswMethod: d.bsw_method,
    bswQuality: d.bsw_quality,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    bswTotalPct,
    durationH,
    potLiq24h,
    potOil24h,
    potWat24h,
  }
}

function mapTypeToDbTest(t: any, userId: string) {
  return {
    session_id: t.sessionId,
    well_id: t.wellId,
    test_start_at: t.testStartAt,
    test_end_at: t.testEndAt,
    test_type: t.testType,
    status: t.status,
    responsible_user_id: userId,
    notes: t.notes,
    v_liq_test: t.vLiqTest,
    v_oil_test: t.vOilTest,
    v_wat_test: t.vWatTest,
    v_gas_test: t.vGasTest,
    v_emulsion: t.vEmulsion,
    v_free_water: t.vFreeWater,
    v_water_in_emulsion: t.vWaterInEmulsion,
    v_water_total: t.vWaterTotal,
    total_height_mm: t.totalHeightMm,
    after_drainage_height_mm: t.afterDrainageHeightMm,
    initial_height_mm: t.initialHeightMm,
    final_height_mm: t.finalHeightMm,
    emulsion_height_mm: t.emulsionHeightMm,
    initial_level_volume_m3: t.initialLevelVolumeM3,
    final_level_volume_m3: t.finalLevelVolumeM3,
    emulsion_level_volume_m3: t.emulsionLevelVolumeM3,
    source_bsw_test_id: t.sourceBswTestId,
    fe: t.fe,
    fcv: t.fcv,
    fdt: t.fdt,
    ftc: t.ftc,
    v_oil_corrected: t.vOilCorrected,
    temperature_avg: t.temperatureAvg,
    density: t.density,
    density_ref_temp: t.densityRefTemp,
    ipsw_value: t.ipswValue,
    ipsw_unit: t.ipswUnit,
    analysis_notes: t.analysisNotes,
    lab_report_attachment: t.labReportAttachment,
    bsw_emulsion_pct: t.bswEmulsionPct,
    bsw_method: t.bswMethod,
    bsw_quality: t.bswQuality,
  }
}
