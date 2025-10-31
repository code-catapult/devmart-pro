'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui'
import { AdminNavContent } from './admin-nav-content'

/**
 * AdminMobileHeader Component (Mobile Only)
 *
 * Mobile header with hamburger menu that opens a drawer navigation.
 * Visible on small screens only (<768px).
 *
 * Features:
 * - Hamburger menu button
 * - Sheet/Drawer navigation
 * - Auto-closes after navigation
 * - Accessible (keyboard navigation, focus management)
 */

interface AdminMobileHeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function AdminMobileHeader({ user }: AdminMobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden sticky top-0 z-50 w-full border-b bg-gray-500">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo/Title */}
        <h2 className="text-lg font-bold">Admin Panel</h2>

        {/* Hamburger Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Admin Panel</SheetTitle>
            </SheetHeader>

            {/* Shared Navigation Content */}
            <AdminNavContent
              user={user}
              onNavigate={() => setOpen(false)} // Close drawer after navigation
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
