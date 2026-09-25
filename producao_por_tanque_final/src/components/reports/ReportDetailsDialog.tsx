import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DailyProductionReport, Tank } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface ReportDetailsDialogProps {
  report: DailyProductionReport | null
  tank?: Tank
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailsDialog({
  report,
  tank,
  open,
  onOpenChange,
}: ReportDetailsDialogProps) {
  if (!report) return null

  const formatVal = (
    val: number | undefined | null,
    decimals = 4,
    suffix = '',
  ) => {
    if (val === undefined || val === null) return '-'
    return `${val.toFixed(decimals)}${suffix}`
  }

  const DetailRow = ({
    label,
    value,
    highlight = false,
  }: {
    label: string
    value: React.ReactNode
    highlight?: boolean
  }) => (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium ${highlight ? 'text-primary' : ''}`}
      >
        {value}
      </span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Detalhes do Relatório de Produção</DialogTitle>
            <Badge
              variant={report.status === 'closed' ? 'secondary' : 'outline'}
            >
              {report.status === 'closed' ? 'Fechado' : 'Aberto'}
            </Badge>
          </div>
          <DialogDescription>
            {tank?.tag} - {format(parseISO(report.reportDate), 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-3 rounded-md">
            <div>
              <span className="text-muted-foreground block">Início</span>
              <span className="font-mono">
                {format(parseISO(report.startDatetime), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Fim</span>
              <span className="font-mono">
                {format(parseISO(report.endDatetime), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Métricas Principais</h4>
            <div className="bg-card border rounded-md px-4">
              <DetailRow
                label="Produção do Poço (Calculada)"
                value={formatVal(report.calculatedWellProductionM3, 3, ' m³')}
                highlight
              />
              <DetailRow
                label="Óleo Corrigido"
                value={formatVal(report.correctedOilVolumeM3, 3, ' m³')}
                highlight
              />
              <DetailRow
                label="Variação de Estoque"
                value={formatVal(report.stockVariation, 3, ' m³')}
              />
              <DetailRow
                label="Volume Drenado"
                value={formatVal(report.drainedVolumeM3, 3, ' m³')}
              />
              <DetailRow
                label="Volume Transferido"
                value={formatVal(report.transferredVolumeM3, 3, ' m³')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Composição</h4>
              <div className="bg-card border rounded-md px-4">
                <DetailRow
                  label="Óleo sem Correção"
                  value={formatVal(report.uncorrectedOilVolumeM3, 3, ' m³')}
                />
                <DetailRow
                  label="Água na Emulsão"
                  value={formatVal(report.emulsionWaterVolumeM3, 3, ' m³')}
                />
                <DetailRow
                  label="BSW Total"
                  value={formatVal(report.totalBswPercent, 2, '%')}
                />
                <DetailRow
                  label="BSW Emulsão"
                  value={formatVal(report.emulsionBswPercent, 2, '%')}
                />
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Fatores e Condições</h4>
              <div className="bg-card border rounded-md px-4">
                <DetailRow
                  label="Temperatura Fluido"
                  value={formatVal(report.fluidTempC, 1, ' °C')}
                />
                <DetailRow
                  label="Densidade @ 20°C"
                  value={formatVal(report.densityAt20cGcm3, 4, ' g/cm³')}
                />
                <DetailRow label="FCV" value={formatVal(report.fcv, 6)} />
                <DetailRow
                  label="FE (Fator Encolhimento)"
                  value={formatVal(report.fe, 6)}
                />
                <DetailRow
                  label="Fator Y (Térmico)"
                  value={formatVal(report.tempCorrectionFactorY, 6)}
                />
              </div>
            </div>
          </div>

          {(report.closedAt || report.closedBy) && (
            <div className="text-xs text-muted-foreground text-center border-t pt-4">
              Fechado em{' '}
              {report.closedAt
                ? format(parseISO(report.closedAt), 'dd/MM/yyyy HH:mm:ss')
                : '-'}{' '}
              por{' '}
              <span className="font-medium text-foreground">
                {report.closedByUser?.fullName ||
                  report.closedByUser?.email ||
                  'Usuário desconhecido'}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
