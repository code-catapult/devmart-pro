import * as Papa from 'papaparse'

/**
 * CSV Generation Utility
 *
 * Uses PapaParse for robust CSV generation with:
 * - Proper escaping (commas, quotes, newlines in data)
 * - UTF-8 BOM for Excel compatibility
 * - Configurable delimiters
 */

export interface CSVColumn {
  key: string
  label: string
  format?: (value: unknown) => string
}

export function generateCSV<T>(data: T[], columns: CSVColumn[]): string {
  /**
   * Convert data to CSV format.
   *
   * EXAMPLE:
   * Input:
   *   data: [{ name: "John Doe", email: "john@example.com", totalSpent: 1500 }]
   *   columns: [
   *     { key: "name", label: "Name" },
   *     { key: "email", label: "Email" },
   *     { key: "totalSpent", label: "Total Spent", format: (v) => `$${v}` }
   *   ]
   *
   * Output:
   *   "Name,Email,Total Spent\nJohn Doe,john@example.com,$1500"
   */

  // Build header row
  const headers = columns.map((col) => col.label)

  // Build data rows
  const rows = data.map((row) => {
    return columns.map((col) => {
      const value = (row as Record<string, unknown>)[col.key]

      // Apply custom formatting if provided
      if (col.format) {
        return col.format(value)
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return ''
      }

      // Handle dates
      if (value instanceof Date) {
        return value.toISOString()
      }

      // Convert to string
      return String(value)
    })
  })

  // Generate CSV using PapaParse
  const csv = Papa.unparse(
    {
      fields: headers,
      data: rows,
    },
    {
      quotes: true, // Quote all fields
      delimiter: ',', // Comma delimiter
      newline: '\n', // Unix line endings
      skipEmptyLines: false,
    }
  )

  // Add UTF-8 BOM for Excel compatibility
  // (Excel needs BOM to properly display UTF-8 characters)
  const BOM = '\uFEFF'

  return BOM + csv
}

/**
 * Convert CSV string to downloadable Blob.
 */
export function csvToBlob(csv: string): Blob {
  return new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })
}

/**
 * Trigger browser download of CSV file.
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = csvToBlob(csv)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Clean up
  URL.revokeObjectURL(url)
}
