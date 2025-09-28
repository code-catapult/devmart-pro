import { DefaultSession, DefaultUser } from 'next-auth'

import { Role } from '@prisma/client'

// Extend the built-in next-auth types

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      emailVerified?: Date | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    role: Role
    emailVerified?: Date | null
  }
}

// Note: JWT types removed since we use database sessions with PrismaAdapter
// The JWT module declaration is only needed for JWT session strategy

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  role: Role
  emailVerified?: Date | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
}
