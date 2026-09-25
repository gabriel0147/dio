import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductionFieldManager } from '@/components/settings/ProductionFieldManager'
import { WellManager } from '@/components/settings/WellManager'
import { TransferCategoryManager } from '@/components/settings/TransferCategoryManager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Management() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Cadastro</h1>
        <p className="text-muted-foreground max-w-3xl">
          Cadastre e organize a estrutura operacional do projeto. Use esta área
          para manter campos de produção, poços e categorias de destino.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campos de Produção</CardTitle>
            <CardDescription>
              Base para organizar poços e tanques do projeto.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie os campos antes de cadastrar poços e vínculos operacionais.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Poços</CardTitle>
            <CardDescription>
              Estrutura de origem usada em testes, eventos e operação.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Associe cada poço ao campo correto para manter os fluxos integrados.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Categorias de Destino</CardTitle>
            <CardDescription>
              Classificações usadas nos lançamentos de transferência.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Mantenha nomes padronizados para evitar duplicidades e confusões.
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2 justify-start">
          <TabsTrigger value="fields">Campos de Produção</TabsTrigger>
          <TabsTrigger value="wells">Poços</TabsTrigger>
          <TabsTrigger value="transfer-categories">
            Categorias de Destino
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
          <ProductionFieldManager />
        </TabsContent>
        <TabsContent value="wells">
          <WellManager />
        </TabsContent>
        <TabsContent value="transfer-categories">
          <TransferCategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
