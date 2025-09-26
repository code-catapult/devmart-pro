import { prisma } from '../src/lib/prisma'

async function testConnection() {
  try {
    // Test basic connection
    const healthCheck = await prisma.healthCheck.findFirst()
    console.log('✅ Database connection successful')
    console.log('Health check result:', healthCheck)

    // Test creating a record
    const testRecord = await prisma.healthCheck.create({
      data: { status: 'prisma-test' },
    })
    console.log('✅ Database write successful')
    console.log('Test record:', testRecord)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
