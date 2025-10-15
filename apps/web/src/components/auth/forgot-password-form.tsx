'use client'

import { useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@repo/ui'
import { api } from '@/utils/api'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const resetMutation = api.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setIsSuccess(true)
      setError('')
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    resetMutation.mutate({ email })
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto bg-blue-300">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>Password reset link sent</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              If an account with that email exists, we sent a password reset
              link. Please check your email and follow the instructions.
            </AlertDescription>
          </Alert>
          <Button
            asChild
            className="w-full mt-4 bg-blue-100 text-gray-600 hover:bg-blue-200"
          >
            <a href="/auth/signin">Back to Sign In</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-blue-300">
      <CardHeader>
        <CardTitle>Forgot Password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value)
                setError('')
              }}
              className={error ? 'border-red-500' : ''}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-100 text-gray-600"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Remember your password?{' '}
            <a href="/auth/signin" className="text-blue-600 hover:underline">
              Sign In
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
