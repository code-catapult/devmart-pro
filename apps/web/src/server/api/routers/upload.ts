import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { fileUploadService } from '~/server/services/FileUploadService'

/**
 * Upload Router
 *
 * Handles file upload operations via presigned URLs
 */
export const uploadRouter = createTRPCRouter({
  /**
   * Get presigned URL for S3 upload
   *
   * Returns a temporary upload URL that allows client-side direct upload to S3
   */
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        productId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { uploadUrl, fileUrl, key } =
        await fileUploadService.generatePresignedUrl(
          input.filename,
          input.contentType,
          input.productId
        )

      return {
        uploadUrl,
        fileUrl,
        key,
      }
    }),
})
