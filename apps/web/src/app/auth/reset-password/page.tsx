import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

function ResetPasswordContent() {
  // In a real app, you'd get the token from URL params
  const token = 'demo-token-from-url'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">DevMart Pro</h1>
          <p className="mt-2 text-gray-600">Create your new password</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
