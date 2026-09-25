import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z
      .string()
      .min(6, 'A confirmação deve ter no mínimo 6 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export default function ResetPassword() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkingRecoverySession, setCheckingRecoverySession] = useState(true)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      if (authLoading) return

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) return

      if (!user && !session?.user) {
        toast.error(
          'Sessão inválida ou expirada. Solicite uma nova redefinição.',
        )
        navigate('/forgot-password')
        return
      }

      setCheckingRecoverySession(false)
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [authLoading, user, navigate])

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        console.error('Update user error:', error)
        setErrorMsg('Erro ao atualizar senha: ' + error.message)
        toast.error('Falha ao redefinir senha')
      } else {
        setSuccess(true)
        toast.success('Senha atualizada com sucesso!')

        setTimeout(async () => {
          await supabase.auth.signOut()
          navigate('/login')
        }, 2000)
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setErrorMsg('Erro inesperado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || checkingRecoverySession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">
            Verificando link de recuperação...
          </p>
        </div>
      </div>
    )
  }

  if (!user && !authLoading && !checkingRecoverySession) return null

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <Card className="w-full max-w-md animate-fade-in border-t-4 border-t-green-500 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-center">
              Senha redefinida!
            </h2>
            <p className="text-center text-muted-foreground">
              Sua senha foi alterada com sucesso. Você será redirecionado para o
              login em instantes...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <Card className="w-full max-w-md animate-fade-in border-t-4 border-t-primary shadow-lg">
        <CardHeader>
          <CardTitle>Criar nova senha</CardTitle>
          <CardDescription>
            Sua identidade foi verificada. Defina sua nova senha de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Mínimo de 6 caracteres"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
