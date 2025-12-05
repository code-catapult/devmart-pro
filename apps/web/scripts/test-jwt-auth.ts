import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables explicitly
// Note: Prisma also loads env vars, but being explicit is better for clarity
config({ path: resolve(__dirname, '../.env.local') })

import { prisma } from '../src/lib/prisma'
import jwt from 'jsonwebtoken'

async function testJWTAuth() {
  try {
    console.log('🔗 Testing JWT authentication integration...')

    // Test database connection for user data
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected. Users: ${userCount}`)

    // Test JWT configuration
    console.log('🔑 Testing JWT configuration...')
    const jwtSecret = process.env.NEXTAUTH_SECRET
    if (jwtSecret) {
      console.log('✅ JWT secret configured')
    } else {
      console.log('❌ JWT secret missing')
    }

    // Test sample JWT creation (mock)
    console.log('📝 Testing JWT token creation...')
    if (jwtSecret) {
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        role: 'USER',
      }

      const token = jwt.sign(mockUser, jwtSecret, { expiresIn: '24h' })
      console.log('✅ JWT token created successfully')

      // Test token verification
      const decoded = jwt.verify(token, jwtSecret)
      console.log('✅ JWT token verification working')
    }

    // Test user model for authentication data
    console.log('👤 Testing user authentication data...')
    if (userCount > 0) {
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
        },
      })
      console.log(
        `✅ User authentication data accessible: ${sampleUsers.length} users`
      )
    }

    console.log('✅ JWT authentication integration working!')
  } catch (error) {
    console.error('❌ JWT authentication test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testJWTAuth()
