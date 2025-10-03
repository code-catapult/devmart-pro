import { NextResponse } from 'next/server'
import {
  withAuth,
  AuthenticatedRequest,
} from '@/lib/middleware/auth-middleware'
import { compare, hash } from 'bcryptjs'
import { UserRepository } from '@/lib/repositories/user-repository'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/user/password
async function changePassword(req: AuthenticatedRequest) {
  try {
    const body = await req.json()

    const passwordSchema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })

    const { currentPassword, newPassword, confirmPassword } =
      passwordSchema.parse(body)

    // Verify passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      )
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, passwordHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Cannot change password for OAuth accounts' },
        { status: 400 }
      )
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 12)

    // Update password using repository (this will set lastPasswordChange)
    await UserRepository.updatePassword(user.id, newPasswordHash)

    // Refresh the current session to include the new lastPasswordChange timestamp
    // This keeps the current session alive while invalidating all other sessions
    const session = await getServerSession(authOptions)
    if (session?.user) {
      // Trigger session update on next request
      // The client should call update() from useSession to refresh immediately
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      shouldRefreshSession: true, // Signal frontend to refresh session
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Password update error:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(changePassword)
