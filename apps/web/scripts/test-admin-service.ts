import { adminService } from '../src/server/services/AdminService'

async function testAdminService() {
  console.log('Testing AdminService...\n')

  // Test dashboard metrics
  console.log('1. Dashboard Metrics:')
  const metrics = await adminService.calculateDashboardMetrics()
  console.log(metrics)

  // Test recent orders
  console.log('\n2. Recent Orders (first 5):')
  const recentOrders = await adminService.fetchRecentOrders(5, 1)
  console.log(`Found ${recentOrders.orders.length} orders`)
  console.log(`Total: ${recentOrders.pagination.totalCount}`)

  // Test sales analytics
  console.log('\n3. Sales Analytics (daily, last 7 days):')
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const analytics = await adminService.calculateSalesAnalytics(
    'daily',
    startDate,
    endDate
  )
  console.log(analytics)

  // Test low inventory
  console.log('\n4. Low Inventory Products (threshold: 10):')
  const lowInventory = await adminService.fetchLowInventoryProducts(10)
  console.log(`Found ${lowInventory.length} low inventory products`)

  process.exit(0)
}

testAdminService().catch(console.error)
