import { useState, useRef } from 'react'
import { useProject } from '@/context/ProjectContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export function GeneralSettings() {
  const {
    currentProject,
    updateProjectLogo,
    removeProjectLogo,
    logoUrl: companyLogoUrl, // Global/Company Logo
    updateLogo: updateCompanyLogo, // Global
    removeLogo: removeCompanyLogo, // Global
  } = useProject()
  const { role } = useAuth()

  // Allow both Admin and Director to manage global settings
  const canManageGlobal = role === 'admin' || role === 'director'

  // --- Project Logo Logic ---
  const [isUploadingProjectLogo, setIsUploadingProjectLogo] = useState(false)
  const projectLogoInputRef = useRef<HTMLInputElement>(null)

  const handleProjectLogoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).')
      return
    }

    setIsUploadingProjectLogo(true)
    try {
      await updateProjectLogo(file)
    } finally {
      setIsUploadingProjectLogo(false)
      if (projectLogoInputRef.current) {
        projectLogoInputRef.current.value = ''
      }
    }
  }

  const handleRemoveProjectLogo = async () => {
    if (confirm('Tem certeza que deseja remover o logo deste projeto?')) {
      await removeProjectLogo()
    }
  }

  // --- Company Logo Logic ---
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false)
  const companyLogoInputRef = useRef<HTMLInputElement>(null)

  const handleCompanyLogoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).')
      return
    }

    setIsUploadingCompanyLogo(true)
    try {
      await updateCompanyLogo(file)
    } finally {
      setIsUploadingCompanyLogo(false)
      if (companyLogoInputRef.current) {
        companyLogoInputRef.current.value = ''
      }
    }
  }

  const handleRemoveCompanyLogo = async () => {
    if (confirm('Tem certeza que deseja remover o logo padrão da empresa?')) {
      await removeCompanyLogo()
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Logo Section - Only if a project is selected */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Logo do Projeto: {currentProject.name}</CardTitle>
            <CardDescription>
              Personalize a identidade visual deste projeto específico. Este
              logo substituirá o nome do projeto no cabeçalho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Logo do Projeto</Label>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  {currentProject.logoUrl ? (
                    <div className="border rounded-lg p-4 bg-white/50 flex flex-col items-center gap-2">
                      <div className="relative h-24 w-48 flex items-center justify-center bg-white rounded-md shadow-sm border overflow-hidden">
                        <img
                          src={currentProject.logoUrl}
                          alt="Logo do Projeto"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Preview
                      </span>
                    </div>
                  ) : (
                    <div className="h-24 w-48 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                      <div className="text-center p-2">
                        <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground block">
                          Sem logo
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Faça upload de uma imagem para este projeto. O logo será
                    exibido no topo da barra lateral quando este projeto estiver
                    selecionado.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Button
                        variant="outline"
                        disabled={isUploadingProjectLogo}
                        onClick={() => projectLogoInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingProjectLogo
                          ? 'Enviando...'
                          : 'Carregar Logo do Projeto'}
                      </Button>
                      <Input
                        ref={projectLogoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/svg+xml"
                        className="hidden"
                        onChange={handleProjectLogoChange}
                      />
                    </div>

                    {currentProject.logoUrl && (
                      <Button
                        variant="ghost"
                        onClick={handleRemoveProjectLogo}
                        disabled={isUploadingProjectLogo}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Company Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual Padrão</CardTitle>
          <CardDescription>
            Defina o logo padrão da empresa, exibido quando nenhum logo de
            projeto estiver configurado ou quando nenhum projeto estiver
            selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Logo da Empresa (Global)</Label>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                {companyLogoUrl ? (
                  <div className="border rounded-lg p-4 bg-white/50 flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24 flex items-center justify-center bg-white rounded-md shadow-sm border overflow-hidden">
                      <img
                        src={companyLogoUrl}
                        alt="Logo da Empresa"
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Preview
                    </span>
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                    <div className="text-center p-2">
                      <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground block">
                        Sem logo
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Faça upload de uma imagem (preferencialmente JPG ou PNG
                  transparente) para substituir o ícone padrão "RTM NBS" na
                  barra lateral global.
                </p>

                {canManageGlobal ? (
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Button
                        variant="outline"
                        disabled={isUploadingCompanyLogo}
                        onClick={() => companyLogoInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingCompanyLogo
                          ? 'Enviando...'
                          : 'Carregar Logo Global'}
                      </Button>
                      <Input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={handleCompanyLogoChange}
                      />
                    </div>

                    {companyLogoUrl && (
                      <Button
                        variant="ghost"
                        onClick={handleRemoveCompanyLogo}
                        disabled={isUploadingCompanyLogo}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 inline-block">
                    Apenas administradores e diretores podem alterar o logo
                    global da empresa.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
