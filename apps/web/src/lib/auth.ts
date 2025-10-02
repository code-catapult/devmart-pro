import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import '~/types/auth'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password')
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) {
          // Use generic error message to prevent email enumeration attacks
          throw new Error('Invalid email or password')
        }

        // Check password hash before moving to bcrypt.compare
        // Our schema has passwordHash as string | null for OAuth users.
        // Oauth authenticates users differently so different setup
        // bcryptjs compare function expects non-null strings
        if (!user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        // Verify password hash using bcrypt compare
        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          // Use same generic error message for security
          throw new Error('Invalid email or password')
        }

        // Return user data for JWT token
        // Note: Only return non-sensitive data - passwordHash is excluded
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
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
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in: add user data to token
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email?.toLowerCase()
      }

      // Handle token updates (e.g., profile changes, role changes, etc., will not trigger a log-out.)
      if (trigger === 'update' && token.id) {
        // Optionally refresh user data from database
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, email: true, name: true, role: true },
        })

        if (refreshedUser) {
          token.email = refreshedUser.email
          token.role = refreshedUser.role
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
      }
      return session
    },
  },
  events: {
    async signIn(message) {
      // Only log in development, use proper logging service in production
      if (process.env.NODE_ENV === 'development') {
        console.log('User signed in:', message.user.email)
      }
      // In production, integrate with logging service (e.g., Winston, Sentry)
    },
    async signOut(message) {
      if (process.env.NODE_ENV === 'development') {
        console.log('User signed out')
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
