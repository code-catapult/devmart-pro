import { Role } from '@prisma/client'
import { Session } from 'next-auth'

export function hasRole(session: Session | null, requiredRole: Role): boolean {
  return session?.user?.role === requiredRole
}

export function isAdmin(session: Session | null): boolean {
  return hasRole(session, Role.ADMIN)
}

export function isUser(session: Session | null): boolean {
  return hasRole(session, Role.USER)
}

export function canAccessAdminPanel(session: Session | null): boolean {
  return isAdmin(session)
}

export function canManageUsers(session: Session | null): boolean {
  return isAdmin(session)
}

export function canManageProducts(session: Session | null): boolean {
  return isAdmin(session)
}

export function canViewOrders(
  session: Session | null,
  userId?: string
): boolean {
  if (isAdmin(session)) return true
  if (userId && session?.user?.id === userId) return true
  return false
}

// Permission checking with better typing
export class Authorization {
  constructor(private session: Session | null) {}

  hasRole(role: Role): boolean {
    return this.session?.user?.role === role
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN)
  }

  isUser(): boolean {
    return this.hasRole(Role.USER)
  }

  canAccess(resource: string, action: string = 'read'): boolean {
    const permissions = this.getPermissions()
    return permissions.some(
      (p) => p.resource === resource && p.actions.includes(action)
    )
  }

  private getPermissions() {
    const role = this.session?.user?.role

    switch (role) {
      case Role.ADMIN:
        return [
          { resource: 'users', actions: ['read', 'write', 'delete'] },
          { resource: 'products', actions: ['read', 'write', 'delete'] },
          { resource: 'orders', actions: ['read', 'write', 'delete'] },
          { resource: 'dashboard', actions: ['read'] },
        ]
      case Role.USER:
        return [
          { resource: 'profile', actions: ['read', 'write'] },
          { resource: 'orders', actions: ['read'] },
          { resource: 'cart', actions: ['read', 'write'] },
        ]
      default:
        return []
    }
  }
}
