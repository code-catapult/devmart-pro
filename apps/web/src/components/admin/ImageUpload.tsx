'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { api } from '~/utils/api'
import { cn } from '@repo/shared/utils'

interface ImageUploadProps {
  value: string[] // Array of image URLs
  onChange: (urls: string[]) => void
  maxImages?: number
}

/**
 * ImageUpload Component
 *
 * Multi-image upload with drag-and-drop, preview, and removal.
 * Uploads directly to S3 using presigned URLs (no server proxy).
 *
 * Features:
 * - Direct S3 upload via presigned URLs
 * - Parallel uploads (Promise.all)
 * - Client-side validation (type, size)
 * - Drag-and-drop (desktop) and click-to-select (mobile)
 * - Image preview grid (responsive)
 * - Remove images with confirmation
 * - Upload progress tracking
 * - Error handling with user feedback
 * - Mobile-optimized touch targets and layout
 */
export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<Record<string, number>>({}) // fileId -> progress %
  const [errors, setErrors] = useState<Record<string, string>>({}) // fileId -> error message

  // tRPC mutation to get presigned URL
  const getPresignedUrl = api.upload.getPresignedUrl.useMutation()

  /**
   * Validate file before upload
   * Prevents wasting bandwidth on invalid files
   */
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}. Only JPEG, PNG, and WebP allowed.`
    }

    const maxSizeBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSizeBytes) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(
        2
      )}MB. Maximum 5MB allowed.`
    }

    return null // Valid
  }

  /**
   * Upload file directly to S3 using presigned URL
   * Returns the final S3 URL
   */
  const uploadToS3 = useCallback(
    async (file: File, fileId: string): Promise<string | null> => {
      try {
        // Get presigned URL from server
        const { uploadUrl, fileUrl } = await getPresignedUrl.mutateAsync({
          filename: file.name,
          contentType: file.type,
        })

        // Upload directly to S3 with progress tracking
        const xhr = new XMLHttpRequest()

        return new Promise<string>((resolve, reject) => {
          // Track upload progress
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = (e.loaded / e.total) * 100
              setUploading((prev) => ({ ...prev, [fileId]: progress }))
            }
          })

          // Handle completion
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              // Use the fileUrl from the presigned URL response
              resolve(fileUrl)
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          // Handle errors
          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })

          // Send the file
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.send(file)
        })
      } catch (error) {
        throw error instanceof Error ? error : new Error('Upload failed')
      }
    },
    [getPresignedUrl]
  )

  /**
   * Handle dropped/selected files
   * Validates and uploads in parallel
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Check if max images exceeded
      if (value.length + acceptedFiles.length > maxImages) {
        alert(`Maximum ${maxImages} images allowed`)
        return
      }

      // Clear previous errors
      setErrors({})

      const uploadedUrls: string[] = []

      // Upload all files in parallel
      for (const file of acceptedFiles) {
        const fileId = `${file.name}-${Date.now()}`

        // Validate file
        const validationError = validateFile(file)
        if (validationError) {
          setErrors((prev) => ({ ...prev, [fileId]: validationError }))
          continue
        }

        // Upload file
        try {
          setUploading((prev) => ({ ...prev, [fileId]: 0 }))
          const url = await uploadToS3(file, fileId)

          if (url) {
            uploadedUrls.push(url)
          }

          // Remove from uploading state
          setUploading((prev) => {
            const newState = { ...prev }
            delete newState[fileId]
            return newState
          })
        } catch (error) {
          console.error('Upload error:', error)
          setErrors((prev) => ({
            ...prev,
            [fileId]:
              error instanceof Error
                ? error.message
                : 'Upload failed. Please try again.',
          }))

          setUploading((prev) => {
            const newState = { ...prev }
            delete newState[fileId]
            return newState
          })
        }
      }

      // Update form with all uploaded URLs at once
      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls])
      }
    },
    [value, onChange, maxImages, uploadToS3]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: maxImages - value.length,
    disabled: value.length >= maxImages,
  })

  const removeImage = (index: number) => {
    const newImages = [...value]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Image Previews - Mobile Optimized Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {value.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border"
            >
              <Image
                src={url}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Mobile-Optimized Remove Button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 sm:right-2 sm:top-2 rounded-full bg-destructive p-2 sm:p-1 text-destructive-foreground opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100 touch-manipulation"
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploading).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploading).map(([fileId, progress]) => (
            <div key={fileId} className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
                {Math.round(progress)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="space-y-2">
          {Object.entries(errors).map(([fileId, error]) => (
            <div
              key={fileId}
              className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area - Mobile Optimized */}
      {value.length < maxImages && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors touch-manipulation',
            'p-6 sm:p-8',
            'min-h-[140px] sm:min-h-[160px]',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mb-3 sm:mb-4 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />

          {/* Mobile-Friendly Text */}
          <p className="text-sm sm:text-base text-center font-medium text-muted-foreground">
            {isDragActive ? (
              'Drop images here...'
            ) : (
              <>
                <span className="hidden sm:inline">
                  Drag & drop images, or{' '}
                </span>
                <span className="sm:hidden">Tap to select images</span>
                <span className="hidden sm:inline">click to select</span>
              </>
            )}
          </p>

          <p className="mt-2 text-xs sm:text-sm text-center text-muted-foreground">
            JPEG, PNG, WebP • Max 5MB each • {maxImages - value.length}{' '}
            remaining
          </p>
        </div>
      )}
    </div>
  )
}
