'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui'

import { api } from '~/utils/api'
import { toast } from 'sonner'
import slugify from 'slugify'
import type { Category } from '@prisma/client'

/**
 * Category Form Validation Schema
 *
 * Validates category creation/update with:
 * - Name: Required, 1-100 characters
 * - Slug: Optional (auto-generated if not provided)
 * - Description: Optional, up to 500 characters
 * - Parent: Optional (null for root categories)
 */
const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long (max 100 characters)'),
  slug: z.string().optional(),
  description: z
    .string()
    .max(500, 'Description too long (max 500 characters)')
    .optional(),
  parentId: z.string().nullable().optional(),
})

type CategoryFormData = z.infer<typeof categoryFormSchema>

interface CategoryWithRelations extends Category {
  children: CategoryWithRelations[]
  _count: {
    products: number
  }
}

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryWithRelations | null // If provided, edit mode
  parentId?: string | null // Pre-selected parent
  onSuccess: () => void
}

/**
 * CategoryFormDialog
 *
 * Modal dialog for creating/editing categories.
 *
 * Features:
 * - Auto-slug generation from name
 * - Parent category selection with tree visualization
 * - Circular reference prevention
 * - Description optional field
 * - Create or update based on category prop
 *
 * Validation:
 * - Client-side: Zod schema validation
 * - Server-side: Circular reference check
 * - Database: Unique slug constraint
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentId: initialParentId,
  onSuccess,
}: CategoryFormDialogProps) {
  const isEditMode = !!category

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      parentId: initialParentId || category?.parentId || '',
    },
  })

  const utils = api.useUtils()

  // Fetch all categories for parent selection
  const { data: allCategories } = api.admin.categories.getTree.useQuery()

  // Create mutation
  const createMutation = api.admin.categories.create.useMutation({
    onSuccess: () => {
      toast.success('Category created')
      reset()
      onSuccess()
      void utils.admin.categories.getTree.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`)
    },
  })

  // Update mutation
  const updateMutation = api.admin.categories.update.useMutation({
    onSuccess: () => {
      toast.success('Category updated')
      onSuccess()
      void utils.admin.categories.getTree.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`)
    },
  })

  // Watch name field to auto-generate slug
  const nameValue = watch('name')
  const slugValue = watch('slug')

  useEffect(() => {
    // Only auto-generate slug if:
    // 1. Not in edit mode OR
    // 2. Slug is empty
    if (!isEditMode || !slugValue) {
      const autoSlug = slugify(nameValue, { lower: true, strict: true })
      setValue('slug', autoSlug)
    }
  }, [nameValue, isEditMode, slugValue, setValue])

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      reset({
        name: category?.name || '',
        slug: category?.slug || '',
        description: category?.description || '',
        parentId: initialParentId || category?.parentId || null,
      })
    }
  }, [open, category, initialParentId, reset])

  const onSubmit = (data: CategoryFormData) => {
    // Circular reference check (client-side)
    if (isEditMode && data.parentId === category.id) {
      toast.error('Category cannot be its own parent')
      return
    }

    if (isEditMode) {
      updateMutation.mutate({
        id: category.id,
        ...data,
        parentId: data.parentId ?? undefined,
      })
    } else {
      createMutation.mutate({
        name: data.name,
        slug: data.slug || slugify(data.name, { lower: true, strict: true }),
        parentId: data.parentId ?? undefined,
      })
    }
  }

  // Flatten category tree for dropdown
  const flattenCategories = (
    categories: CategoryWithRelations[],
    depth = 0
  ): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = []

    for (const cat of categories) {
      result.push({ id: cat.id, name: cat.name, depth })

      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, depth + 1))
      }
    }

    return result
  }

  const flatCategories = allCategories ? flattenCategories(allCategories) : []

  // Filter out current category and its descendants (prevent circular reference)
  const getDescendantIds = (cat: CategoryWithRelations): string[] => {
    const ids = [cat.id]
    if (cat.children) {
      for (const child of cat.children) {
        ids.push(...getDescendantIds(child))
      }
    }
    return ids
  }

  const excludedIds = isEditMode && category ? getDescendantIds(category) : []
  const availableCategories = flatCategories.filter(
    (cat) => !excludedIds.includes(cat.id)
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[500px] bg-card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl md:text-2xl">
              {isEditMode ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              {isEditMode
                ? 'Update category details below'
                : 'Create a new category to organize your products'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Electronics, Clothing"
                autoComplete="off"
                className="h-11 md:h-10 transition-colors bg-background hover:bg-accent/50 focus:bg-background"
              />
              {errors.name && (
                <p className="text-sm text-red-500 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Slug Field (read-only in create, editable in edit) */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                Slug
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (auto-generated)
                </span>
              </Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="electronics"
                readOnly={!isEditMode}
                className={`h-11 md:h-10 transition-colors ${
                  !isEditMode
                    ? 'bg-muted cursor-not-allowed'
                    : 'bg-background hover:bg-accent/50 focus:bg-background'
                }`}
              />
              {errors.slug && (
                <p className="text-sm text-red-500 font-medium">
                  {errors.slug.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                URL-friendly version of the name. Used in product URLs.
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description of this category"
                rows={3}
                className="min-h-[88px] transition-colors bg-background hover:bg-accent/50 focus:bg-background resize-none"
              />
              {errors.description && (
                <p className="text-sm text-red-500 font-medium">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Parent Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="parentId" className="text-sm font-medium">
                Parent Category
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Select
                value={watch('parentId') || 'none'}
                onValueChange={(value) =>
                  setValue('parentId', value === 'none' ? null : value)
                }
              >
                <SelectTrigger className="h-11 md:h-10 transition-colors bg-background hover:bg-accent/50">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="none" className="hover:bg-accent/50">
                    <span className="font-medium">None (Root Category)</span>
                  </SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="hover:bg-accent/50"
                    >
                      <span style={{ paddingLeft: `${cat.depth * 16}px` }}>
                        {cat.depth > 0 && '└─ '}
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditMode && excludedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Note: This category and its children are not available as
                  parent options (prevents circular references)
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="w-full sm:w-auto h-11 md:h-10 transition-colors hover:bg-accent/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto h-11 md:h-10 transition-colors"
            >
              {isPending
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Category'
                  : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
