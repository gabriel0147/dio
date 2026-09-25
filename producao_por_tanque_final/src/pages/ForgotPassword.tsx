import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { toast } from 'sonner'
import { ArrowLeft, Mail, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, insira um email válido'),
})

const FALLBACK_PRODUCTION_URL = 'https://producao-por-tanque-alpha.vercel.app'

const getResetRedirectUrl = () => {
  const configuredUrl =
    import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_APP_URL

  if (configuredUrl) {
    const cleanUrl = String(configuredUrl).replace(/\/$/, '')
    return cleanUrl.endsWith('/reset-password')
      ? cleanUrl
      : `${cleanUrl}/reset-password`
  }

  const { origin, hostname } = window.location
  const isLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'

  const baseUrl = isLocalhost ? FALLBACK_PRODUCTION_URL : origin
  return `${baseUrl.replace(/\/$/, '')}/reset-password`
}

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [emailSentTo, setEmailSentTo] = useState('')
  const [generalError, setGeneralError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setLoading(true)
    setGeneralError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: getResetRedirectUrl(),
        },
      )

      if (error) {
        console.error('Reset password error:', error)

        if (error.status === 429) {
          setGeneralError(
            'Muitas solicitações recentes. Por favor, aguarde alguns instantes antes de tentar novamente.',
          )
        } else if (error.message.includes('Unable to process request')) {
          setGeneralError(
            'Não foi possível processar sua solicitação. Verifique se o email está correto ou tente novamente mais tarde.',
          )
        } else {
          setGeneralError(
            error.message ||
              'Ocorreu um erro ao tentar enviar o email de recuperação.',
          )
        }

        toast.error('Falha no envio do email')
      } else {
        setEmailSentTo(values.email)
        setSubmitted(true)
        toast.success('Email de recuperação enviado!')
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setGeneralError('Ocorreu um erro inesperado. Por favor, tente novamente.')
      toast.error('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <Card className="w-full max-w-md animate-fade-in border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle>Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link de recuperação para{' '}
              <strong className="text-foreground">{emailSentTo}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2 text-sm text-muted-foreground">
              <p>Clique no link enviado para redefinir sua senha.</p>
              <p>
                Se não encontrar o email, verifique sua caixa de spam ou lixo
                eletrônico.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSubmitted(false)}
            >
              Tentar outro email
            </Button>
            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <Card className="w-full max-w-md animate-fade-in border-t-4 border-t-primary shadow-lg">
        <CardHeader>
          <CardTitle>Recuperação de Senha</CardTitle>
          <CardDescription>
            Digite seu email cadastrado para receber as instruções de
            redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
                        type="email"
                        autoComplete="email"
                        disabled={loading}
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
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary flex items-center transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
