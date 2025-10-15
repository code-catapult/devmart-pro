import { NextResponse } from 'next/server'
import {
  withAdmin,
  AuthenticatedRequest,
  withRateLimit,
} from '@/lib/middleware/auth-middleware'
import { prisma } from '@/lib/prisma'
import { Role } from '@repo/shared/types'

// GET /api/admin/users
async function getAllUsers(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20'))
    )
    const search = searchParams.get('search') || undefined
    const role = searchParams.get('role') as Role | undefined

    const skip = (page - 1) * limit

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              cartItems: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export const GET = withAdmin(withRateLimit(getAllUsers))
