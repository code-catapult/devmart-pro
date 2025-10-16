'use client'

import Link from 'next/link'
import { Button } from '@repo/ui'
import { PlusCircle, Package, Users, FileText } from 'lucide-react'
import { Route } from 'next'

export function QuickActions() {
  const actions = [
    { label: 'Add Product', href: '/admin/products/new', icon: PlusCircle },
    { label: 'View All Orders', href: '/admin/orders', icon: Package },
    { label: 'Manage Users', href: '/admin/users', icon: Users },
    { label: 'Export Reports', href: '/admin/reports', icon: FileText },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.label} href={action.href as Route}>
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col gap-2"
            asChild
          >
            <div>
              <action.icon className="h-6 w-6" />
              <span>{action.label}</span>
            </div>
          </Button>
        </Link>
      ))}
    </div>
  )
}
