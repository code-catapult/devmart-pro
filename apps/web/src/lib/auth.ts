import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { auditLogService } from '../server/services/AuditLogService'
import { Role } from '@repo/shared/types'
import '~/types/auth'

const REGULAR_USER_SESSION_DURATION = 30 * 24 * 60 * 60 // 30 days
const ADMIN_SESSION_DURATION = 8 * 60 * 60 // 8 hours

/**
 * Extract IP address and user agent from request headers
 * Handles both NextAuth request format and standard headers
 */
function getRequestMetadata(req: Record<string, unknown> | undefined) {
  const headers = (req?.headers || {}) as Record<string, unknown> & {
    get?: (name: string) => string | null | undefined
  }

  // Handle both NextAuth format and standard Headers API
  const getHeader = (name: string): string | null | undefined => {
    return typeof headers.get === 'function'
      ? headers.get(name)
      : (headers[name] as string | undefined)
  }

  // Try multiple headers for IP (common proxy headers)
  const forwardedFor = getHeader('x-forwarded-for')
  const ip =
    forwardedFor?.split(',')[0]?.trim() ||
    getHeader('x-real-ip') ||
    getHeader('cf-connecting-ip') ||
    '0.0.0.0'

  const userAgent = getHeader('user-agent') || 'unknown'

  return { ip, userAgent }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'Your secure password',
        },
      },
      async authorize(credentials, req) {
        const { ip, userAgent } = getRequestMetadata(req)

        if (!credentials?.email || !credentials?.password) {
          // Log failed login attempt (missing credentials)
          void auditLogService.logActivity({
            userId: 'anonymous',
            action: 'LOGIN_FAILED',
            metadata: {
              reason: 'Missing credentials',
              email: credentials?.email || 'not provided',
            },
            ipAddress: ip,
            userAgent,
          })

          throw new Error('Please enter both email and password')
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) {
          // Log failed login attempt (user not found)
          void auditLogService.logActivity({
            userId: 'anonymous',
            action: 'LOGIN_FAILED',
            metadata: {
              reason: 'User not found',
              email: credentials.email.toLowerCase(),
            },
            ipAddress: ip,
            userAgent,
          })

          // Use generic error message to prevent email enumeration attacks
          throw new Error('Invalid email or password')
        }

        // Check password hash before moving to bcrypt.compare
        // Our schema has passwordHash as string | null for OAuth users.
        // Oauth authenticates users differently so different setup
        // bcryptjs compare function expects non-null strings
        if (!user.passwordHash) {
          // Log failed login attempt (OAuth user trying credentials)
          void auditLogService.logActivity({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {
              reason: 'No password hash (OAuth user)',
              email: credentials.email.toLowerCase(),
            },
            ipAddress: ip,
            userAgent,
          })

          throw new Error('Invalid email or password')
        }

        // Verify password hash using bcrypt compare
        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          // Log failed login attempt (wrong password)
          void auditLogService.logActivity({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {
              reason: 'Invalid password',
              email: credentials.email.toLowerCase(),
            },
            ipAddress: ip,
            userAgent,
          })

          // Use same generic error message for security
          throw new Error('Invalid email or password')
        }

        if (user.suspended) {
          // Log failed login attempt (account suspended)
          void auditLogService.logActivity({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {
              reason: 'Account suspended',
              email: credentials.email.toLowerCase(),
              suspendedAt: user.suspendedAt,
              suspensionReason: user.suspensionReason,
            },
            ipAddress: ip,
            userAgent,
          })

          throw new Error(
            'Your account has been suspended. Please contact support.'
          )
        }

        // Return user data for JWT token
        // Note: Only return non-sensitive data - passwordHash is excluded
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastPasswordChange: user.lastPasswordChange,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: REGULAR_USER_SESSION_DURATION, // 24 hours
    updateAge: 60 * 60, // Update session every 1 hour (token refresh)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // This block customizes the NextAuth session cookie to be **extra secure in production**, but **still usable in local dev**, by dynamically adjusting the cookie name and flags
  cookies: {
    sessionToken: {
      name: `${
        process.env.NODE_ENV === 'production' ? '__Secure-' : ''
      }next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in: add user data to token
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email?.toLowerCase()
        token.lastPasswordChange = user.lastPasswordChange

        // Set custom expiration based on role
        const now = Math.floor(Date.now() / 1000)
        if (user.role === 'ADMIN') {
          token.exp = now + ADMIN_SESSION_DURATION // 8 hours for admins
          console.log('Admin session created, expires in 8 hours')
        } else {
          token.exp = now + REGULAR_USER_SESSION_DURATION // 30 days for users
          console.log('User session created, expires in 30 days')
        }
      }

      // Handle token updates
      if (trigger === 'update' && token.id) {
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            lastPasswordChange: true,
          },
        })

        if (refreshedUser) {
          token.email = refreshedUser.email
          token.role = refreshedUser.role
          token.lastPasswordChange = refreshedUser.lastPasswordChange

          // Re-set expiration on token refresh
          const now = Math.floor(Date.now() / 1000)
          if (refreshedUser.role === 'ADMIN') {
            token.exp = now + ADMIN_SESSION_DURATION
          } else {
            token.exp = now + REGULAR_USER_SESSION_DURATION
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Add token data to session object
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.email = token.email as string
        session.user.lastPasswordChange = token.lastPasswordChange
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful login to database
      // NOTE: NextAuth events don't provide request object
      // IP/userAgent are captured in the authorize() callback for failed logins
      // For successful logins, we log with generic values since NextAuth
      // doesn't expose request details in the signIn event
      void auditLogService.logActivity({
        userId: user.id,
        action: 'LOGIN',
        metadata: {
          provider: 'credentials',
          loginMethod: 'credentials',
        },
        ipAddress: '0.0.0.0', // Not available in NextAuth signIn event
        userAgent: 'unknown',
      })

      // Only log in development, use proper logging service in production
      if (process.env.NODE_ENV === 'development') {
        console.log('User signed in:', user.email)
      }
    },
    async signOut({ token }) {
      // Log logout event
      // NOTE: NextAuth signOut event doesn't provide request object
      if (token?.id) {
        void auditLogService.logActivity({
          userId: token.id as string,
          action: 'LOGOUT',
          metadata: {},
          ipAddress: '0.0.0.0', // Not available in NextAuth signOut event
          userAgent: 'unknown',
        })
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('User signed out')
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
