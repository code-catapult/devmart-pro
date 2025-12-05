// import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '~/lib/auth'
// import { OrderExportService } from '~/server/services/OrderExportService'
// import { OrderStatus } from '@prisma/client'

// export async function GET(request: NextRequest) {
//   // 1. Verify admin authorization
//   const session = await getServerSession(authOptions)
//   if (!session || session.user.role !== 'ADMIN') {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   // 2. Parse query parameters (filters)
//   const searchParams = request.nextUrl.searchParams
//   const status = searchParams.get('status') as OrderStatus | null
//   const startDate = searchParams.get('startDate')
//   const endDate = searchParams.get('endDate')
//   const search = searchParams.get('search')

//   const filters = {
//     ...(status && { status }),
//     ...(startDate && { startDate: new Date(startDate) }),
//     ...(endDate && { endDate: new Date(endDate) }),
//     ...(search && { search }),
//   }

//   // 3. Initialize export service
//   const exportService = new OrderExportService()

//   try {
//     // 4. Create ReadableStream for streaming response
//     const stream = new ReadableStream({
//       async start(controller) {
//         try {
//           // Stream CSV rows one at a time
//           for await (const row of exportService.streamOrdersAsCSV(filters)) {
//             controller.enqueue(new TextEncoder().encode(row))
//           }
//           controller.close()
//         } catch (error) {
//           console.error('Export stream error:', error)
//           controller.error(error)
//         }
//       },
//     })

//     // 5. Generate filename with current date
//     const date = new Date().toISOString().split('T')[0]
//     const filename = `orders-export-${date}.csv`

//     // 6. Return streaming response with CSV headers
//     return new NextResponse(stream, {
//       headers: {
//         'Content-Type': 'text/csv; charset=utf-8',
//         'Content-Disposition': `attachment; filename="${filename}"`,
//         'Cache-Control': 'no-cache',
//       },
//     })
//   } catch (error) {
//     console.error('Export error:', error)
//     return NextResponse.json(
//       { error: 'Failed to export orders' },
//       { status: 500 }
//     )
//   }
// }

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '~/lib/auth'
import { OrderExportService } from '~/server/services/OrderExportService'
import { OrderStatus } from '@prisma/client'
/**
 * GET /api/admin/orders/export
 *
 * Admin-only endpoint for exporting orders as CSV.
 * Supports filtering by status, date range, and search term.
 * Streams response for large datasets.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin session
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams

    const statusParam = searchParams.get('status')
    const status =
      statusParam &&
      Object.values(OrderStatus).includes(statusParam as OrderStatus)
        ? (statusParam as OrderStatus)
        : undefined
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const search = searchParams.get('search') || undefined

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // 3. Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const filename = `orders-export-${timestamp}.csv`

    // 4. Create export service
    const exportService = new OrderExportService()

    // 5. Create streaming response
    const encoder = new TextEncoder()

    // Create ReadableStream that yields CSV data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate CSV in chunks
          for await (const chunk of exportService.generateCSV({
            status,
            startDate,
            endDate,
            search,
          })) {
            // Convert string chunk to Uint8Array and enqueue
            controller.enqueue(encoder.encode(chunk))
          }

          // Close stream when done
          controller.close()
        } catch (error) {
          console.error('Export error:', error)
          controller.error(error)
        }
      },
    })

    // 6. Return response with download headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache', // Don't cache exports
      },
    })
  } catch (error) {
    console.error('Export route error:', error)
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    )
  }
}
