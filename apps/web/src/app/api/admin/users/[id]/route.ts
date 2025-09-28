import { NextResponse } from 'next/server'
import {
  withAdmin,
  AuthenticatedRequest,
} from '@/lib/middleware/auth-middleware'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

interface RouteContext {
  params: { id: string }
}

// PUT /api/admin/users/[id]
async function updateUser(req: AuthenticatedRequest, context?: RouteContext) {
  try {
    const { id } = context!.params
    const body = await req.json()

    const updateSchema = z.object({
      role: z.nativeEnum(Role),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })

    const { role, name, email } = updateSchema.parse(body)

    // Prevent demoting the last admin
    if (role === Role.USER) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      })

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      })

      if (targetUser?.role === Role.ADMIN && adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin user' },
          { status: 400 }
        )
      }
    }

    // Check if email is already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id]
async function deleteUser(req: AuthenticatedRequest, context?: RouteContext) {
  try {
    const { id } = context!.params

    // Prevent deleting the last admin
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        )
      }
    }

    // Prevent users from deleting themselves
    if (id === req.user!.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

export const PUT = withAdmin<RouteContext>(updateUser)
export const DELETE = withAdmin<RouteContext>(deleteUser)
