import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/lib/auth'
import { ThemeToggle } from '~/components/settings/theme-toggle'
import { Route } from 'next'

/**
 * User Settings Page
 *
 * Allows authenticated users to configure their preferences.
 */
export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login' as Route)
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Manage your account preferences and settings
        </p>
      </div>

      <div className="space-y-6">
        <ThemeToggle />

        {/* Future settings sections can be added here */}
      </div>
    </div>
  )
}
