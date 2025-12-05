import { Badge } from '@repo/ui'
import { PackageCheck, PackageX, Package, AlertTriangle } from 'lucide-react'

/**
 * StockLevelBadge
 *
 * Visual indicator for inventory levels with color-coding and icons.
 *
 * Thresholds:
 * - Out of Stock (0): Red
 * - Low Stock (1-10): Yellow
 * - Medium Stock (11-50): Blue
 * - High Stock (>50): Green
 *
 * @param inventory - Current inventory count
 */

interface StockLevelBadgeProps {
  inventory: number
}

export function StockLevelBadge({ inventory }: StockLevelBadgeProps) {
  if (inventory === 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <PackageX className="h-3 w-3" />
        Out of Stock
      </Badge>
    )
  }

  if (inventory <= 10) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Low ({inventory})
      </Badge>
    )
  }

  if (inventory <= 50) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Package className="h-3 w-3" />
        {inventory} units
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="gap-1">
      <PackageCheck className="h-3 w-3" />
      {inventory} units
    </Badge>
  )
}
