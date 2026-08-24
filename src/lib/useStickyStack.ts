import { useEffect, useRef, useState } from 'react'

/**
 * Measures a sticky element and publishes its height so elements that stick
 * below it can offset by the real value. A hard-coded offset breaks as soon as
 * the preset rail wraps to a second row on a narrower desktop.
 */
export function useStickyStack<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // Border box, not content box: the offset has to include the panel's
    // padding and border or the element below still tucks under its edge.
    const observer = new ResizeObserver(([entry]) => {
      const border = entry.borderBoxSize?.[0]?.blockSize
      setHeight(border ?? entry.target.getBoundingClientRect().height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, height }
}
