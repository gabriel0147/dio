import { useCallback, useState } from 'react'

export function nextIsolatedChartSeries<T extends string>(
  current: T | null,
  selected: T,
): T | null {
  return current === selected ? null : selected
}

export function useIsolatedChartSeries<T extends string>() {
  const [isolatedKey, setIsolatedKey] = useState<T | null>(null)
  const toggleSeries = useCallback((key: T) => {
    setIsolatedKey((current) => nextIsolatedChartSeries(current, key))
  }, [])
  const showAll = useCallback(() => setIsolatedKey(null), [])
  const isVisible = useCallback(
    (key: T) => isolatedKey === null || isolatedKey === key,
    [isolatedKey],
  )

  return { isolatedKey, toggleSeries, showAll, isVisible }
}
