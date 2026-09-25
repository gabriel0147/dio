import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export const settingsService = {
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching setting ${key}:`, error)
      return null
    }

    return data?.value || null
  },

  async updateSetting(
    key: string,
    value: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error
  },

  async uploadLogo(file: File, userId: string): Promise<string> {
    // Generate a unique path to avoid collisions and cache issues
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${uuidv4()}.${fileExt}`
    const filePath = `${fileName}`

    // Upload to 'app-assets' bucket
    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath)

    const publicUrl = data.publicUrl

    // Update the setting
    await this.updateSetting('company_logo_url', publicUrl, userId)

    return publicUrl
  },

  async removeLogo(userId: string): Promise<void> {
    // We just clear the setting. We could delete the file from storage,
    // but without tracking the old path easily, we'll leave it as orphan or handle cleanup later.
    // For now, just clearing the reference is sufficient for the UI.
    await this.updateSetting('company_logo_url', '', userId)
  },
}
