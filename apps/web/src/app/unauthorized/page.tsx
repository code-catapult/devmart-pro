import { Suspense } from 'react'
import { UnauthorizedContent } from '~/components/unauthorized-content'

function UnauthorizedSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<UnauthorizedSkeleton />}>
      <UnauthorizedContent />
    </Suspense>
  )
}
