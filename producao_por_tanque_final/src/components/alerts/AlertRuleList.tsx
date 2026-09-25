import { AlertRule } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AlertRuleListProps {
  rules: AlertRule[]
  loading: boolean
  onEdit: (rule: AlertRule) => void
  onDelete: (id: string) => void
}

const METRIC_LABELS: Record<string, string> = {
  corrected_oil_volume_m3: 'Óleo Corrigido (m³)',
  total_bsw_percent: 'BSW Total (%)',
  drained_volume_m3: 'Volume Drenado (m³)',
  uncorrected_oil_volume_m3: 'Óleo Sem Correção (m³)',
  emulsion_bsw_percent: 'BSW Emulsão (%)',
  fluid_temp_c: 'Temperatura Fluido (°C)',
  stock_variation: 'Variação de Estoque (m³)',
  transferred_volume_m3: 'Volume Transferido (m³)',
  calculated_well_production_m3: 'Produção Poço (m³)',
  fcv: 'FCV',
  fe: 'FE',
}

const CONDITION_LABELS: Record<string, string> = {
  gt: 'Maior que (>)',
  lt: 'Menor que (<)',
  eq: 'Igual a (=)',
  neq: 'Diferente de (!=)',
}

export function AlertRuleList({
  rules,
  loading,
  onEdit,
  onDelete,
}: AlertRuleListProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando regras...
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma regra configurada.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Métrica Monitorada</TableHead>
            <TableHead>Condição</TableHead>
            <TableHead>Limiar</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.name}</TableCell>
              <TableCell>
                {METRIC_LABELS[rule.metricField] || rule.metricField}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {CONDITION_LABELS[rule.condition] || rule.condition}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{rule.thresholdValue}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rule)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
