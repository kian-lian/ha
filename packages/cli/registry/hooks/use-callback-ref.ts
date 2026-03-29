import { useEffect, useRef } from "react"

/**
 * 让外部传入的 callback 始终保持“最新值”，
 * 同时又不把 callback 本身变成依赖项。
 */
export function useCallbackRef<T extends (...args: any[]) => any>(
  callback: T | undefined,
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return callbackRef
}
