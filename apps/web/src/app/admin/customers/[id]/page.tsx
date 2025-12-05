'use client'

import { useParams } from 'next/navigation'
import { api } from '@/utils/api'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'
import { CustomerOrderHistory } from '@/components/admin/customers/CustomerOrderHistory'
import { Route } from 'next'

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.id as string

  // Fetch customer details
  const {
    data: customer,
    isLoading,
    error,
  } = api.admin.customers.getCustomerById.useQuery({
    id: customerId,
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Customer Not Found</h2>
          <Button asChild variant="outline">
            <Link href={'/admin/customers' as Route}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={'/admin/customers' as Route}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-gray-500">
            Customer ID: {customer.id.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer.email}</p>
              </div>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.defaultAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Default Address</p>
                  <p className="font-medium">
                    {customer.defaultAddress.street},{' '}
                    {customer.defaultAddress.city}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order History Component */}
      <CustomerOrderHistory customerId={customerId} showHeader={true} />
    </div>
  )
}
