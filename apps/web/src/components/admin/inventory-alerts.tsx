'use client'

import { api } from '~/utils/api'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@repo/ui'
import { AlertTriangle } from 'lucide-react'

export function InventoryAlerts() {
  const { data: products, isLoading } =
    api.admin.getLowInventoryProducts.useQuery({ threshold: 10 })

  const getSeverity = (inventory: number) => {
    if (inventory === 0)
      return { label: 'Out of Stock', color: 'bg-red-500 text-white' }
    if (inventory <= 5)
      return { label: 'Critical', color: 'bg-red-100 text-red-800' }
    return { label: 'Low', color: 'bg-yellow-100 text-yellow-800' }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Low Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => {
              const severity = getSeverity(product.inventory)
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.category.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {product.inventory} left
                    </span>
                    <Badge className={severity.color}>{severity.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            All products have sufficient inventory
          </p>
        )}
      </CardContent>
    </Card>
  )
}
