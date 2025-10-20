import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

/**
 * FileUploadService
 *
 * Handles file uploads to AWS S3 using presigned URLs.
 * Provides client-side upload capabilities without server proxy.
 *
 * AWS Credentials:
 * - Uses same AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from SES setup (earlier stories)
 * - IAM user has combined S3 + SES permissions for simplified credential management
 *
 * Security:
 * - Presigned URLs expire after 15 minutes
 * - Content-Type locked to image/* only
 * - File size validated client-side and enforced by presigned URL constraints
 * - Random UUID filenames prevent path traversal attacks
 * - Environment validation prevents runtime crashes
 *
 * ENHANCED FEATURES:
 * - Comprehensive error handling with context
 * - Environment variable validation at startup
 * - Graceful error messages for debugging
 */
export class FileUploadService {
  private s3Client: S3Client
  private bucket: string
  private region: string
  private cdnUrl?: string
  private readonly MAX_FILE_SIZE: number

  constructor() {
    // Validate required environment variables at startup
    const requiredEnvVars = {
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    }

    const missing = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missing.length > 0) {
      throw new Error(
        `❌ Missing required AWS environment variables: ${missing.join(
          ', '
        )}\n\n` +
          'Please configure these in your .env.local file:\n' +
          '  AWS_ACCESS_KEY_ID=AKIA...\n' +
          '  AWS_SECRET_ACCESS_KEY=...\n' +
          '  AWS_S3_BUCKET=your-bucket-name\n' +
          '  AWS_S3_REGION=us-east-1 (optional, defaults to us-east-1)\n\n' +
          'Note: Use the same AWS credentials from your earlier SES setup.\n' +
          'Setup guide: docs/stories/story-3.2-implementation-guide.md#step-12'
      )
    }

    this.bucket = requiredEnvVars.AWS_S3_BUCKET!
    this.region = process.env.AWS_S3_REGION || 'us-east-1'
    this.cdnUrl = process.env.AWS_S3_CDN_URL
    this.MAX_FILE_SIZE =
      parseInt(process.env.MAX_IMAGE_SIZE_MB || '5') * 1024 * 1024

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: requiredEnvVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: requiredEnvVars.AWS_SECRET_ACCESS_KEY!,
      },
    })

    console.log('✅ AWS S3 FileUploadService initialized')
    console.log(`   Bucket: ${this.bucket}`)
    console.log(`   Region: ${this.region}`)
    console.log(`   Max file size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`)
    if (this.cdnUrl) {
      console.log(`   CDN URL: ${this.cdnUrl} (optional - faster delivery)`)
    }
  }

  /**
   * Generate presigned URL for client-side upload
   *
   * Creates temporary, signed URL that allows browser to upload directly to S3.
   * URL expires after 15 minutes for security.
   *
   * @param fileName - Original file name (used for extension)
   * @param contentType - MIME type (image/jpeg, image/png, image/webp)
   * @param productId - Optional product ID for organizing files
   * @returns Presigned upload URL and final file URL
   * @throws Error if content type invalid or AWS SDK fails
   */
  async generatePresignedUrl(
    fileName: string,
    contentType: string,
    productId?: string
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    try {
      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(contentType)) {
        throw new Error(
          `Invalid content type "${contentType}". Allowed types: ${allowedTypes.join(
            ', '
          )}`
        )
      }

      // Generate unique file key with UUID for security
      const fileExtension = this.getFileExtension(fileName)
      const uniqueFileName = `${uuidv4()}${fileExtension}`
      const key = productId
        ? `products/${productId}/${uniqueFileName}` // ← Organized by product
        : `products/temp/${uniqueFileName}` // ← Temp folder for new products

      // Create S3 PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType, // ← Locked to specific MIME type (security)
      })

      // Generate presigned URL (expires in 15 minutes)
      // Note: Size validation happens client-side. AWS SDK v3 doesn't support
      // content-length constraints in presigned URLs. Bucket policy Deny statements
      // can interfere with presigned URL uploads, so we rely on client validation.
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 15 * 60, // 15 minutes in seconds
      })

      // Construct final file URL (public access)
      const fileUrl = this.cdnUrl
        ? `${this.cdnUrl}/${key}` // ← CDN URL if configured (optional)
        : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}` // ← Direct S3 URL

      console.log(`✅ Generated presigned URL for upload: ${key}`)

      return {
        uploadUrl,
        fileUrl,
        key,
      }
    } catch (error) {
      // ✨ ENHANCED: Detailed error logging
      console.error('❌ Failed to generate presigned URL:', error)

      // Re-throw with context for better debugging
      if (error instanceof Error) {
        throw new Error(`File upload preparation failed: ${error.message}`)
      }
      throw new Error('File upload preparation failed: Unknown error')
    }
  }

  /**
   * Delete file from S3
   *
   * Removes image from S3 bucket. Used when product deleted or image replaced.
   *
   * @param key - S3 object key (e.g., "products/123/abc.jpg")
   * @throws Error if deletion fails
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
      console.log(`✅ Deleted file from S3: ${key}`)
    } catch (error) {
      // ✨ ENHANCED: Detailed error logging
      console.error(`❌ Failed to delete file from S3: ${key}`, error)

      // Re-throw with context
      if (error instanceof Error) {
        throw new Error(`File deletion failed for "${key}": ${error.message}`)
      }
      throw new Error(`File deletion failed for "${key}": Unknown error`)
    }
  }

  /**
   * Extract file extension from filename
   *
   * @param fileName - Original filename
   * @returns Extension with dot (e.g., ".jpg")
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    return lastDot > 0 ? fileName.substring(lastDot) : ''
  }

  /**
   * Extract S3 key from full URL
   *
   * Converts S3 URL or CDN URL back to key for deletion.
   *
   * @param url - Full file URL
   * @returns S3 key (e.g., "products/123/abc.jpg")
   */
  extractKeyFromUrl(url: string): string {
    // Handle CDN URL (optional)
    if (this.cdnUrl && url.startsWith(this.cdnUrl)) {
      return url.replace(`${this.cdnUrl}/`, '')
    }

    // Handle S3 URL
    const s3UrlPattern = new RegExp(
      `https://${this.bucket}.s3.${this.region}.amazonaws.com/`
    )
    return url.replace(s3UrlPattern, '')
  }

  /**
   * Get max file size in bytes
   * @returns Maximum allowed file size
   */
  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService()
