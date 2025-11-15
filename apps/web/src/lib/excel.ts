import ExcelJS from 'exceljs'

/**
 * Excel Generation Utility
 *
 * Uses ExcelJS for rich Excel file generation with:
 * - Multiple sheets
 * - Formatted headers
 * - Column widths
 * - Data types (numbers, dates, currency)
 * - Formulas (SUM, AVERAGE, etc.)
 */

export interface ExcelColumn {
  key: string
  label: string
  width?: number
  format?: string // Excel number format (e.g., "$#,##0.00")
}

export interface ExcelSheet<T> {
  name: string
  data: T[]
  columns: ExcelColumn[]
}

export async function generateExcel<T>(
  sheets: ExcelSheet<T>[]
): Promise<Buffer> {
  /**
   * Generate Excel file with multiple sheets.
   *
   * EXAMPLE:
   * Input:
   *   sheets: [{
   *     name: "Users",
   *     data: [{ name: "John", totalSpent: 1500 }],
   *     columns: [
   *       { key: "name", label: "Name", width: 30 },
   *       { key: "totalSpent", label: "Total Spent", width: 20, format: "$#,##0.00" }
   *     ]
   *   }]
   *
   * Output: Excel file with formatted headers, column widths, currency formatting
   */

  const workbook = new ExcelJS.Workbook()

  // Set workbook properties
  workbook.creator = 'Admin Dashboard'
  workbook.created = new Date()

  // Create sheets
  for (const sheetData of sheets) {
    const worksheet = workbook.addWorksheet(sheetData.name)

    // Define columns
    worksheet.columns = sheetData.columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: col.width || 20,
    }))

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }, // Blue background
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } } // White text
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(1).height = 25

    // Add data rows
    sheetData.data.forEach((row) => {
      const excelRow = worksheet.addRow(row)

      // Apply number formats
      sheetData.columns.forEach((col, index) => {
        if (col.format) {
          excelRow.getCell(index + 1).numFmt = col.format
        }
      })
    })

    // Auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheetData.columns.length },
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  // Convert the ExcelJS buffer to a Node.js Buffer type
  return Buffer.from(buffer)
}

/**
 * Convert Excel buffer to downloadable Blob.
 */
export function excelToBlob(buffer: Buffer): Blob {
  // Blob constructor expects BlobPart types (like Uint8Array) rather than a raw Node.js Buffer
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Trigger browser download of Excel file.
 */
export function downloadExcel(buffer: Buffer, filename: string) {
  const blob = excelToBlob(buffer)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Clean up
  URL.revokeObjectURL(url)
}
