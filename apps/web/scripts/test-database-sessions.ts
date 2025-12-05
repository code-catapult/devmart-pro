import { prisma } from '../src/lib/prisma'

async function testDatabaseSessions() {
  try {
    console.log('🔗 Testing database authentication integration...')

    // Test database connection
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected. Users: ${userCount}`)

    // Test authentication tables exist and functionality
    console.log('📊 Testing authentication tables...')

    // Test account table
    const accountCount = await prisma.account.count()
    console.log(`✅ Account table accessible. Accounts: ${accountCount}`)

    // If there are accounts, show some details (without sensitive data)
    if (accountCount > 0) {
      const recentAccounts = await prisma.account.findMany({
        take: 3,
        select: {
          provider: true,
          type: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })
      console.log('📋 Recent accounts:')
      recentAccounts.forEach((account, index) => {
        console.log(
          `  ${index + 1}. User: ${account.user.email} | Provider: ${account.provider} | Type: ${account.type}`
        )
      })
    }

    // Show user authentication info
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 3,
        select: {
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      })
      console.log('📋 Recent users:')
      users.forEach((user, index) => {
        console.log(
          `  ${index + 1}. Email: ${user.email} | Role: ${user.role} | Verified: ${user.emailVerified ? 'Yes' : 'No'}`
        )
      })
    }

    console.log('✅ Database authentication integration working!')
    console.log(
      'ℹ️  Note: Using JWT + Redis for session management (not database sessions)'
    )
  } catch (error) {
    console.error('❌ Database authentication test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseSessions()
