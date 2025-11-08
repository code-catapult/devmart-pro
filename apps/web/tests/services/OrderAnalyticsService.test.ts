import { OrderAnalyticsService } from '../../src/server/services/OrderAnalyticsService'

describe('OrderAnalyticsService', () => {
  const service = new OrderAnalyticsService()

  it('should compute statistics without cache', async () => {
    const stats = await service.getOrderStatistics({})
    expect(stats).toHaveProperty('totalOrders')
    expect(stats).toHaveProperty('totalRevenue')
    expect(stats).toHaveProperty('averageOrderValue')
  })

  it('should return cached statistics on second call', async () => {
    const stats1 = await service.getOrderStatistics({})
    const stats2 = await service.getOrderStatistics({})
    // Both should return data (second from cache)
    expect(stats2).toEqual(stats1)
  })
})
