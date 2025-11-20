import { Component, ErrorInfo, ReactNode } from 'react'
import { devError } from '../constants'
import '../styles/ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * React 19 Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI instead of crashing.
 *
 * Best Practices (2025):
 * - Component-level error boundaries for graceful degradation
 * - User-friendly Norwegian error messages
 * - Option to retry/reload
 * - Preserves app state outside the error boundary
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    devError('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI with Norwegian text
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-content">
            <span className="material-symbols-outlined error-icon">error</span>
            <h2 className="error-title">Noe gikk galt</h2>
            <p className="error-message">
              En uventet feil oppstod. Du kan prøve å laste siden på nytt.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Tekniske detaljer</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                className="error-button error-button-primary"
                onClick={this.handleReload}
              >
                <span className="material-symbols-outlined">refresh</span>
                Last siden på nytt
              </button>
              <button
                className="error-button error-button-secondary"
                onClick={this.handleReset}
              >
                <span className="material-symbols-outlined">restart_alt</span>
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
