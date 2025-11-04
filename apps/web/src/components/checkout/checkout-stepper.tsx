import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'

interface CheckoutStepperProps {
  currentStep: 'shipping' | 'payment' | 'confirmation'
}

const steps = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirmation', label: 'Confirmation' },
]

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center justify-center px-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-colors',
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-50 text-gray-500'
              )}
            >
              {index < currentIndex ? (
                <Check className="h-5 w-5 sm:h-5 sm:w-5" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-xs sm:text-sm mt-1 sm:mt-2 text-center max-w-[60px] sm:max-w-none',
                index <= currentIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-12 sm:w-20 md:w-24 h-1 mx-2 sm:mx-4 transition-colors',
                index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
