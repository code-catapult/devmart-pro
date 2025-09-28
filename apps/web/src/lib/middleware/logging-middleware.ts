import { NextResponse } from 'next/server'
import { AuthenticatedRequest } from './auth-middleware'

export function withLogging(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest) => {
    const start = Date.now()
    const { method, url } = req
    const userId = req.user?.id

    console.log(
      `[API] ${method} ${url} - User: ${userId || 'anonymous'} - Started`
    )

    try {
      const response = await handler(req)
      const duration = Date.now() - start

      console.log(
        `[API] ${method} ${url} - Status: ${response.status} - Duration: ${duration}ms`
      )

      return response
    } catch (error) {
      const duration = Date.now() - start
      console.error(
        `[API] ${method} ${url} - Error: ${error} - Duration: ${duration}ms`
      )
      throw error
    }
  }
}
