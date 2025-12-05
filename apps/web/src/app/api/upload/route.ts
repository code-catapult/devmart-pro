import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth' // ← Adjust path to YOUR auth config location
import { fileUploadService } from '~/server/services/FileUploadService'
import { rateLimit } from '~/lib/rate-limit'
import { z } from 'zod'

/**
 * Upload API Route
 *
 * Handles presigned URL generation for S3 uploads and file deletion.
 * Protected by admin role verification and rate limiting.
 *
 * POST /api/upload - Generate presigned URL (rate limited: 10/minute)
 * DELETE /api/upload - Delete file from S3 (rate limited: 20/minute)
 */

// Input validation schemas
const uploadRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z
    .string()
    .regex(
      /^image\/(jpeg|png|webp)$/,
      'Invalid content type. Must be image/jpeg, image/png, or image/webp'
    ),
  productId: z.string().optional(),
})

const deleteRequestSchema = z.object({
  fileUrl: z.url('Invalid file URL'),
})

/**
 * POST /api/upload
 *
 * Generate presigned URL for client-side S3 upload.
 * Requires admin authentication and enforces rate limiting.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // 2. ✨ ENHANCED: Rate limiting (10 upload requests per minute per admin)
    const rateLimitResult = rateLimit(session.user.id, 10, 60000)

    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.resetTime
        ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        : 60

      return NextResponse.json(
        {
          error: 'Too many upload requests. Please wait before trying again.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      )
    }

    // 3. Parse and validate request body
    const body = await req.json()
    const validatedInput = uploadRequestSchema.parse(body)

    // 4. Generate presigned URL
    const result = await fileUploadService.generatePresignedUrl(
      validatedInput.fileName,
      validatedInput.contentType,
      validatedInput.productId
    )

    // 5. Return presigned URL to client
    return NextResponse.json(
      {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
        key: result.key,
        expiresIn: 900, // 15 minutes in seconds
      },
      {
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    )
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle FileUploadService errors (e.g., invalid content type, AWS errors)
    if (error instanceof Error) {
      console.error('Upload URL generation failed:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Generic error
    console.error('Upload URL generation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/upload
 *
 * Delete file from S3.
 * Requires admin authentication and enforces rate limiting.
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Verify admin session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // 2. ✨ ENHANCED: Rate limiting (20 delete requests per minute)
    // Higher limit than uploads since deletion is faster
    const rateLimitResult = rateLimit(`${session.user.id}:delete`, 20, 60000)

    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.resetTime
        ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        : 60

      return NextResponse.json(
        {
          error: 'Too many delete requests. Please wait before trying again.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // 3. Parse and validate request body
    const body = await req.json()
    const validatedInput = deleteRequestSchema.parse(body)

    // 4. Extract S3 key from URL
    const key = fileUploadService.extractKeyFromUrl(validatedInput.fileUrl)

    // 5. Delete from S3
    await fileUploadService.deleteFile(key)

    // 6. Return success
    return NextResponse.json({
      success: true,
      deletedKey: key,
      message: `File deleted successfully: ${key}`,
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle deletion errors
    if (error instanceof Error) {
      console.error('File deletion failed:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Generic error
    console.error('File deletion failed:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}
