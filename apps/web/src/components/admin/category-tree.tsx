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
    <div className="select-none">
      {/* Category Row - Grid layout keeps right elements fixed */}
      <div
        className="group grid items-center gap-2 rounded-md py-2.5 px-3 md:py-2 hover:bg-gray-50 min-h-[48px] md:min-h-0 touch-manipulation"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) auto auto',
        }}
      >
        {/* Left Section: Expand button + Category Name (can shrink/truncate) */}
        <div
          className="flex items-center gap-2 min-w-0"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {/* Expand/Collapse Button - Touch-friendly size on mobile */}
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 md:h-5 md:w-5 items-center justify-center rounded hover:bg-gray-200 touch-manipulation shrink-0"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronDown className="h-5 w-5 md:h-4 md:w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-5 w-5 md:h-4 md:w-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="h-8 w-8 md:h-5 md:w-5 shrink-0" /> // Spacer for alignment
          )}

          {/* Category Name - Truncates when too long */}
          <span className="font-medium text-gray-900 text-sm md:text-base truncate">
            {category.name}
          </span>
        </div>

        {/* Product Count Badge - Fixed to right */}
        <Badge
          variant="secondary"
          className="text-xs bg-gray-500 text-gray-50 shrink-0"
        >
          {category._count.products}
        </Badge>

        {/* Action Buttons - Fixed to right, always visible on mobile, hover on desktop */}
        <div className="flex gap-1.5 md:gap-1 opacity-100 md:opacity-20 transition-opacity md:group-hover:opacity-100 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            className="h-9 w-9 md:h-6 md:w-6 p-0 text-gray-600 hover:bg-gray-100 touch-manipulation"
            aria-label={`Edit ${category.name}`}
          >
            <Edit className="h-4 w-4 md:h-3 md:w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(category.id)}
            className="h-9 w-9 md:h-6 md:w-6 p-0 text-gray-600 hover:bg-gray-100 touch-manipulation"
            aria-label={`Add child to ${category.name}`}
          >
            <Plus className="h-4 w-4 md:h-3 md:w-3" />
          </Button>

          {/* We wrap this button in a span because disabled buttons often don't trigger the title tooltip in many browsers */}
          <span title={getDeleteTooltip()} className="inline-block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category.id)}
              className="h-9 w-9 md:h-6 md:w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 touch-manipulation"
              aria-label={`Delete ${category.name}`}
              disabled={isDeleteDisabled}
            >
              <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
            </Button>
          </span>
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
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 px-4">
        <p className="text-gray-500 text-center">No categories yet</p>
        <Button
          onClick={() => onAddChild(null)}
          className="mt-4 h-11 md:h-10 touch-manipulation"
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
      <div className="p-2 md:p-4">
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
          className="w-full h-11 md:h-10 touch-manipulation"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Root Category
        </Button>
      </div>
    </div>
  )
}
