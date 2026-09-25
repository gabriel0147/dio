import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full border border-red-100">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Algo deu errado
            </h1>
            <p className="text-gray-500 mb-6 text-sm">
              Ocorreu um erro inesperado na aplicação. Tente recarregar a
              página.
            </p>
            {this.state.error && (
              <div className="bg-gray-100 p-3 rounded text-left mb-6 overflow-auto max-h-32 text-xs font-mono text-gray-700">
                {this.state.error.message}
              </div>
            )}
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar Página
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
