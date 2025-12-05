import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

interface SearchParams {
  searchParams: Promise<{ token?: string }>
}

async function ResetPasswordContent({ searchParams }: SearchParams) {
  const params = await searchParams
  const token = params.token || ''

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-600">
              Invalid Reset Link
            </h1>
            <p className="mt-2 text-gray-600">
              This password reset link is invalid. Please request a new one.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-600">DevMart Pro</h1>
          <p className="mt-2 text-gray-600">Create your new password</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}

export default async function ResetPasswordPage(props: SearchParams) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent searchParams={props.searchParams} />
    </Suspense>
  )
}
