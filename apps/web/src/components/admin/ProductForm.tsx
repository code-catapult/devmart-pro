'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ProductStatus } from '@repo/shared/types'
import {
  Button,
  Input,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui'

import { ImageUpload } from './ImageUpload'
import { Loader2 } from 'lucide-react'

/**
 * Product Form Schema
 *
 * Client-side validation schema (mirrors server-side productCreateSchema).
 * Zod validates before submission, preventing invalid data from reaching API.
 */
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Name too long'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long'),
  price: z
    .number({ message: 'Price must be a number' })
    .min(0, 'Price cannot be negative')
    .transform((val) => Math.round(val * 100)), // Convert dollars to cents
  inventory: z
    .number({ message: 'Inventory must be a number' })
    .int('Inventory must be a whole number')
    .min(0, 'Inventory cannot be negative'),
  categoryId: z.string().min(1, 'Category is required'),
  images: z
    .array(z.url('Invalid image URL'))
    .min(1, 'At least one image required')
    .max(5, 'Maximum 5 images allowed'),
  status: z.enum(ProductStatus),
  slug: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormProps {
  initialData?: Partial<ProductFormValues>
  onSubmit: (data: ProductFormValues) => Promise<void>
  isSubmitting?: boolean
  categories: Array<{ id: string; name: string }>
}

/**
 * ProductForm Component
 *
 * Reusable form for creating and editing products.
 * Uses React Hook Form for performance and Zod for validation.
 *
 * Features:
 * - Uncontrolled inputs (no re-renders on typing)
 * - Schema validation (client and server consistency)
 * - Image upload with preview
 * - Category selection
 * - Price input (dollars) → converted to cents
 * - Accessible (ARIA labels, error announcements)
 */
export function ProductForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  categories,
}: ProductFormProps) {
  // Initialize form with React Hook Form + Zod
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price ? initialData.price / 100 : 0, // Convert cents to dollars for display
      inventory: initialData?.inventory || 0,
      categoryId: initialData?.categoryId || '',
      images: initialData?.images || [],
      status: initialData?.status || 'ACTIVE',
      slug: initialData?.slug || '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Product Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Apple MacBook Pro 16-inch" {...field} />
              </FormControl>
              <FormDescription>
                Customer-facing product name (max 200 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed product description..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Detailed description with features and specifications (10-5000
                characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price and Inventory (Row) */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Price */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="999.99"
                      className="pl-7"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Price in dollars (stored as cents)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Inventory */}
          <FormField
            control={form.control}
            name="inventory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormDescription>Available stock count</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Product category for organization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Images */}
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Images</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  maxImages={5}
                />
              </FormControl>
              <FormDescription>
                Upload 1-5 product images (max 5MB each, JPEG/PNG/WebP)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Product availability status (ACTIVE = visible to customers)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug (Optional) */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="apple-macbook-pro-16" {...field} />
              </FormControl>
              <FormDescription>
                Custom URL slug (auto-generated from name if left empty)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
