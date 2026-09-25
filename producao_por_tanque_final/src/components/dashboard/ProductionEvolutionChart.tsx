import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { useIsolatedChartSeries } from '@/hooks/use-isolated-chart-series'

export interface ProductionChartDataPoint {
  name: string
  sortDate: number
  wellProduction: number
  stockVariation: number
  transferred: number
  drained: number
  uncorrectedOil: number
  waterProduction: number
  transferWater: number | null
  transferOilUncorrected: number | null
  transferOilCorrected: number | null
}

type VolumeMetricKey = Exclude<
  keyof ProductionChartDataPoint,
  'name' | 'sortDate'
>

interface MetricDefinition {
  key: VolumeMetricKey
  label: string
}

interface ChartSectionDefinition {
  title: string
  description: string
  metrics: MetricDefinition[]
  config: ChartConfig
  gasMetric?: string
  fullWidth?: boolean
}

const METRIC_COLORS: Record<VolumeMetricKey, string> = {
  stockVariation: 'hsl(183 79% 21%)',
  wellProduction: 'hsl(185 77% 14%)',
  drained: 'hsl(204 82% 44%)',
  transferred: 'hsl(43 74% 45%)',
  uncorrectedOil: 'hsl(27 87% 50%)',
  waterProduction: 'hsl(142 71% 35%)',
  transferWater: 'hsl(142 71% 35%)',
  transferOilUncorrected: 'hsl(27 87% 50%)',
  transferOilCorrected: 'hsl(280 52% 45%)',
}

const CHART_SECTIONS: ChartSectionDefinition[] = [
  {
    title: 'Lançamentos das Operações',
    description:
      'Balanço volumétrico: produção do poço = variação do estoque + transferência + drenagem.',
    fullWidth: true,
    metrics: [
      { key: 'stockVariation', label: 'Variação do estoque' },
      { key: 'wellProduction', label: 'Produção do poço' },
      { key: 'drained', label: 'Drenagem' },
      { key: 'transferred', label: 'Transferência' },
    ],
    config: {
      wellProduction: {
        label: 'Produção do poço',
        color: METRIC_COLORS.wellProduction,
      },
      stockVariation: {
        label: 'Variação do estoque',
        color: METRIC_COLORS.stockVariation,
      },
      transferred: {
        label: 'Transferência',
        color: METRIC_COLORS.transferred,
      },
      drained: {
        label: 'Drenagem',
        color: METRIC_COLORS.drained,
      },
    },
  },
  {
    title: 'Produção do Poço',
    description: 'Separação da produção total registrada em óleo e água.',
    fullWidth: true,
    metrics: [
      { key: 'wellProduction', label: 'Produção do poço' },
      { key: 'uncorrectedOil', label: 'Volume de óleo sem correção' },
      { key: 'waterProduction', label: 'Volume de água' },
    ],
    config: {
      wellProduction: {
        label: 'Produção do poço',
        color: METRIC_COLORS.wellProduction,
      },
      uncorrectedOil: {
        label: 'Volume de óleo sem correção',
        color: METRIC_COLORS.uncorrectedOil,
      },
      waterProduction: {
        label: 'Volume de água',
        color: METRIC_COLORS.waterProduction,
      },
    },
    gasMetric: 'Volume de gás produzido',
  },
  {
    title: 'Transferência',
    description:
      'Água contida no volume transferido = volume bruto transferido × BSWe / 100.',
    fullWidth: true,
    metrics: [
      { key: 'transferred', label: 'Volume transferido' },
      {
        key: 'transferWater',
        label: 'Água contida no volume transferido',
      },
      {
        key: 'transferOilUncorrected',
        label: 'Volume de óleo sem correção',
      },
      { key: 'transferOilCorrected', label: 'Volume de óleo corrigido' },
    ],
    config: {
      transferred: {
        label: 'Volume transferido',
        color: METRIC_COLORS.transferred,
      },
      transferWater: {
        label: 'Água contida no volume transferido',
        color: METRIC_COLORS.transferWater,
      },
      transferOilUncorrected: {
        label: 'Volume de óleo sem correção',
        color: METRIC_COLORS.transferOilUncorrected,
      },
      transferOilCorrected: {
        label: 'Volume de óleo corrigido',
        color: METRIC_COLORS.transferOilCorrected,
      },
    },
    gasMetric: 'Volume de gás produzido',
  },
  {
    title: 'Drenagem',
    description: 'Água retirada nas operações de drenagem.',
    fullWidth: true,
    metrics: [{ key: 'drained', label: 'Volume de água drenada' }],
    config: {
      drained: {
        label: 'Volume de água drenada',
        color: METRIC_COLORS.drained,
      },
    },
  },
]

interface ProductionEvolutionChartProps {
  data: ProductionChartDataPoint[]
  granularity: 'day' | 'month' | 'year'
}

function ProductionMetricChart({
  section,
  data,
}: {
  section: ChartSectionDefinition
  data: ProductionChartDataPoint[]
}) {
  const { isolatedKey, toggleSeries, showAll, isVisible } =
    useIsolatedChartSeries<VolumeMetricKey>()
  const hasIncompleteTransferHistory =
    section.title === 'Transferência' &&
    data.some(
      (point) => point.transferred !== 0 && point.transferWater === null,
    )

  return (
    <Card className={section.fullWidth ? 'lg:col-span-2' : undefined}>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
        {(section.gasMetric || hasIncompleteTransferHistory) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {section.gasMetric && (
              <Badge variant="outline">
                {section.gasMetric}: cálculo pendente
              </Badge>
            )}
            {hasIncompleteTransferHistory && (
              <Badge variant="secondary">
                Parte do histórico não possui detalhamento da transferência
              </Badge>
            )}
          </div>
        )}
        {isolatedKey ? (
          <button
            type="button"
            className="w-fit text-xs text-muted-foreground underline underline-offset-4"
            onClick={showAll}
          >
            Exibir todas as variáveis
          </button>
        ) : null}
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={section.config}
          className="h-[320px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 20, left: 8, bottom: 20 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => Number(value).toLocaleString('pt-BR')}
              label={{
                value: 'Volume (m³)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' },
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator={section.metrics.length === 1 ? 'dot' : 'line'}
                  formatter={(value, name) => (
                    <>
                      <div
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: `var(--color-${String(name)})`,
                        }}
                      />
                      <span className="text-muted-foreground">
                        {section.config[String(name)]?.label}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                        {Number(value).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}{' '}
                        m³
                      </span>
                    </>
                  )}
                />
              }
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  activeKey={isolatedKey}
                  onItemClick={(key) => toggleSeries(key as VolumeMetricKey)}
                />
              }
            />
            {section.metrics.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                stroke={`var(--color-${metric.key})`}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name={metric.key}
                hide={!isVisible(metric.key)}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ProductionEvolutionChart({
  data,
  granularity,
}: ProductionEvolutionChartProps) {
  const granularityLabel = {
    day: 'dia',
    month: 'mês',
    year: 'ano',
  }[granularity]

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="production-charts"
    >
      <div>
        <h2 id="production-charts" className="text-2xl font-semibold">
          Gráficos do Registro de Produção
        </h2>
        <p className="text-sm text-muted-foreground">
          Valores consolidados por {granularityLabel}. Passe o cursor sobre os
          pontos para conferir os volumes.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CHART_SECTIONS.map((section) => (
          <ProductionMetricChart
            key={section.title}
            section={section}
            data={data}
          />
        ))}
      </div>
    </section>
  )
}
