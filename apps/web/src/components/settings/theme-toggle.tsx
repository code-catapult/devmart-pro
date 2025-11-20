'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { api } from '~/utils/api'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui'

import { useRouter } from 'next/navigation'

/**
 * ThemeToggle Component
 *
 * Allows users to choose between Light, Dark, and System themes.
 * Persists choice to database and applies globally.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const updatePreferences = api.user.updatePreferences.useMutation()

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Avoid SSR mismatch
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)

    // Persist to database
    await updatePreferences.mutateAsync({
      theme: newTheme.toUpperCase() as 'LIGHT' | 'DARK' | 'SYSTEM',
    })
  }

  const handleBack = () => {
    router.back()
  }

  const themes = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Bright and clear',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Easy on the eyes',
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
      description: 'Matches your device',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Preference</CardTitle>
        <CardDescription>
          Choose how DevMart looks to you. Select a single theme, or sync with
          your system and automatically switch between day and night themes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map((t) => {
            const Icon = t.icon
            const isActive = theme === t.value

            return (
              <Button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`
                  relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                  min-h-[140px] sm:min-h-[160px] cursor-pointer
                  ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-blue-600 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <Icon
                  className={`h-8 w-8 mb-3 ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />

                <div className="text-center">
                  <div
                    className={`font-semibold mb-1 ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {t.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.description}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>

        {updatePreferences.isSuccess && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
            ✓ Theme preference saved successfully
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="mt-6">
          <Button asChild variant="secondary" onClick={handleBack}>
            <span className="cursor-pointer">go back</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
