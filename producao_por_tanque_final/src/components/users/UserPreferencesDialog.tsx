import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { userService } from '@/services/userService'
import { toast } from 'sonner'
import { UserNotificationPreferences } from '@/lib/types'
import { Loader2, Upload, Trash2, Camera } from 'lucide-react'

interface UserPreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserPreferencesDialog({
  open,
  onOpenChange,
}: UserPreferencesDialogProps) {
  const { user, avatarUrl, setAvatarUrl } = useAuth()
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    projectUpdates: true,
    teamInvites: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPreferences = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const profile = await userService.getUserProfile(user.id)
      if (profile?.emailNotificationPreferences) {
        setPreferences({
          projectUpdates:
            profile.emailNotificationPreferences.projectUpdates ?? true,
          teamInvites: profile.emailNotificationPreferences.teamInvites ?? true,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open && user) {
      loadPreferences()
    }
  }, [open, user, loadPreferences])

  const handleSavePreferences = async () => {
    if (!user) return
    setSaving(true)
    try {
      await userService.updatePreferences(user.id, preferences)
      toast.success('Preferências atualizadas.')
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.')
      return
    }

    setUploading(true)
    try {
      const url = await userService.uploadAvatar(user.id, file)
      setAvatarUrl(url)
      toast.success('Foto de perfil atualizada!')
    } catch (error: any) {
      toast.error('Erro ao enviar foto: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (!user) return
    if (!confirm('Remover sua foto de perfil?')) return

    setUploading(true)
    try {
      await userService.removeAvatar(user.id)
      setAvatarUrl(null)
      toast.success('Foto removida.')
    } catch (error: any) {
      toast.error('Erro ao remover foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Gerencie sua foto e preferências de notificação.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Perfil e Foto</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="py-4 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-2 border-border shadow-sm">
                  <AvatarImage
                    src={avatarUrl || ''}
                    alt={user?.email || 'User'}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-4xl bg-muted">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-transparent"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-8 w-8" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Alterar Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                    disabled={uploading}
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  ID: {user?.id.substring(0, 8)}...
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="py-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Carregando...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <Label
                    htmlFor="project-updates"
                    className="flex flex-col space-y-1"
                  >
                    <span>Atualizações do Projeto</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Receba emails sobre atualizações importantes nos projetos.
                    </span>
                  </Label>
                  <Switch
                    id="project-updates"
                    checked={preferences.projectUpdates}
                    onCheckedChange={(val) =>
                      setPreferences((p) => ({ ...p, projectUpdates: val }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label
                    htmlFor="team-invites"
                    className="flex flex-col space-y-1"
                  >
                    <span>Convites de Time</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Receba emails quando for adicionado a um novo time.
                    </span>
                  </Label>
                  <Switch
                    id="team-invites"
                    checked={preferences.teamInvites}
                    onCheckedChange={(val) =>
                      setPreferences((p) => ({ ...p, teamInvites: val }))
                    }
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || uploading}
          >
            Fechar
          </Button>
          <Button
            onClick={handleSavePreferences}
            disabled={saving || loading || uploading}
          >
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
