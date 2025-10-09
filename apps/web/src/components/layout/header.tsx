'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Menu,
  ShoppingCart,
  Search,
  Store,
  User,
  Package,
  Settings,
  Shield,
} from 'lucide-react'
import { useCart } from '~/hooks/use-cart'
import { toggleCart } from '~/store/slices/cartSlice'
import { Route } from 'next'

interface NavigationItem {
  name: string
  href: string
  icon?: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
}

const navigationItems: NavigationItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Categories', href: '/categories' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const userNavigationItems: NavigationItem[] = [
  {
    name: 'My Orders',
    href: '/orders',
    icon: <Package className="w-4 h-4" />,
    requireAuth: true,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: <User className="w-4 h-4" />,
    requireAuth: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: <Settings className="w-4 h-4" />,
    requireAuth: true,
  },
]

const adminNavigationItems: NavigationItem[] = [
  {
    name: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: <Shield className="w-4 h-4" />,
    requireAdmin: true,
  },
  {
    name: 'Manage Users',
    href: '/admin/users',
    icon: <User className="w-4 h-4" />,
    requireAdmin: true,
  },
  {
    name: 'Manage Products',
    href: '/admin/products',
    icon: <Package className="w-4 h-4" />,
    requireAdmin: true,
  },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAuthenticated, isAdmin, user } = useAuth()
  const pathname = usePathname()

  const { itemCount, dispatch } = useCart()

  const isActivePath = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const getVisibleNavigationItems = (items: NavigationItem[]) => {
    return items.filter((item) => {
      if (item.requireAdmin && !isAdmin) return false
      if (item.requireAuth && !isAuthenticated) return false
      return true
    })
  }

  const visibleUserItems = getVisibleNavigationItems(userNavigationItems)
  const visibleAdminItems = getVisibleNavigationItems(adminNavigationItems)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Store className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">DevMart Pro</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:space-x-6 md:ml-6">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActivePath(item.href)
                  ? 'text-primary font-semibold border-b-2 border-primary'
                  : 'text-foreground/60'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Button (Desktop) */}
        <div className="hidden md:flex md:items-center md:space-x-2">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search products</span>
          </Button>
        </div>

        {/* Cart Button */}
        <Button
          variant="ghost"
          size="sm"
          className="relative ml-2"
          onClick={() => dispatch(toggleCart())}
        >
          <ShoppingCart className="h-4 w-4" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </Badge>
          )}
          <span className="sr-only">Shopping cart</span>
        </Button>

        {/* User Menu or Auth Buttons */}
        <div className="ml-4">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="hidden md:flex md:items-center md:space-x-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden ml-2"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="flex items-center space-x-2">
                <Store className="h-5 w-5" />
                <span>DevMart Pro</span>
              </SheetTitle>
              <SheetDescription>
                {isAuthenticated && user
                  ? `Welcome back, ${user.name || user.email}`
                  : 'Browse our products and shop with confidence'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Main Navigation */}
              <nav className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Navigation
                </h3>
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isActivePath(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/60'
                    }`}
                  >
                    {item.icon && item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>

              {/* User Navigation */}
              {visibleUserItems.length > 0 && (
                <nav className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Account
                  </h3>
                  {visibleUserItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isActivePath(item.href)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground/60'
                      }`}
                    >
                      {item.icon && item.icon}
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
              )}

              {/* Admin Navigation */}
              {visibleAdminItems.length > 0 && (
                <nav className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Administration
                  </h3>
                  {visibleAdminItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isActivePath(item.href)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground/60'
                      }`}
                    >
                      {item.icon && item.icon}
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
              )}

              {/* Auth Buttons (Mobile) */}
              {!isAuthenticated && (
                <div className="space-y-2 pt-4 border-t">
                  <Button asChild className="w-full">
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      href="/auth/signin"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
