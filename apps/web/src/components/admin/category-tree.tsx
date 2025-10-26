'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Edit, Plus, Trash2 } from 'lucide-react'
import { Badge, Button } from '@repo/ui'
import type { Category } from '@prisma/client'

/**
 * CategoryTreeNode
 *
 * Recursive component that renders a single category and its children.
 * Uses recursion to handle unlimited nesting depth.
 *
 * Features:
 * - Expand/collapse children
 * - Product count display
 * - Edit, Add Child, Delete actions
 * - Visual hierarchy (indentation)
 * - Recursive rendering for children
 *
 * @param category - Category with children and product count
 * @param depth - Current nesting depth (for indentation)
 * @param onEdit - Callback when edit clicked
 * @param onAddChild - Callback when add child clicked
 * @param onDelete - Callback when delete clicked
 */

interface CategoryWithRelations extends Category {
  children: CategoryWithRelations[]
  _count: {
    products: number
  }
}

interface CategoryTreeNodeProps {
  category: CategoryWithRelations
  depth?: number
  onEdit: (category: CategoryWithRelations) => void
  onAddChild: (parentId: string) => void
  onDelete: (categoryId: string) => void
}

function CategoryTreeNode({
  category,
  depth = 0,
  onEdit,
  onAddChild,
  onDelete,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = category.children && category.children.length > 0
  const isDeleteDisabled = category._count.products > 0 || hasChildren

  // Generate tooltip message for disabled delete button
  const getDeleteTooltip = () => {
    if (!isDeleteDisabled) return undefined

    const reasons = []
    if (category._count.products > 0) {
      reasons.push(
        `${category._count.products} product${category._count.products > 1 ? 's' : ''}`
      )
    }
    if (hasChildren) {
      reasons.push(
        `${category.children.length} subcategor${category.children.length > 1 ? 'ies' : 'y'}`
      )
    }

    return `Cannot delete: has ${reasons.join(' and ')}`
  }

  return (
    <div className="select-none bg-blue-50">
      {/* Category Row */}
      <div
        className="group flex items-center gap-2 rounded-md py-2 px-3 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        ) : (
          <div className="h-5 w-5" /> // Spacer for alignment
        )}

        {/* Category Name */}
        <span className="flex-1 font-medium text-gray-900">
          {category.name}
        </span>

        <div>
          {/* Product Count Badge */}
          <Badge
            variant="secondary"
            className="text-xs bg-gray-500 text-gray-50 mb-2 mt-6"
          >
            {category._count.products} products
          </Badge>

          {/* Action Buttons (show on hover) */}
          <div className="flex gap-3 opacity-20 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              className="h-4 w-4 p-0 text-gray-600"
              aria-label={`Edit ${category.name}`}
            >
              <Edit className="h-1 w-1" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(category.id)}
              className="h-4 w-4 p-0 bg-gray-700"
              aria-label={`Add child to ${category.name}`}
            >
              <Plus className="h-1 w-1" />
            </Button>
            {/* We wrap this button in a span because disabled buttons often don't trigger the title tooltip in many browsers */}
            <span title={getDeleteTooltip()} className="inline-block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(category.id)}
                className="h-4 w-4 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${category.name}`}
                disabled={isDeleteDisabled}
              >
                <Trash2 className="h-1 w-1" />
              </Button>
            </span>
          </div>
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * CategoryTree
 *
 * Main category tree component that renders root categories
 * and manages tree-wide state.
 *
 * @param categories - Root categories (parentId = null)
 * @param onEdit - Edit category callback
 * @param onAddChild - Add child category callback
 * @param onDelete - Delete category callback
 */

interface CategoryTreeProps {
  categories: CategoryWithRelations[]
  onEdit: (category: CategoryWithRelations) => void
  onAddChild: (parentId: string | null) => void
  onDelete: (categoryId: string) => void
}

export function CategoryTree({
  categories,
  onEdit,
  onAddChild,
  onDelete,
}: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
        <p className="text-gray-500">No categories yet</p>
        <Button
          onClick={() => onAddChild(null)}
          className="mt-4"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create First Category
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="p-4">
        {categories.map((category) => (
          <CategoryTreeNode
            key={category.id}
            category={category}
            depth={0}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="border-t p-4">
        <Button
          onClick={() => onAddChild(null)}
          variant="outline"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Root Category
        </Button>
      </div>
    </div>
  )
}
