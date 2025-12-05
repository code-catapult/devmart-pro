import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  isLoading: boolean
  error: string | null
  theme: 'light' | 'dark'
}

const initialState: AppState = {
  isLoading: false,
  error: null,
  theme: 'light',
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setLoading, setError, setTheme, clearError } = appSlice.actions
export default appSlice.reducer
