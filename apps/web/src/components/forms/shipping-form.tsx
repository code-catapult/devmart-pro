'use client'

import { useForm, type ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'

const shippingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
  country: z.string().min(2, 'Country is required'),
})

export type ShippingFormData = z.infer<typeof shippingSchema>

interface ShippingFormProps {
  onSubmit: (data: ShippingFormData) => void
  initialValues?: ShippingFormData
}

const US_STATES = [
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'TX', label: 'Texas' },
  // ... add all states
]

export function ShippingForm({ onSubmit, initialValues }: ShippingFormProps) {
  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: initialValues || {
      name: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
    mode: 'onSubmit',
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 sm:space-y-6"
      >
        <div className="bg-gray-50 border rounded-lg p-4 sm:p-6 text-gray-800">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
            Shipping Address
          </h2>

          <div className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ShippingFormData, 'name'>
              }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address1"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ShippingFormData, 'address1'>
              }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Address Line 1
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St"
                      {...field}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address2"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ShippingFormData, 'address2'>
              }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Address Line 2 (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Apt 4B"
                      {...field}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<ShippingFormData, 'city'>
                }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="San Francisco"
                        {...field}
                        className="h-10 sm:h-11 text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<ShippingFormData, 'state'>
                }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      State
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-gray-700">
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<ShippingFormData, 'postalCode'>
                }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Postal Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="94102"
                        {...field}
                        className="h-10 sm:h-11 text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<ShippingFormData, 'country'>
                }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Country
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-gray-700">
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-gray-300 text-gray-700 h-11 sm:h-12 text-sm sm:text-base"
        >
          Continue to Payment
        </Button>
      </form>
    </Form>
  )
}
