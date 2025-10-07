import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { SessionProvider } from 'next-auth/react'
import appSlice from '~/store/slices/appSlice'

// Create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      app: appSlice,
    },
    preloadedState,
  })
}

interface AllTheProvidersProps {
  children: React.ReactNode
  initialState?: Record<string, unknown>
}

const AllTheProviders = ({
  children,
  initialState = {},
}: AllTheProvidersProps) => {
  const store = createTestStore(initialState)

  return (
    <SessionProvider session={null}>
      <Provider store={store}>{children}</Provider>
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialState?: Record<string, unknown>
  }
) => {
  const { initialState, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} initialState={initialState} />
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }
