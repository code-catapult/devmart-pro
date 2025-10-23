'use client'

import { ImageUpload } from '~/components/admin/ImageUpload'
import { useState } from 'react'

export default function TestPage() {
  const [images, setImages] = useState<string[]>([])

  return (
    <div className="p-8">
      <ImageUpload value={images} onChange={setImages} maxImages={5} />
      <pre className="mt-4">{JSON.stringify(images, null, 2)}</pre>
    </div>
  )
}
