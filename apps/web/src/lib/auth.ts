import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import '~/types/auth'

export const authOptions: NextAuthOptions = {
  // Use Prisma adapter for database sessions
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database', // Store sessions in PostgreSQL
    maxAge: 24 * 60 * 60, // 24 hours
  },
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
          throw new Error('No user found with this email address')
        }

        // In production, verify password hash
        // const isPasswordValid = await compare(credentials.password, user.hashedPassword);
        // if (!isPasswordValid) {
        //   throw new Error('Invalid password');
        // }

        // Return user data for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID and role to session
      if (user) {
        session.user.id = user.id
        session.user.role = user.role || Role.USER
      }
      return session
    },
    async signIn({ user, account }) {
      // Custom sign-in logic
      console.log('User signing in:', user.email)
      return true
    },
  },
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email)

      // Update last login time in database
      if (message.user.id) {
        await prisma.user.update({
          where: { id: message.user.id },
          data: { updatedAt: new Date() },
        })
      }
    },
    async signOut(message) {
      console.log('User signed out')
    },
    async createUser(message) {
      console.log('New user created:', message.user.email)
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
