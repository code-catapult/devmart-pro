'use client'

import Image from 'next/image'
import { useState } from 'react'

interface ProductImageProps {
  src: string
  alt: string
}

export function ProductImage({ src, alt }: ProductImageProps) {
  const [imageSrc, setImageSrc] = useState(src)

  return (
    <div className="relative w-16 h-16 rounded bg-gray-100 flex-shrink-0">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        unoptimized
        sizes="64px"
        className="object-cover rounded"
        onError={() => setImageSrc('/placeholder.jpg')}
      />
    </div>
  )
}
