'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '~/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

/**
 * ImageUpload Component (ENHANCED)
 *
 * ✨ ENHANCEMENTS:
 * - Drag-and-drop with visual feedback
 * - Upload progress tracking per image
 * - Error handling with retry
 * - Image preview with remove
 * - Client-side validation (type, size)
 */
export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Clear previous errors
      setErrors({})

      // Validate max images
      if (value.length + acceptedFiles.length > maxImages) {
        setErrors({
          general: `Maximum ${maxImages} images allowed`,
        })
        return
      }

      // Accumulate uploaded URLs locally to avoid race conditions
      const uploadedUrls: string[] = []

      // Process each file
      for (const file of acceptedFiles) {
        const fileId = `${file.name}-${Date.now()}`

        try {
          // Validate file size (5MB)
          if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
              ...prev,
              [fileId]: 'File too large (max 5MB)',
            }))
            continue
          }

          // Validate file type
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setErrors((prev) => ({
              ...prev,
              [fileId]: 'Invalid file type (JPEG, PNG, WebP only)',
            }))
            continue
          }

          setUploading((prev) => ({ ...prev, [fileId]: 0 }))

          // Step 1: Request presigned URL
          const presignedResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
            }),
          })

          if (!presignedResponse.ok) {
            throw new Error('Failed to get upload URL')
          }

          const { uploadUrl, fileUrl } = await presignedResponse.json()

          // Step 2: Upload to S3 with progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100
                setUploading((prev) => ({ ...prev, [fileId]: progress }))
              }
            })

            xhr.addEventListener('load', () => {
              if (xhr.status === 200) {
                resolve()
              } else {
                reject(new Error('Upload failed'))
              }
            })

            xhr.addEventListener('error', () => {
              reject(new Error('Network error'))
            })

            xhr.open('PUT', uploadUrl)
            xhr.setRequestHeader('Content-Type', file.type)
            xhr.send(file)
          })

          // Step 3: Add URL to local array
          uploadedUrls.push(fileUrl)

          // Clear upload state
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
    [value, onChange, maxImages]
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
      {/* Image Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
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
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
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
              className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {value.length < maxImages && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? 'Drop images here...'
              : 'Drag & drop images, or click to select'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            JPEG, PNG, WebP (max 5MB, {maxImages - value.length} remaining)
          </p>
        </div>
      )}
    </div>
  )
}
