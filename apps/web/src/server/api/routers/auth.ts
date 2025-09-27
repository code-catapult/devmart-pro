import { z } from 'zod'
import { hash } from 'bcryptjs'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

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

const loginSchema = z.object({
  email: z.email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
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
      const hashedPassword = await hash(password, 12)

      try {
        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            name,
            // Note: We'll add hashedPassword field to schema in next step
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

  // Verify user exists for login
  verifyUser: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    const { email, password } = input

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('No account found with this email address')
    }

    // In production, verify password hash here
    // const isValid = await compare(password, user.hashedPassword);
    // if (!isValid) {
    //   throw new Error('Invalid password');
    // }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  }),
})
