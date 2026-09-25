import { supabase } from '@/lib/supabase/client'

export const notificationService = {
  async notifyProjectUpdate(
    projectId: string,
    type: 'operation' | 'report' | 'alert',
    data: any,
  ) {
    try {
      // Fire and forget - don't block the UI
      supabase.functions.invoke('send-project-update', {
        body: {
          projectId,
          type,
          data,
        },
      })
    } catch (error) {
      console.error('Failed to trigger project update notification:', error)
    }
  },
}
