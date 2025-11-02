import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { OrderExportService } from '~/server/services/OrderExportService'
import { OrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  // 1. Verify admin authorization
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse query parameters (filters)
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') as OrderStatus | null
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const search = searchParams.get('search')

  const filters = {
    ...(status && { status }),
    ...(startDate && { startDate: new Date(startDate) }),
    ...(endDate && { endDate: new Date(endDate) }),
    ...(search && { search }),
  }

  // 3. Initialize export service
  const exportService = new OrderExportService()

  try {
    // 4. Create ReadableStream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream CSV rows one at a time
          for await (const row of exportService.streamOrdersAsCSV(filters)) {
            controller.enqueue(new TextEncoder().encode(row))
          }
          controller.close()
        } catch (error) {
          console.error('Export stream error:', error)
          controller.error(error)
        }
      },
    })

    // 5. Generate filename with current date
    const date = new Date().toISOString().split('T')[0]
    const filename = `orders-export-${date}.csv`

    // 6. Return streaming response with CSV headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    )
  }
}
