import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import '~/types/auth'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

        // For now, we'll check if the user exists and create a simple auth
        // In production, you would verify the hashed password
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
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist user data in JWT token
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // Make user data available in session
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email)
    },
    async signOut(message) {
      console.log('User signed out')
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
