'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Home, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const handleGoBack = () => {
    router.push(callbackUrl as Route)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-900">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don&apos;t have permission to access this resource. Contact your
            administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Why am I seeing this?</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>You may not have the required role or permissions</li>
                  <li>Your session may have expired</li>
                  <li>The resource may be restricted to certain users</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full bg-red-600">
              <Link
                href="/"
                className="flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go to Homepage</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 bg-red-600"
              onClick={handleGoBack}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <Link
                href={'/contact' as Route}
                className="text-blue-600 hover:underline"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
