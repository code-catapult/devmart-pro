import { useSelector, useDispatch } from 'react-redux'
import { AppDispatch } from '~/store'
import {
  selectCartItems,
  selectCartTotal,
  selectItemCount,
  selectCartOpen,
} from '~/store/slices/cartSlice'

export function useCart() {
  const dispatch = useDispatch<AppDispatch>()
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)
  const itemCount = useSelector(selectItemCount)
  const isOpen = useSelector(selectCartOpen)

  return {
    items,
    total,
    itemCount,
    isOpen,
    dispatch,
  }
}
