import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { NextResponse } from 'next/server'
import { auditLogService } from '~/server/services/AuditLogService'

/**
 * POST /api/auth/logout
 *
 * Logs user logout event and ends session
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Log logout activity
  void auditLogService.logActivity({
    userId: session.user.id,
    action: 'LOGOUT',
    metadata: {
      sessionDuration: 'unknown', // Could track if session start time stored
    },
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0',
    userAgent: req.headers.get('user-agent') || 'Unknown',
  })

  return NextResponse.json({ success: true })
}
