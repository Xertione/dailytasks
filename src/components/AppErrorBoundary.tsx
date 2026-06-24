import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-surface-0 px-6 text-center">
          <AlertTriangle size={48} className="text-amber-400 mb-4" />
          <h1 className="text-lg font-semibold text-text-primary mb-2">出了点问题</h1>
          <p className="text-sm text-text-secondary mb-6 max-w-xs">
            {this.state.error || '应用遇到了一个错误，请重启试试'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: '' })
              window.location.reload()
            }}
            className="px-6 py-2 rounded-lg bg-accent-500 text-white text-sm hover:bg-accent-400 transition-colors"
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
