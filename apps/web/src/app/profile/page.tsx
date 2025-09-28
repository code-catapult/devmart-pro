import { ProfileForm } from '@/components/auth/profile-form'
import { RequireAuth } from '@/components/auth/protected-route'

export default function ProfilePage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>
          <ProfileForm />
        </div>
      </div>
    </RequireAuth>
  )
}
