import { supabase } from '@/lib/supabase/client'
import { SbpAsset } from '@/lib/types'
import { auditService } from './auditService'

export const sbpService = {
  async getAssets(projectId: string): Promise<SbpAsset[]> {
    const { data, error } = await supabase
      .from('sbp_assets')
      .select('*')
      .eq('project_id', projectId)
      .order('asset_number')

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      assetNumber: d.asset_number,
      description: d.description,
      category: d.category,
      acquisitionDate: d.acquisition_date,
      acquisitionValue: Number(d.acquisition_value),
      estimatedUsefulLife: d.estimated_useful_life,
      location: d.location,
      responsible: d.responsible,
      situation: d.situation,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createAsset(
    asset: Omit<SbpAsset, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<SbpAsset> {
    const { data, error } = await supabase
      .from('sbp_assets')
      .insert({
        project_id: asset.projectId,
        asset_number: asset.assetNumber,
        description: asset.description,
        category: asset.category,
        acquisition_date: asset.acquisitionDate,
        acquisition_value: asset.acquisitionValue,
        estimated_useful_life: asset.estimatedUsefulLife,
        location: asset.location,
        responsible: asset.responsible,
        situation: asset.situation,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sbp_asset',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de bem patrimonial',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      assetNumber: data.asset_number,
      description: data.description,
      category: data.category,
      acquisitionDate: data.acquisition_date,
      acquisitionValue: Number(data.acquisition_value),
      estimatedUsefulLife: data.estimated_useful_life,
      location: data.location,
      responsible: data.responsible,
      situation: data.situation as SbpAsset['situation'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateAsset(
    id: string,
    updates: Partial<SbpAsset>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.assetNumber) dbUpdates.asset_number = updates.assetNumber
    if (updates.description) dbUpdates.description = updates.description
    if (updates.category) dbUpdates.category = updates.category
    if (updates.acquisitionDate !== undefined)
      dbUpdates.acquisition_date = updates.acquisitionDate
    if (updates.acquisitionValue !== undefined)
      dbUpdates.acquisition_value = updates.acquisitionValue
    if (updates.estimatedUsefulLife !== undefined)
      dbUpdates.estimated_useful_life = updates.estimatedUsefulLife
    if (updates.location !== undefined) dbUpdates.location = updates.location
    if (updates.responsible !== undefined)
      dbUpdates.responsible = updates.responsible
    if (updates.situation) dbUpdates.situation = updates.situation

    const { error } = await supabase
      .from('sbp_assets')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sbp_asset',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de bem patrimonial',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async deleteAsset(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('sbp_assets').delete().eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sbp_asset',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de bem patrimonial',
    })
  },
}
