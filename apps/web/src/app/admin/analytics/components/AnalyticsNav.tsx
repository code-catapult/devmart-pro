import Link from 'next/link'
import { Route } from 'next'
import { cn } from '@repo/shared/utils'
import { usePathname } from 'next/navigation'

const AnalyticsNav = () => {
  const pathname = usePathname()

  const tabClasses = (path: string) =>
    cn(
      'py-4 px-1 text-sm font-medium border-b-2',
      pathname === path
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    )

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <Link
          href={'/admin/analytics/orders' as Route}
          className={tabClasses('/admin/analytics/orders')}
        >
          Order Analytics
        </Link>
        <Link
          href={'/admin/analytics' as Route}
          className={tabClasses('/admin/analytics')}
        >
          Revenue Analytics
        </Link>
        <Link
          href={'/admin/analytics/users' as Route}
          className={tabClasses('/admin/analytics/users')}
        >
          User Analytics
        </Link>
      </nav>
    </div>
  )
}

export default AnalyticsNav
