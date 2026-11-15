'use client'

import { useCallback, useEffect, useState } from 'react'

import { fetchActiveBcvRate } from '@/services/bcvService'

export interface BcvRateInfo {
  rate: number
  isLoading: boolean
  isFallback: boolean
  isMissing: boolean
  source: string
  refresh: () => void
}

const EMPTY_STATE: Omit<BcvRateInfo, 'refresh'> = {
  rate: 0,
  isLoading: true,
  isFallback: false,
  isMissing: false,
  source: ''
}

export const useBcvRateInfo = (): BcvRateInfo => {
  const [state, setState] = useState(EMPTY_STATE)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    let active = true

    setState(prev => ({ ...prev, isLoading: true }))

    fetchActiveBcvRate({ force: request > 0 })
      .then(result => {
        if (!active) return

        if (result.ok) {
          setState({
            rate: result.data.rate,
            isLoading: false,
            isFallback: Boolean(result.data.isFallback),
            isMissing: false,
            source: result.data.source
          })
        } else {
          setState({ rate: 0, isLoading: false, isFallback: false, isMissing: true, source: '' })
        }
      })
      .catch(() => {
        if (!active) return
        setState({ rate: 0, isLoading: false, isFallback: false, isMissing: true, source: '' })
      })

    return () => {
      active = false
    }
  }, [request])

  const refresh = useCallback(() => setRequest(value => value + 1), [])

  return { ...state, refresh }
}

export const useBcvRate = (): number => useBcvRateInfo().rate
