'use client'

import { api } from '~/utils/api'

export default function HomePage() {
  const { data: ping, isLoading, error: pingError } = api.health.ping.useQuery()
  const { data: echo, error: echoError } = api.health.echo.useQuery({
    text: 'Hello tRPC!',
  })

  if (isLoading) return <div>Loading...</div>

  console.log('Debug - ping data:', ping)
  console.log('Debug - echo data:', echo)
  console.log('Debug - ping error:', pingError)
  console.log('Debug - echo error:', echoError)

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4 text-blue-500">tRPC Test</h1>
      <p>Ping: {ping?.message}</p>
      <p>{ping?.timestamp}</p>
      <br />
      <h2 className="text-2xl font-semibold">Echo: {echo?.echo}</h2>
    </div>
  )
}
