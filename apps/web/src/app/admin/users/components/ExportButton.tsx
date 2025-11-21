'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@repo/ui'
import { ExportModal } from './ExportModal'

/**
 * ExportButton Component
 *
 * Trigger button for export modal.
 * Add to User List Page header.
 */

interface ExportButtonProps {
  currentFilters?: {
    search?: string
    role?: 'ALL' | 'USER' | 'ADMIN'
    status?: 'ALL' | 'ACTIVE' | 'SUSPENDED'
  }
}

export function ExportButton({ currentFilters }: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="min-h-[44px]"
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>

      <ExportModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentFilters={currentFilters}
      />
    </>
  )
}
