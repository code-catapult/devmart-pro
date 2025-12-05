'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { api } from '~/utils/api'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@repo/ui'

/**
 * ExportModal Component
 *
 * Allows users to customize and export user data.
 *
 * FEATURES:
 * - Format selection (CSV/Excel)
 * - Column selection
 * - Current filters applied
 * - Download trigger
 *
 * MOBILE OPTIMIZATION:
 * - Touch-friendly checkboxes
 * - Stacked layout on mobile
 * - Clear format options
 */

interface ExportModalProps {
  open: boolean
  onClose: () => void
  currentFilters?: {
    search?: string
    role?: 'ALL' | 'USER' | 'ADMIN'
    status?: 'ALL' | 'ACTIVE' | 'SUSPENDED'
  }
}

export function ExportModal({
  open,
  onClose,
  currentFilters,
}: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  // Fetch available columns
  const { data: availableColumns } =
    api.admin.userManagement.getExportColumns.useQuery()

  // Export mutation
  const exportMutation = api.admin.userManagement.exportUserList.useMutation()

  // ============================================
  // HANDLE COLUMN TOGGLE
  // ============================================

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey]
    )
  }

  // ============================================
  // HANDLE EXPORT
  // ============================================

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        format,
        columns: selectedColumns,
        filters: currentFilters,
      })

      // Decode base64 and trigger download
      const binaryString = atob(result.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.mimeType })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()

      URL.revokeObjectURL(url)

      onClose()
    } catch {
      alert('Failed to export data. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export User Data</DialogTitle>
          <DialogDescription>
            Customize your export by selecting format and columns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as 'csv' | 'excel')}
              className="mt-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">CSV</p>
                    <p className="text-xs text-gray-600">
                      Universal format, smaller file size
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 mt-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label
                  htmlFor="excel"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Excel (XLSX)</p>
                    <p className="text-xs text-gray-600">
                      Rich formatting, multiple sheets
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Column Selection */}
          <div>
            <Label className="text-sm font-medium">Select Columns</Label>
            <div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto rounded-lg border p-4">
              {availableColumns?.map((col) => (
                <div key={col.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={col.key}
                    checked={
                      selectedColumns.includes(col.key) || col.alwaysInclude
                    }
                    onCheckedChange={() =>
                      !col.alwaysInclude && toggleColumn(col.key)
                    }
                    disabled={col.alwaysInclude}
                  />
                  <Label
                    htmlFor={col.key}
                    className={`flex-1 cursor-pointer text-sm ${
                      col.alwaysInclude ? 'text-gray-500' : ''
                    }`}
                  >
                    {col.label} {col.alwaysInclude && '(Always included)'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Current Filters Info */}
          {currentFilters && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-900">
                Current Filters Applied:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                {currentFilters.search && (
                  <li>Search: `&quot;`{currentFilters.search}`&quot;`</li>
                )}
                {currentFilters.role !== 'ALL' && (
                  <li>Role: {currentFilters.role}</li>
                )}
                {currentFilters.status !== 'ALL' && (
                  <li>Status: {currentFilters.status}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending || selectedColumns.length === 0}
            className="min-h-[44px]"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
