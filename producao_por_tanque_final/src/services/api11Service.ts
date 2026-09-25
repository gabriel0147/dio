import { supabase } from '@/lib/supabase/client'

export interface Api11CalculationRequest {
  temp_c: number
  density_obs_gcm3: number
  pressure_kpag?: number
}

export interface Api11CalculationResponse {
  success: boolean
  data: {
    fcv: number
    density_20_gcm3: number
    rho_60_kgm3: number
    ctl: number
    cpl: number
    alpha_60: number
    algorithm_version: string
    applied_norm: string
  }
  error?: string
}

export const api11Service = {
  async calculate(
    params: Api11CalculationRequest,
  ): Promise<Api11CalculationResponse['data']> {
    try {
      const { data, error } = await supabase.functions.invoke('calc-api11', {
        body: params,
      })

      if (error) {
        console.error('[Api11Service] Edge Function Error:', error)

        let errorMessage =
          error.message || 'Erro ao comunicar com o servidor de cálculo.'

        // Improve user-friendly message for common edge function errors
        if (
          errorMessage.includes('non-2xx') ||
          errorMessage.includes('Failed to fetch')
        ) {
          errorMessage =
            'O serviço de cálculo está indisponível ou retornou um erro. Verifique sua conexão e tente novamente.'
        }

        throw new Error(errorMessage)
      }

      if (!data) {
        throw new Error('Nenhum dado foi retornado pelo serviço de cálculo.')
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            'Erro desconhecido no processamento do cálculo (API 11.1).',
        )
      }

      return data.data
    } catch (err: any) {
      console.error('[Api11Service] Exception:', err)
      throw err
    }
  },
}
