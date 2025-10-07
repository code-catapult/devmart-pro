'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class GlobalErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // In production, log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { errorInfo } });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error!}
            retry={this.handleRetry}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={this.state.error!}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error
  onRetry: () => void
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-3 bg-red-50 rounded-md">
              <p className="text-sm font-medium text-red-800">
                Development Error:
              </p>
              <p className="text-xs text-red-700 mt-1 font-mono">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={onRetry} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go to Homepage</span>
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            Error ID: {Date.now().toString(36)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for functional components to trigger error boundary
export function useErrorBoundary() {
  const [, setState] = React.useState()

  return React.useCallback((error: Error) => {
    setState(() => {
      throw error
    })
  }, [])
}

// Specific error boundaries for different sections
export function APIErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      fallback={({ retry }) => (
        <div className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connection Error
          </h3>
          <p className="text-gray-600 mb-4">
            Unable to load data. Please check your connection and try again.
          </p>
          <Button onClick={retry} size="sm">
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </GlobalErrorBoundary>
  )
}
