import { useEffect } from 'react'

import { fetchExoplanets } from '../store/exoplanetsSlice'
import useAppDispatch from './useAppDispatch'
import useAppSelector from './useAppSelector'

const useExoplanets = () => {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector((state) => state.exoplanets)

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchExoplanets())
    }
  }, [dispatch, status])

  return { items, status, error } as const
}

export default useExoplanets
