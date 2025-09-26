import { createTRPCReact } from '@trpc/react-query'
import { type AppRouter } from '~/server/api/root'

// Enable our api to use React hooks for every procedure in the backend.
export const api = createTRPCReact<AppRouter>()
