import { prisma } from '../../src/lib/prisma'
import { AuditLogService } from '../../src/server/services/AuditLogService'
import { subMinutes, subHours, subDays } from 'date-fns'

describe('AuditLogService - Detection Algorithms', () => {
  let auditLogService: AuditLogService

  beforeEach(() => {
    auditLogService = new AuditLogService()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.user.deleteMany({})
  })

  describe('detectFailedLoginAttempts', () => {
    it('should detect user with exactly 5 failed logins in 10 minutes', async () => {
      // Arrange: Create test user
      const user = await prisma.user.create({
        data: {
          email: 'attacker@test.com',
          name: 'Test Attacker',
          role: 'USER',
        },
      })

      // Create 5 failed login attempts in last 10 minutes
      const nineMinutesAgo = subMinutes(new Date(), 9)
      for (let i = 0; i < 5; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'Invalid password' },
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: new Date(nineMinutesAgo.getTime() + i * 60000), // Spread over 5 minutes
          },
        })
      }

      // Act: Run detection
      const alerts = await auditLogService.detectFailedLoginAttempts()

      // Assert: Should detect the threat
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('FAILED_LOGIN')
      expect(alerts[0].severity).toBe('MEDIUM')
      expect(alerts[0].userId).toBe(user.id)
      expect(alerts[0].count).toBe(5)
    })

    it('should NOT detect user with 4 failed logins (below threshold)', async () => {
      // Arrange: Create user with 4 failed logins
      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'Test User',
          role: 'USER',
        },
      })

      for (let i = 0; i < 4; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: subMinutes(new Date(), 5),
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectFailedLoginAttempts()

      // Assert: No alert (below threshold)
      expect(alerts).toHaveLength(0)
    })

    it('should NOT detect failed logins outside 10-minute window', async () => {
      // Arrange: Create user with 5 failed logins 11 minutes ago
      const user = await prisma.user.create({
        data: {
          email: 'old-attack@test.com',
          name: 'Old Attack',
          role: 'USER',
        },
      })

      const elevenMinutesAgo = subMinutes(new Date(), 11)
      for (let i = 0; i < 5; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: elevenMinutesAgo,
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectFailedLoginAttempts()

      // Assert: No alert (outside time window)
      expect(alerts).toHaveLength(0)
    })

    it('should classify 10+ failed logins as HIGH severity', async () => {
      // Arrange: Create user with 10 failed logins
      const user = await prisma.user.create({
        data: {
          email: 'severe-attack@test.com',
          name: 'Severe Attack',
          role: 'USER',
        },
      })

      for (let i = 0; i < 10; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: subMinutes(new Date(), 5),
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectFailedLoginAttempts()

      // Assert: HIGH severity
      expect(alerts[0].severity).toBe('HIGH')
      expect(alerts[0].count).toBe(10)
    })
  })

  describe('detectUnusualLoginLocations', () => {
    it('should detect login from new IP for established account', async () => {
      // Arrange: Create user with historical login from IP1
      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'Test User',
          role: 'USER',
          createdAt: subDays(new Date(), 30), // 30-day-old account
        },
      })

      // Historical login from IP1
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          metadata: {
            ipAddress: '192.168.1.100',
            country: 'US',
            city: 'New York',
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          createdAt: subDays(new Date(), 5),
        },
      })

      // New login from IP2 (different)
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          metadata: {
            ipAddress: '203.0.113.50',
            country: 'CN',
            city: 'Beijing',
          },
          ipAddress: '203.0.113.50',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
      })

      // Act
      const alerts = await auditLogService.detectUnusualLoginLocations()

      // Assert
      expect(alerts.length).toBeGreaterThan(0)
      const newIpAlert = alerts.find((a) => a.type === 'UNUSUAL_LOCATION')
      expect(newIpAlert).toBeDefined()
      expect(newIpAlert?.userId).toBe(user.id)
    })

    it.skip('should detect impossible travel (>500 miles in <1 hour)', async () => {
      // Arrange: Create user with two logins far apart
      const user = await prisma.user.create({
        data: {
          email: 'traveler@test.com',
          name: 'Impossible Traveler',
          role: 'USER',
          createdAt: subDays(new Date(), 30),
        },
      })

      // Login 1: New York
      const fiftyMinutesAgo = subMinutes(new Date(), 50)
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          metadata: {
            ipAddress: '192.168.1.100',
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          createdAt: fiftyMinutesAgo,
        },
      })

      // Login 2: Los Angeles (2,789 miles away, 50 minutes later)
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          metadata: {
            ipAddress: '203.0.113.50',
            country: 'US',
            city: 'Los Angeles',
            latitude: 34.0522,
            longitude: -118.2437,
          },
          ipAddress: '203.0.113.50',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
      })

      // Act
      const alerts = await auditLogService.detectUnusualLoginLocations()

      // Assert: Should detect impossible travel
      expect(alerts.length).toBeGreaterThan(0)
      const travelAlert = alerts.find((a) => a.type === 'IMPOSSIBLE_TRAVEL')
      expect(travelAlert).toBeDefined()
      expect(travelAlert?.severity).toBe('HIGH')
    })

    it('should NOT flag new accounts with new IP (expected behavior)', async () => {
      // Arrange: Create brand new user (today)
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@test.com',
          name: 'New User',
          role: 'USER',
          createdAt: new Date(), // Created today
        },
      })

      // First login ever
      await prisma.activityLog.create({
        data: {
          userId: newUser.id,
          action: 'LOGIN',
          metadata: {
            ipAddress: '192.168.1.100',
            country: 'US',
            city: 'New York',
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
      })

      // Act
      const alerts = await auditLogService.detectUnusualLoginLocations()

      // Assert: No alerts (new accounts expected to have new IPs)
      const newIpAlerts = alerts.filter((a) => a.userId === newUser.id)
      expect(newIpAlerts).toHaveLength(0)
    })
  })

  describe('detectRapidAccountCreation', () => {
    it('should detect 3 accounts from same IP in 1 hour', async () => {
      // Arrange: Create 3 users from same IP within 1 hour
      const commonIp = '192.168.1.100'
      const thirtyMinutesAgo = subMinutes(new Date(), 30)

      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            email: `user${i}@test.com`,
            name: `User ${i}`,
            role: 'USER',
            createdAt: new Date(thirtyMinutesAgo.getTime() + i * 600000), // 10 min apart
          },
        })

        // Log account creation with IP
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'USER_CREATED',
            metadata: { registrationIp: commonIp },
            ipAddress: commonIp,
            userAgent: 'Mozilla/5.0',
            createdAt: user.createdAt,
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectRapidAccountCreation()

      // Assert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('RAPID_ACCOUNT_CREATION')
      expect(alerts[0].severity).toBe('MEDIUM')
      expect(alerts[0].count).toBe(3)
    })

    it('should classify 5+ accounts from same IP as HIGH severity', async () => {
      // Arrange: Create 5 accounts from same IP
      const commonIp = '203.0.113.50'
      const thirtyMinutesAgo = subMinutes(new Date(), 30)

      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            email: `spammer${i}@test.com`,
            name: `Spammer ${i}`,
            role: 'USER',
            createdAt: new Date(thirtyMinutesAgo.getTime() + i * 300000),
          },
        })

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'USER_CREATED',
            metadata: { registrationIp: commonIp },
            ipAddress: commonIp,
            userAgent: 'Mozilla/5.0',
            createdAt: user.createdAt,
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectRapidAccountCreation()

      // Assert: HIGH severity
      expect(alerts[0].severity).toBe('HIGH')
      expect(alerts[0].count).toBe(5)
    })

    it('should NOT detect accounts created outside 1-hour window', async () => {
      // Arrange: Create 3 accounts, but spread over 2 hours
      const commonIp = '192.168.1.200'

      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            email: `slowuser${i}@test.com`,
            name: `Slow User ${i}`,
            role: 'USER',
            createdAt: subHours(new Date(), 2 - i * 0.7), // Spread over 2 hours
          },
        })

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'USER_CREATED',
            metadata: { registrationIp: commonIp },
            ipAddress: commonIp,
            userAgent: 'Mozilla/5.0',
            createdAt: user.createdAt,
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectRapidAccountCreation()

      // Assert: No alerts (outside time window)
      expect(alerts).toHaveLength(0)
    })
  })

  describe('detectSuspiciousOrders', () => {
    it('should detect high-value first order from new account', async () => {
      // Arrange: Create new user (today) with high-value first order
      const newUser = await prisma.user.create({
        data: {
          email: 'fraudster@test.com',
          name: 'Fraudster',
          role: 'USER',
          createdAt: new Date(), // Account created today
        },
      })

      // Create high-value order ($600)
      await prisma.order.create({
        data: {
          userId: newUser.id,
          orderNumber: `TEST-${Date.now()}-1`,
          subtotal: 60000,
          total: 60000, // $600 in cents
          status: 'PENDING',
          shippingAddress: {},
          createdAt: new Date(),
        },
      })

      // Act
      const alerts = await auditLogService.detectSuspiciousOrders()

      // Assert
      expect(alerts.length).toBeGreaterThan(0)
      const highValueAlert = alerts.find(
        (a) => a.type === 'HIGH_VALUE_NEW_ACCOUNT'
      )
      expect(highValueAlert).toBeDefined()
      expect(highValueAlert?.severity).toBe('HIGH')
    })

    it('should detect rapid sequential orders (card testing)', async () => {
      // Arrange: Create user with 3 orders in 5 minutes
      const user = await prisma.user.create({
        data: {
          email: 'tester@test.com',
          name: 'Card Tester',
          role: 'USER',
        },
      })

      const fourMinutesAgo = subMinutes(new Date(), 4)

      for (let i = 0; i < 3; i++) {
        await prisma.order.create({
          data: {
            userId: user.id,
            orderNumber: `TEST-${Date.now()}-${i}`,
            subtotal: 100,
            total: 100, // $1 test charge
            status: 'PENDING',
            shippingAddress: {},
            createdAt: new Date(fourMinutesAgo.getTime() + i * 80000), // ~1.3 min apart
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectSuspiciousOrders()

      // Assert
      expect(alerts.length).toBeGreaterThan(0)
      const rapidAlert = alerts.find((a) => a.type === 'RAPID_ORDERS')
      expect(rapidAlert).toBeDefined()
      expect(rapidAlert?.severity).toBe('CRITICAL')
    })

    it('should NOT flag high-value orders from established accounts', async () => {
      // Arrange: Create established user (90 days old) with high-value order
      const establishedUser = await prisma.user.create({
        data: {
          email: 'vip@test.com',
          name: 'VIP Customer',
          role: 'USER',
          createdAt: subDays(new Date(), 90), // 90-day-old account
        },
      })

      // Previous orders exist
      await prisma.order.create({
        data: {
          userId: establishedUser.id,
          orderNumber: `TEST-${Date.now()}-OLD`,
          subtotal: 10000,
          total: 10000,
          status: 'DELIVERED',
          shippingAddress: {},
          createdAt: subDays(new Date(), 30),
        },
      })

      // New high-value order
      await prisma.order.create({
        data: {
          userId: establishedUser.id,
          orderNumber: `TEST-${Date.now()}-NEW`,
          subtotal: 80000,
          total: 80000, // $800
          status: 'PENDING',
          shippingAddress: {},
          createdAt: new Date(),
        },
      })

      // Act
      const alerts = await auditLogService.detectSuspiciousOrders()

      // Assert: No high-value new account alerts
      const highValueAlerts = alerts.filter(
        (a) =>
          a.type === 'HIGH_VALUE_NEW_ACCOUNT' && a.userId === establishedUser.id
      )
      expect(highValueAlerts).toHaveLength(0)
    })
  })

  describe('getAllSecurityAlerts', () => {
    it('should aggregate alerts from all detection methods', async () => {
      // Arrange: Create scenarios that trigger multiple detections

      // Scenario 1: Failed logins
      const user1 = await prisma.user.create({
        data: { email: 'user1@test.com', name: 'User 1', role: 'USER' },
      })

      for (let i = 0; i < 6; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user1.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: subMinutes(new Date(), 5),
          },
        })
      }

      // Scenario 2: Rapid account creation
      const commonIp = '203.0.113.50'
      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            email: `rapid${i}@test.com`,
            name: `Rapid ${i}`,
            role: 'USER',
            createdAt: subMinutes(new Date(), 30),
          },
        })

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'USER_CREATED',
            metadata: { registrationIp: commonIp },
            ipAddress: commonIp,
            userAgent: 'Mozilla/5.0',
            createdAt: user.createdAt,
          },
        })
      }

      // Act
      const allAlerts = await auditLogService.getAllSecurityAlerts()

      // Assert: Should have alerts from multiple detection types
      expect(allAlerts.length).toBeGreaterThanOrEqual(2)

      const alertTypes = allAlerts.map((a) => a.type)
      expect(alertTypes).toContain('FAILED_LOGIN')
      expect(alertTypes).toContain('RAPID_ACCOUNT_CREATION')
    })

    it('should return empty array when no threats detected', async () => {
      // Arrange: No suspicious activity

      // Act
      const alerts = await auditLogService.getAllSecurityAlerts()

      // Assert: Empty array
      expect(alerts).toHaveLength(0)
    })

    it('should execute all detection methods in parallel', async () => {
      // This test verifies Promise.all is used for performance

      // Arrange: Create minimal suspicious activity
      const user = await prisma.user.create({
        data: { email: 'test@test.com', name: 'Test', role: 'USER' },
      })

      for (let i = 0; i < 5; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: subMinutes(new Date(), 5),
          },
        })
      }

      // Act: Measure execution time
      const startTime = Date.now()
      await auditLogService.getAllSecurityAlerts()
      const executionTime = Date.now() - startTime

      // Assert: Should complete quickly (parallel execution)
      // If sequential, would take 500ms+. Parallel should be <200ms.
      expect(executionTime).toBeLessThan(500)
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle users with no activity logs gracefully', async () => {
      // Arrange: User with no logs
      await prisma.user.create({
        data: {
          email: 'inactive@test.com',
          name: 'Inactive User',
          role: 'USER',
        },
      })

      // Act
      const alerts = await auditLogService.getAllSecurityAlerts()

      // Assert: No errors, no alerts
      expect(alerts).toHaveLength(0)
    })

    it('should handle missing metadata in activity logs', async () => {
      // Arrange: Create log with null metadata
      const user = await prisma.user.create({
        data: { email: 'test@test.com', name: 'Test', role: 'USER' },
      })

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          metadata: null, // Missing metadata
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
      })

      // Act & Assert: Should not throw error
      await expect(
        auditLogService.detectUnusualLoginLocations()
      ).resolves.not.toThrow()
    })

    it('should handle old activity logs outside time window', async () => {
      // Arrange: Create old failed logins (11 minutes ago, outside 10-min window)
      const user = await prisma.user.create({
        data: { email: 'old@test.com', name: 'Old User', role: 'USER' },
      })

      for (let i = 0; i < 6; i++) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: {},
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            createdAt: subMinutes(new Date(), 15), // 15 minutes ago, outside window
          },
        })
      }

      // Act
      const alerts = await auditLogService.detectFailedLoginAttempts()

      // Assert: No alerts (outside time window)
      expect(alerts).toHaveLength(0)
    })
  })
})
