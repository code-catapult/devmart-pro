import { AnalyticsProvider } from './AnalyticsContext'

/**
 * Analytics Layout
 *
 * Wraps all analytics pages with AnalyticsProvider to share date range and period state.
 */
export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
