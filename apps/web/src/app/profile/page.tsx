import { ProfileForm } from '@/components/auth/profile-form'
import { ChangePasswordForm } from '@/components/auth/change-password-form'
import { RequireAuth } from '@/components/auth/protected-route'

export default function ProfilePage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <ProfileForm />
          <ChangePasswordForm />
        </div>
      </div>
    </RequireAuth>
  )
}
