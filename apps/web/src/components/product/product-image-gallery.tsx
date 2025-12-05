'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '~/lib/utils'
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@repo/ui'
import { ZoomIn } from 'lucide-react'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const mainImage = images[selectedImage] || '/placeholder-product.jpg'

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-zoom-in"
        onClick={() => setIsZoomOpen(true)}
      >
        <Image
          src={mainImage}
          alt={`${productName} - Image ${selectedImage + 1}`}
          fill
          className="object-cover"
          priority={selectedImage === 0} // Prioritize first image
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
        />

        {/* Zoom Icon Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white rounded-full p-3">
              <ZoomIn className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                selectedImage === index
                  ? 'border-primary'
                  : 'border-transparent hover:border-gray-300'
              )}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 12vw"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-7xl" aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <DialogTitle>{productName} - Zoomed Image</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative aspect-square w-full">
            <Image
              src={mainImage}
              alt={`${productName} - Zoomed`}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
