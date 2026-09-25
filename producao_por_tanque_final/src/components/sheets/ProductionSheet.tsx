import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  ListPlus,
  ArrowRightLeft,
  Database,
  Table as TableIcon,
  ChevronLeft,
  Droplets,
  Lock,
} from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ProductionCell } from './ProductionCell'
import { ProductionRow, OperationType, TankOperation } from '@/lib/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { OperationForm } from '@/components/operations/OperationForm'
import { OperationsList } from '@/components/operations/OperationsList'

interface ProductionSheetProps {
  sheetId: string
}

const COLUMNS: {
  key: keyof ProductionRow
  label: string
  width: string
  type?: 'text' | 'number' | 'date' | 'datetime'
}[] = [
  {
    key: 'A_Data',
    label: 'Data Início',
    width: 'w-[170px]',
    type: 'datetime',
  },
  {
    key: 'B_Altura_Liq_Inicial_mm',
    label: 'Altura Liq. Inicial (mm)',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'C_Volume_Inicial_m3',
    label: 'Vol. Inicial (m³)',
    width: 'w-[140px]',
  },
  {
    key: 'D_Data_fim_periodo',
    label: 'Data Fim',
    width: 'w-[170px]',
    type: 'datetime',
  },
  {
    key: 'E_Altura_Liq_Final_mm',
    label: 'Altura Liq. Final (mm)',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'F_Volume_Final_m3',
    label: 'Vol. Final (m³)',
    width: 'w-[140px]',
  },
  {
    key: 'G_Diferenca_volumes',
    label: 'Dif. Vol.',
    width: 'w-[120px]',
  },
  {
    key: 'H_Volume_Corrigido_24h',
    label: 'Vol. Corr. 24h',
    width: 'w-[140px]',
  },
  {
    key: 'I_Estoque_QT_m3',
    label: 'Estoque QT (m³)',
    width: 'w-[140px]',
  },
  {
    key: 'J_Volume_Drenado_Agua_m3',
    label: 'Vol. Drenado Água',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'K_Transferencia_Emulsao',
    label: 'Transf. Emulsão',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'L_Prod_Total_QT_m3_d',
    label: 'Prod. Total QT',
    width: 'w-[140px]',
  },
  {
    key: 'M_Prod_Agua_Livre_QWF_m3_d',
    label: 'Prod. Água Livre',
    width: 'w-[140px]',
  },
  {
    key: 'O_Prod_Emulsao_QEM_m3_d',
    label: 'Prod. Emulsão',
    width: 'w-[140px]',
  },
  {
    key: 'P_Prod_Oleo_Sem_Correcao_m3_d',
    label: 'Prod. Óleo (s/ corr)',
    width: 'w-[160px]',
  },
  {
    key: 'Q_Prod_Oleo_Corrigido_m3_d',
    label: 'Prod. Óleo (c/ corr)',
    width: 'w-[160px]',
  },
  {
    key: 'R_Agua_Emulsao_m3_d',
    label: 'Água Emulsão',
    width: 'w-[140px]',
  },
  {
    key: 'S_Agua_Total_Produzida_m3_d',
    label: 'Água Total Prod.',
    width: 'w-[140px]',
  },
  {
    key: 'T_BSW_Total_Calculado',
    label: 'BSW Total (Calc)',
    width: 'w-[140px]',
  },
  {
    key: 'U_BSW_Total_Perc',
    label: 'BSW Total (%)',
    width: 'w-[120px]',
    type: 'number',
  },
  {
    key: 'V_BSW_Emulsao_Perc',
    label: 'BSW Emulsão (%)',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'W_Temp_Ambiente',
    label: 'Temp. Amb.',
    width: 'w-[120px]',
    type: 'number',
  },
  {
    key: 'X_Temp_Fluido',
    label: 'Temp. Fluido',
    width: 'w-[120px]',
    type: 'number',
  },
  {
    key: 'Y_Dilatacao_Termica',
    label: 'Dilat. Térmica',
    width: 'w-[140px]',
  },
  {
    key: 'Z_Densidade_Lab_20C',
    label: 'Massa Esp. Lab 20°C',
    width: 'w-[140px]',
    type: 'number',
  },
  {
    key: 'AA_T_Observada_C',
    label: 'T. Observada',
    width: 'w-[140px]',
  },
  {
    key: 'AB_FCV',
    label: 'FCV',
    width: 'w-[120px]',
    type: 'number',
  },
  {
    key: 'AC_Fator_Encolhimento_FE',
    label: 'Fator Encolhimento',
    width: 'w-[160px]',
    type: 'number',
  },
  {
    key: 'AD_Vol_Bruto_Transf_Emulsao',
    label: 'Vol Bruto Transf',
    width: 'w-[160px]',
  },
  {
    key: 'AE_Vol_Agua_Transf',
    label: 'Vol Água Transf',
    width: 'w-[160px]',
  },
  {
    key: 'AF_Vol_Oleo_Transf_Sem_Corr',
    label: 'Vol Óleo s/ Corr',
    width: 'w-[160px]',
  },
  {
    key: 'AG_Vol_Oleo_Transf_Com_Corr',
    label: 'Vol Óleo c/ Corr',
    width: 'w-[160px]',
  },
  {
    key: 'AH_Referencia',
    label: 'Referência',
    width: 'w-[140px]',
  },
]

type ViewMode = 'initial' | 'form' | 'table'

export function ProductionSheet({ sheetId }: ProductionSheetProps) {
  const {
    productionData,
    isSheetLoading,
    loadSheetData,
    addOperation,
    updateOperation,
    tankOperations,
    deleteOperation,
    currentProjectRole,
    updateProductionRow,
    syncProductionConsolidation,
  } = useProject()
  const { role } = useAuth()

  const [operationsSheetOpen, setOperationsSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('initial')
  const [selectedType, setSelectedType] =
    useState<OperationType>('stock_variation')
  const [editingOperation, setEditingOperation] =
    useState<TankOperation | null>(null)
  const [isSyncingConsolidation, setIsSyncingConsolidation] = useState(false)

  useEffect(() => {
    loadSheetData(sheetId, 'production')
  }, [sheetId, loadSheetData])

  const tankId = sheetId.replace('prod-', '')
  const data = productionData[sheetId] || []
  const isLoading = isSheetLoading[sheetId]
  const operations = tankOperations[tankId] || []

  // Permissions
  const isViewer = currentProjectRole === 'viewer'
  const isSupervisor = role === 'supervisor'

  const handleSelectType = (type: OperationType) => {
    setSelectedType(type)
    setEditingOperation(null)
    setViewMode('form')
    setOperationsSheetOpen(false)
  }

  const handleEditOperation = (op: TankOperation) => {
    setEditingOperation(op)
    setSelectedType(op.type)
    setViewMode('form')
    setOperationsSheetOpen(false)
  }

  const handleCancelForm = () => {
    setViewMode('initial')
    setEditingOperation(null)
  }

  const handleShowConsolidation = async () => {
    setIsSyncingConsolidation(true)
    const toastId = toast.loading('Sincronizando consolidação...')

    try {
      await syncProductionConsolidation(tankId)
      toast.success('Consolidação sincronizada.', { id: toastId })
      setViewMode('table')
    } catch (error: any) {
      console.error('Error syncing production consolidation:', error)
      toast.error(
        'Erro ao sincronizar consolidação: ' +
          (error?.message || 'erro desconhecido'),
        { id: toastId },
      )
      setViewMode('table')
    } finally {
      setIsSyncingConsolidation(false)
    }
  }

  return (
    <div className="space-y-4 max-w-[100vw] h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Registro de Operações
          </h2>
          <p className="text-muted-foreground">
            Lançamento das operações diárias de Estoque, Drenagem e
            Transferência.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewMode !== 'table' ? (
            <Button
              variant="outline"
              onClick={handleShowConsolidation}
              disabled={isSyncingConsolidation}
            >
              <TableIcon className="mr-2 h-4 w-4" /> Ver Consolidação
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setViewMode('initial')}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Ver Operações
            </Button>
          )}

          <Button
            onClick={() => setOperationsSheetOpen(true)}
            disabled={
              isViewer && viewMode !== 'initial' && viewMode !== 'table'
            } // Allow opening to see list, but disable actions inside
          >
            <ListPlus className="mr-2 h-4 w-4" />
            {isViewer ? 'Visualizar Operações' : 'Gerenciar Operações'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 border rounded-md bg-white shadow-sm overflow-hidden flex flex-col relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <p>Carregando...</p>
          </div>
        )}

        {viewMode === 'initial' && (
          <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
            <h3 className="mb-4 text-base font-semibold">
              Operações registradas
            </h3>
            <OperationsList
              operations={operations}
              onDelete={
                isViewer || isSupervisor
                  ? undefined
                  : (id) => deleteOperation(id, tankId)
              }
              onEdit={isViewer ? undefined : handleEditOperation}
            />
          </div>
        )}

        {viewMode === 'table' && (
          <ScrollArea className="flex-1 w-full animate-fade-in">
            <div className="min-w-max">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[50px] bg-muted/50">#</TableHead>
                    {COLUMNS.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`${col.width} text-xs font-semibold px-2 bg-muted/50`}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={COLUMNS.length + 1}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhum dado de produção encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, index) => (
                      <TableRow key={row.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground text-center">
                          {index + 1}
                        </TableCell>
                        {COLUMNS.map((col) => {
                          return (
                            <TableCell key={col.key} className="p-1">
                              <ProductionCell
                                value={row[col.key] ?? ''}
                                field={col.key}
                                readOnly
                                type={col.type}
                                onChange={(val) =>
                                  updateProductionRow(
                                    sheetId,
                                    index,
                                    col.key,
                                    val,
                                  )
                                }
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {viewMode === 'form' && !isViewer && (
          <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h3 className="text-xl font-semibold capitalize">
                    {editingOperation
                      ? 'Editar'
                      : selectedType === 'stock_variation' ||
                          selectedType === 'production'
                        ? 'Novo'
                        : 'Nova'}{' '}
                    {selectedType === 'stock_variation'
                      ? 'Estoque'
                      : selectedType === 'production'
                        ? 'Produção (Legado)'
                        : selectedType === 'drainage'
                          ? 'Drenagem'
                          : 'Transferência'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Preencha os dados abaixo para registrar a operação.
                  </p>
                </div>
              </div>

              <OperationForm
                tankId={tankId}
                forcedType={selectedType}
                initialData={editingOperation}
                onSubmit={async (data) => {
                  if (editingOperation) {
                    await updateOperation(editingOperation.id, tankId, data)
                  } else {
                    await addOperation(data)
                  }
                  setViewMode('initial')
                  setEditingOperation(null)
                }}
                onCancel={handleCancelForm}
              />
            </div>
          </div>
        )}
      </div>

      {/* Side Panel (Sheet) */}
      <Sheet open={operationsSheetOpen} onOpenChange={setOperationsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {isViewer ? 'Histórico de Operações' : 'Gerenciar Operações'}
            </SheetTitle>
            <SheetDescription>
              {isViewer
                ? 'Visualize o histórico de operações abaixo.'
                : 'Selecione o tipo de operação para lançar ou visualize o histórico abaixo.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {!isViewer && (
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  className="h-20 justify-start px-6 gap-4 hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => handleSelectType('stock_variation')}
                >
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-green-700" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">Estoque</span>
                    <span className="text-xs text-muted-foreground">
                      Lançamento de produção diária
                    </span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 justify-start px-6 gap-4 hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => handleSelectType('drainage')}
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">Drenagem</span>
                    <span className="text-xs text-muted-foreground">
                      Registro de drenagem de água
                    </span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 justify-start px-6 gap-4 hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => handleSelectType('transfer')}
                >
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-orange-700" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">
                      Transferência
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Transferência de fluidos
                    </span>
                  </div>
                </Button>
              </div>
            )}

            {isViewer && (
              <div className="p-4 bg-muted/20 rounded border border-muted flex items-center gap-2 text-muted-foreground text-sm">
                <Lock className="h-4 w-4" />
                <span>Modo de visualização. Edição desabilitada.</span>
              </div>
            )}

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium mb-4">Histórico Recente</h4>
              <OperationsList
                operations={operations}
                onDelete={
                  isViewer || isSupervisor
                    ? undefined
                    : (id) => deleteOperation(id, tankId)
                }
                onEdit={isViewer ? undefined : handleEditOperation}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
