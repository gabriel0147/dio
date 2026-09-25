import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SrtWellTest } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { srtService } from '@/services/srtService'
import { toast } from 'sonner'
import { Loader2, Calculator, Upload, FileText, ImageIcon } from 'lucide-react'
import { calculateSrtMeasurement } from '@/lib/srtMeasurements'

const formSchema = z.object({
  bswEmulsionPct: z.coerce.number().min(0).max(100),
  bswMethod: z.string().optional(),
  bswQuality: z.string().optional(),
  ipswValue: z.coerce.number().optional(),
  ipswUnit: z.string().optional(),
  analysisNotes: z.string().optional(),
  status: z.enum(['rascunho', 'valido', 'invalido', 'vigente']).optional(),
})

interface BSWFormProps {
  test: SrtWellTest
  onSuccess: () => void
}

const toNumber = (value: unknown, fallback = 0) => {
  const numeric =
    typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const formatNumber = (
  value: unknown,
  digits: number,
  fallback = '-',
) => {
  const numeric = toNumber(value, Number.NaN)
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : fallback
}

export function BSWForm({ test, onSuccess }: BSWFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(
    test.labReportAttachment || null,
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bswEmulsionPct: test.bswEmulsionPct || 0,
      bswMethod: test.bswMethod || '',
      bswQuality: test.bswQuality || '',
      ipswValue: test.ipswValue,
      ipswUnit: test.ipswUnit || 'mg/L',
      analysisNotes: test.analysisNotes || '',
      status: test.status || 'rascunho',
    },
  })

  // Watch for real-time calculation preview
  const bswPct = form.watch('bswEmulsionPct')

  const preview = useMemo(() => {
    const bsw = toNumber(bswPct)
    const fcv = toNumber(test.fcv, 1)
    const fe = toNumber(test.fe, 1)
    const ftc = toNumber(test.ftc ?? test.fdt, 1)
    const durationHours = toNumber(test.durationH)
    const hasNewMeasurement =
      test.initialLevelVolumeM3 !== undefined &&
      test.finalLevelVolumeM3 !== undefined &&
      test.emulsionLevelVolumeM3 !== undefined

    if (!hasNewMeasurement) {
      return {
        vOilTest: toNumber(test.vOilTest),
        vWatTest: toNumber(test.vWatTest),
        vOilCorrected: toNumber(test.vOilCorrected),
        legacy: true,
      }
    }

    try {
      const measurement = calculateSrtMeasurement({
        initialVolumeM3: toNumber(test.initialLevelVolumeM3),
        finalVolumeM3: toNumber(test.finalLevelVolumeM3),
        emulsionLevelVolumeM3: toNumber(test.emulsionLevelVolumeM3),
        bswEmulsionPct: bsw,
        fcv,
        fe,
        ftc,
        durationHours,
      })
      return {
        vOilTest: measurement.uncorrectedOilVolumeM3,
        vWatTest: measurement.totalWaterVolumeM3,
        vOilCorrected: measurement.correctedOilVolumeM3,
        legacy: false,
      }
    } catch {
      return { vOilTest: 0, vWatTest: 0, vOilCorrected: 0, legacy: false }
    }
  }, [bswPct, test])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const url = await srtService.uploadLabReport(test.id, file)
      setAttachmentUrl(url)
      toast.success('Relatório anexado com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao enviar arquivo: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await srtService.updateTestLabData(
        test.id,
        {
          bswEmulsionPct: values.bswEmulsionPct,
          bswMethod: values.bswMethod,
          bswQuality: values.bswQuality,
          ipswValue: values.ipswValue,
          ipswUnit: values.ipswUnit,
          analysisNotes: values.analysisNotes,
          labReportAttachment: attachmentUrl || undefined,
          status: values.status,
        },
        user.id,
      )
      toast.success(
        preview.legacy
          ? 'Dados de laboratório salvos; volumes legados foram preservados.'
          : 'Dados de laboratório salvos e volumes recalculados!',
      )
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados de Análise Laboratorial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bswEmulsionPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BSW Emulsão (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bswMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Análise</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Centrifugação" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bswQuality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualidade do Fluido</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Emulsão estável" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ipswValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IPSW (Sólidos)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ipswUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mg/L">mg/L</SelectItem>
                            <SelectItem value="ppm">ppm</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="analysisNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Técnicas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionais sobre a amostra ou análise..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2 pt-2 border-t">
                  <FormLabel>Relatório Oficial (Anexo)</FormLabel>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() =>
                        document.getElementById('file-upload')?.click()
                      }
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Anexar Relatório
                    </Button>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                    />
                    {attachmentUrl && (
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {attachmentUrl.endsWith('.pdf') ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                        Ver Anexo
                      </a>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="pt-4 border-t">
                      <FormLabel>Status do Teste</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="valido">Válido</SelectItem>
                          <SelectItem value="vigente">Vigente</SelectItem>
                          <SelectItem value="invalido">Inválido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Salvar e Recalcular Volumes'
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Preview Sidebar */}
      <div>
        <Card className="sticky top-4 border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Calculator className="h-5 w-5" /> Prévia de Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.legacy && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Registro anterior à metodologia Mi/Me/Mf. Os volumes históricos
                são apenas exibidos e não serão recalculados pelo novo BSW.
              </div>
            )}
            <div className="flex justify-between border-b pb-2 border-blue-200">
              <span className="text-sm text-muted-foreground">
                Vol. Líquido Total
              </span>
              <span className="font-semibold">
                {formatNumber(test.vLiqTest, 3, '0.000')} m³
              </span>
            </div>
            <div className="flex justify-between border-b pb-2 border-blue-200">
              <span className="text-sm text-muted-foreground">
                BSW Aplicado
              </span>
              <span className="font-semibold text-blue-800">
                {formatNumber(bswPct, 6, '0.000000')} %
              </span>
            </div>
            <div className="flex justify-between border-b pb-2 border-blue-200 bg-white/50 p-2 rounded">
              <span className="text-sm text-muted-foreground">
                Vol. Óleo Líquido
              </span>
              <span className="font-bold text-lg">
                {preview.vOilTest.toFixed(3)} m³
              </span>
            </div>
            <div className="flex justify-between border-b pb-2 border-blue-200">
              <span className="text-sm text-muted-foreground">
                Volume de Água Total
              </span>
              <span className="font-semibold">
                {preview.vWatTest.toFixed(3)} m³
              </span>
            </div>
            <div className="flex justify-between border-b pb-2 border-blue-200 bg-blue-100/50 p-2 rounded">
              <span className="text-sm text-blue-800 font-medium">
                Vol. Óleo Corrigido
              </span>
              <span className="font-bold text-lg text-blue-900">
                {preview.vOilCorrected.toFixed(3)} m³
              </span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              <p>Fatores de correção utilizados:</p>
              <ul className="list-disc pl-4 mt-1">
                <li>FCV: {formatNumber(test.fcv, 6, '1.000000')}</li>
                <li>FE: {formatNumber(test.fe, 6, '1.000000')}</li>
                <li>
                  FTC: {formatNumber(test.ftc ?? test.fdt, 6, '1.000000')}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
