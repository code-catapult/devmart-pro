import { z } from 'zod'
import { hash } from 'bcryptjs'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { prisma } from '~/lib/prisma'
import { Role } from '@prisma/client'
import crypto from 'crypto'

// Input validation schemas
const registerSchema = z.object({
  email: z
    .email('Please enter a valid email address')
    .min(1, 'Email is required')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
})

export const authRouter = createTRPCRouter({
  // User registration
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const { email, password, name } = input

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new Error('A user with this email address already exists')
      }

      // Hash password
      const passwordHash = await hash(password, 12)

      try {
        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: Role.USER,
          },
        })

        // Don't return sensitive data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          message: 'Account created successfully! You can now sign in.',
        }
      } catch (error) {
        console.error('Registration error:', error)
        throw new Error('Failed to create account. Please try again.')
      }
    }),

  // Check if email is available
  checkEmail: publicProcedure
    .input(z.object({ email: z.email() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      })

      return {
        available: !user,
        message: user
          ? 'Email address is already registered'
          : 'Email address is available',
      }
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.email('Please enter a valid email address'),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return {
          success: true,
          message:
            'If an account with that email exists, we sent a password reset link.',
        }
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

      // Store reset token in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      })

      // Store reset token (for development, log it)
      console.log('Password reset token for', email, ':', resetToken)
      console.log(
        'Reset URL:',
        `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
      )

      // TODO: In production, send email here
      // await sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message:
          'If an account with that email exists, we sent a password reset link.',
      }
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, 'Reset token is required'),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase, and number'
          ),
      })
    )
    .mutation(async ({ input }) => {
      const { token, password } = input

      // Verify the token from database
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
        },
      })

      if (!user) {
        throw new Error(
          'Invalid or expired reset token. Please request a new password reset.'
        )
      }

      // Hash new password
      const passwordHash = await hash(password, 12)

      // Update user's password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      })

      return {
        success: true,
        message:
          'Password reset successfully. You can now sign in with your new password.',
      }
    }),
})
