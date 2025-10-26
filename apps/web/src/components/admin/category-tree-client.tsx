'use client'

import { useState } from 'react'
import { CategoryTree } from './category-tree'
import { CategoryFormDialog } from './category-form-dialog'
import { api } from '~/utils/api'
import { toast } from 'sonner'
import type { Category } from '@prisma/client'

interface CategoryWithRelations extends Category {
  children: CategoryWithRelations[]
  _count: {
    products: number
  }
}

export function CategoryTreeClient({
  initialCategories,
}: {
  initialCategories: CategoryWithRelations[]
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithRelations | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)

  const utils = api.useUtils()

  // Fetch categories with auto-refresh
  const { data: categories } = api.admin.categories.getTree.useQuery(
    undefined,
    {
      initialData: initialCategories,
    }
  )

  const deleteMutation = api.admin.categories.delete.useMutation({
    onSuccess: () => {
      toast.success('Category deleted')
      utils.admin.categories.getTree.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`)
    },
  })

  const handleEdit = (category: CategoryWithRelations) => {
    setEditingCategory(category)
    setParentId(category.parentId)
    setFormOpen(true)
  }

  const handleAddChild = (parentCategoryId: string | null) => {
    setEditingCategory(null)
    setParentId(parentCategoryId)
    setFormOpen(true)
  }

  const handleDelete = (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate({ id: categoryId })
    }
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    setEditingCategory(null)
    setParentId(null)
    utils.admin.categories.getTree.invalidate()
  }

  return (
    <>
      <CategoryTree
        categories={categories || []}
        onEdit={handleEdit}
        onAddChild={handleAddChild}
        onDelete={handleDelete}
      />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        parentId={parentId}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
