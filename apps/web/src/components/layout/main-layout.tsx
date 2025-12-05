import { Header } from './header'
import { Footer } from './footer'
import { GlobalErrorBoundary } from '@/components/error-boundary'

interface MainLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
  className?: string
}

export function MainLayout({
  children,
  showHeader = true,
  showFooter = true,
  className,
}: MainLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className || ''}`}>
      {showHeader && <Header />}

      <main className="flex-1">
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
      </main>

      {showFooter && <Footer />}
    </div>
  )
}

// Specific layout variants for different page types
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout showHeader={false} showFooter={false} className="bg-gray-50">
      {children}
    </MainLayout>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout className="bg-gray-50">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </MainLayout>
  )
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      <div className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Admin Mode</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </MainLayout>
  )
}
