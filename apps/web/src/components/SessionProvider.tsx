'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
// import { useEffect } from "react";
// import { useAppDispatch, useAppSelector } from "@/store";
// import { setUser, clearAuth, setLoading } from "@/store/slices/authSlice";

interface SessionProviderProps {
  children: React.ReactNode
}

function SessionSync() {
  // const dispatch = useAppDispatch();
  // const { user } = useAppSelector((state) => state.auth);

  // This component handles session synchronization
  // The actual sync logic is in the useAuth hook

  return null
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionSync />
      {children}
    </NextAuthSessionProvider>
  )
}
