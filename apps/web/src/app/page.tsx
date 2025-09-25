'use client'

import { api } from '~/utils/api'
import { useAppSelector, useAppDispatch } from '~/store'
import { setTheme } from '~/store/slices/appSlice'

export default function HomePage() {
  const { data: ping, isLoading } = api.health.ping.useQuery()
  const { data: echo } = api.health.echo.useQuery({
    text: 'Hello tRPC!',
  })

  const { theme, isLoading: appLoading } = useAppSelector((state) => state.app)
  const dispatch = useAppDispatch()

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4 text-blue-500">
        DevMart Pro Foundation Test
      </h1>

      {/* tRPC Test */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">tRPC API Layer</h2>
        <p>Ping: {ping?.message}</p>
        <p>Echo: {echo?.echo}</p>
      </div>

      {/* Redux Test */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Redux Store</h2>
        <p>Current Theme: {theme}</p>
        <p>App loading: {appLoading.toString()}</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={toggleTheme}
        >
          Toggle Theme
        </button>
      </div>
    </div>
  )
}
