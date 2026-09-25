import { Project, CalibrationRow, ProductionRow } from './types'

// Initial calibration data
export const INITIAL_CALIBRATION_DATA: CalibrationRow[] = [
  { id: 'cal-1', altura_mm: 0, volume_m3: 0, fcv: 1.0 },
  { id: 'cal-2', altura_mm: 100, volume_m3: 0.5, fcv: 0.9998 },
  { id: 'cal-3', altura_mm: 200, volume_m3: 1.2, fcv: 0.9996 },
  { id: 'cal-4', altura_mm: 300, volume_m3: 2.1, fcv: 0.9994 },
  { id: 'cal-5', altura_mm: 400, volume_m3: 3.2, fcv: 0.9992 },
]

export const INITIAL_PRODUCTION_ROW: ProductionRow = {
  id: 'row-1',
  A_Data: '',
  B_Altura_Liq_Inicial_mm: '',
  C_Volume_Inicial_m3: '',
  D_Data_fim_periodo: '',
  E_Altura_Liq_Final_mm: '',
  F_Volume_Final_m3: '',
  G_Diferenca_volumes: '',
  H_Volume_Corrigido_24h: '',
  I_Estoque_QT_m3: '',
  J_Volume_Drenado_Agua_m3: '',
  K_Transferencia_Emulsao: '',
  L_Prod_Total_QT_m3_d: '',
  M_Prod_Agua_Livre_QWF_m3_d: '',
  N_Estoque_Agua_Livre_QWF_m3: '',
  O_Prod_Emulsao_QEM_m3_d: '',
  P_Prod_Oleo_Sem_Correcao_m3_d: '',
  Q_Prod_Oleo_Corrigido_m3_d: '',
  R_Agua_Emulsao_m3_d: '',
  S_Agua_Total_Produzida_m3_d: '',
  T_BSW_Total_Calculado: '',
  U_BSW_Total_Perc: '',
  V_BSW_Emulsao_Perc: '',
  W_Temp_Ambiente: '',
  X_Temp_Fluido: '',
  Y_Dilatacao_Termica: '',
  Z_Densidade_Lab_20C: '',
  AA_T_Observada_C: '',
  AB_FCV: '',
  AC_Fator_Encolhimento_FE: 1.0,
  AD_Vol_Bruto_Transf_Emulsao: '',
  AE_Vol_Agua_Transf: '',
  AF_Vol_Oleo_Transf_Sem_Corr: '',
  AG_Vol_Oleo_Transf_Com_Corr: '',
  AH_Referencia: '',
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'SRP - Sistema de Registro da Produção',
    description: 'Registro da Produção',
    tanks: [
      {
        id: 'tank-1',
        tag: 'TQ-01',
        productionField: 'Mosquito',
        productionFieldId: 'field-1',
        geolocation: 'Campo Alpha',
        sheets: [
          {
            id: 'sheet-prod-1',
            name: 'Registro de Operações',
            type: 'production',
          },
          {
            id: 'sheet-cal-1',
            name: 'Tabela Arqueação',
            type: 'calibration',
          },
          { id: 'sheet-seal-1', name: 'Registro de Lacres', type: 'seal' },
        ],
      },
    ],
  },
]
