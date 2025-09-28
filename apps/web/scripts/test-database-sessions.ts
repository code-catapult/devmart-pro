import { prisma } from '../src/lib/prisma'

async function testDatabaseSessions() {
  try {
    console.log('🔗 Testing database session integration...')

    // Test database connection
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected. Users: ${userCount}`)

    // Test session tables exist and functionality
    console.log('📊 Testing session tables...')
    const sessionCount = await prisma.session.count()
    console.log(`✅ Session table accessible. Sessions: ${sessionCount}`)

    // Test account table
    const accountCount = await prisma.account.count()
    console.log(`✅ Account table accessible. Accounts: ${accountCount}`)

    // Test verification token table
    const verificationTokenCount = await prisma.verificationToken.count()
    console.log(
      `✅ Verification token table accessible. Tokens: ${verificationTokenCount}`
    )

    // If there are sessions, show some details (without sensitive data)
    if (sessionCount > 0) {
      const recentSessions = await prisma.session.findMany({
        take: 3,
        orderBy: { expires: 'desc' },
        select: {
          userId: true,
          expires: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })
      console.log('📋 Recent sessions:')
      recentSessions.forEach((session, index) => {
        console.log(
          `  ${index + 1}. User: ${session.user.email} | Expires: ${session.expires}`
        )
      })
    }

    console.log('✅ Database session integration working!')
  } catch (error) {
    console.error('❌ Database session test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseSessions()
