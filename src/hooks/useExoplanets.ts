import { useEffect, useRef } from 'react'

import { fetchExoplanets } from '../store/exoplanetsSlice'
import useAppDispatch from './useAppDispatch'
import useAppSelector from './useAppSelector'

const useExoplanets = () => {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector((state) => state.exoplanets)
  const hasBeenFetched = useRef<boolean>(false)
  useEffect(() => {
    if (status === 'idle' && !hasBeenFetched.current) {
      dispatch(fetchExoplanets())
      hasBeenFetched.current = true
    }
  }, [dispatch, status, hasBeenFetched.current])

  return { items, status, error } as const
}

export default useExoplanets
