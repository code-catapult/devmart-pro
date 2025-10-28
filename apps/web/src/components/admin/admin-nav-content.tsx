'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@repo/shared/utils'
import { Button } from '@repo/ui'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  StoreIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Route } from 'next'

/**
 * AdminNavContent Component
 *
 * Shared navigation content used in both desktop sidebar and mobile drawer.
 * DRY principle: Define navigation structure once, use everywhere.
 */

interface AdminNavContentProps {
  user: {
    name?: string | null
    email?: string | null
  }
  onNavigate?: () => void // Called after navigation (to close mobile drawer)
}

export function AdminNavContent({ user, onNavigate }: AdminNavContentProps) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/admin/products', icon: Package },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Store', href: '/products', icon: StoreIcon },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate} // Close drawer on mobile after navigation
          >
            <Button
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start gap-2')}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t">
        <div className="mb-4 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate">{user.email}</p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
