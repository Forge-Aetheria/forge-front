'use client'

import { useEffect, useState } from 'react'

import { fetchActiveBcvRate } from '@/services/bcvService'

export const useBcvRate = (): number => {
  const [rate, setRate] = useState(0)

  useEffect(() => {
    fetchActiveBcvRate()
      .then(result => {
        if (result.ok) setRate(result.data.rate)
      })
      .catch(() => setRate(0))
  }, [])

  return rate
}
