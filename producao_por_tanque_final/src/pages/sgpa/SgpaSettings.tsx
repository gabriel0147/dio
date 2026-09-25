import { CatalogManager } from '@/components/sgpa/CatalogManager'

export default function SgpaSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Configurações SGPA</h1>
      <p className="text-muted-foreground">
        Gerenciamento de catálogos de causas e ativos.
      </p>
      <CatalogManager />
    </div>
  )
}
