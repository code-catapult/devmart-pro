'use client'

import { RequireAuth } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/main-layout'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@repo/ui'
import {
  User,
  Package,
  ShoppingCart,
  Star,
  Settings,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { Route } from 'next'
import { useEffect, useState } from 'react'

function DashboardContent() {
  const { user, isAdmin } = useAuth()
  const { profile, profileLoading } = useUserProfile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || profileLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />
  }

  const stats = [
    {
      title: 'Total Orders',
      value: profile?._count?.orders || 0,
      icon: Package,
      href: '/orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Cart Items',
      value: profile?._count?.cartItems || 0,
      icon: ShoppingCart,
      href: '/cart',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Reviews Written',
      value: profile?._count?.reviews || 0,
      icon: Star,
      href: '/reviews',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  const quickActions = [
    { title: 'Browse Products', href: '/products', icon: Package },
    { title: 'View Cart', href: '/cart', icon: ShoppingCart },
    { title: 'Order History', href: '/orders', icon: CreditCard },
    { title: 'Account Settings', href: '/settings', icon: Settings },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8 my-36">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s what&apos;s happening with your account today.
            </p>
          </div>
          {isAdmin && (
            <Badge
              variant="destructive"
              className="flex items-center space-x-1"
            >
              <User className="w-3 h-3" />
              <span>Admin</span>
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow bg-gray-50 text-gray-800"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div
                  className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <Button asChild variant="link" className="p-0 h-auto text-sm">
                  <Link href={stat.href as Route}>View details →</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              asChild
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2 bg-blue-50 text-gray-800 hover:bg-blue-100 hover:text-gray-800"
            >
              <Link href={action.href as Route}>
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.title}</span>
              </Link>
            </Button>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="bg-gray-50 text-gray-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent orders and account activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile?._count?.orders === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No recent activity</p>
                  <p className="text-sm">
                    Start shopping to see your activity here!
                  </p>
                  <Button asChild className="mt-4">
                    <Link href={'/products' as Route}>Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Order history will be displayed here</p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-2 text-gray-600"
                  >
                    <Link href={'/orders' as Route}>View All Orders</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Panel Link */}
        {isAdmin && (
          <Card className="border-red-200 bg-red-500">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center space-x-2">
                <User className="w-5 h-5 text-white" />
                <span className="text-white">Admin Panel</span>
              </CardTitle>
              <CardDescription>
                Manage users, products, and system settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-gray-200 text-gray-800">
                <Link href="/admin/dashboard">Go to Admin Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}
