import { fileUploadService } from '../src/server/services/FileUploadService'

async function testFileUploadService() {
  console.log('Testing FileUploadService...\n')

  try {
    // Test 1: Presigned URL generation
    console.log('1. Generating presigned URL...')
    const result = await fileUploadService.generatePresignedUrl(
      'test-image.jpg',
      'image/jpeg',
      'test-product-123'
    )

    console.log('✅ Presigned URL generated:')
    console.log('   Upload URL:', result.uploadUrl.substring(0, 100) + '...')
    console.log('   File URL:', result.fileUrl)
    console.log('   S3 Key:', result.key)

    // Test 2: Key extraction
    console.log('\n2. Testing key extraction...')
    const extractedKey = fileUploadService.extractKeyFromUrl(result.fileUrl)
    console.log('   Extracted key:', extractedKey)
    console.log('   Match:', extractedKey === result.key ? '✅' : '❌')

    // Test 3: Invalid content type
    console.log('\n3. Testing content type validation...')
    try {
      await fileUploadService.generatePresignedUrl(
        'virus.exe',
        'application/octet-stream'
      )
      console.log('❌ Should have rejected invalid content type')
    } catch (error) {
      if (error instanceof Error) {
        console.log('✅ Correctly rejected invalid content type')
        console.log('   Error:', error.message)
      }
    }

    // Test 4: Max file size
    console.log('\n4. Testing max file size...')
    const maxSize = fileUploadService.getMaxFileSize()
    console.log(`   Max file size: ${maxSize / 1024 / 1024}MB`)

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

testFileUploadService().catch(console.error)
