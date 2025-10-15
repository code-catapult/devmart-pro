import Link from 'next/link'
import { Button } from '@repo/ui'

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The product you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/products">Browse All Products</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
