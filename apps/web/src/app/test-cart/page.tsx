'use client'

import { useCart } from '~/hooks/use-cart'
import { addItemOptimistic } from '~/store/slices/cartSlice'

export default function TestCartPage() {
  const { items, total, itemCount, dispatch } = useCart()

  const handleTestAdd = () => {
    dispatch(
      addItemOptimistic({
        item: {
          id: 'test-1',
          userId: 'user-1',
          productId: 'prod-1',
          quantity: 2,
          createdAt: new Date().toISOString(), // ✅ ISO string, not Date object
          updatedAt: new Date().toISOString(), // ✅ ISO string, not Date object
          product: {
            id: 'prod-1',
            name: 'Test Product',
            slug: 'test-product',
            sku: 'TEST-PROD-001',
            description: 'Test description',
            price: 2999, // $29.99
            comparePrice: null,
            images: [], // Product schema uses images array
            inventory: 100, // Product schema uses inventory, not stock
            status: 'ACTIVE' as const, // Product schema uses status enum
            categoryId: 'cat-1',
            createdAt: new Date().toISOString(), // ✅ ISO string
            updatedAt: new Date().toISOString(), // ✅ ISO string
          },
        },
      })
    )
  }

  return (
    <div className="p-8">
      <h1>Redux Cart Test</h1>
      <p>Items: {itemCount}</p>
      <p>Total: ${total / 100}</p>
      <button
        onClick={handleTestAdd}
        className="bg-blue-500 text-white px-4 py-2"
      >
        Test Add Item
      </button>
      <pre>{JSON.stringify(items, null, 2)}</pre>
    </div>
  )
}
