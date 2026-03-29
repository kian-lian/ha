import { useCallback, useState } from "react"
import { useCallbackRef } from "#loom-registry/hooks/use-callback-ref"

interface UseControllableStateOptions<T> {
  defaultValue: T
  value?: T
  onChange?: (nextValue: T) => void
}

/**
 * 同时支持受控和非受控两种模式：
 * - 传入 value 时，走受控模式
 * - 不传 value 时，内部自己维护状态
 */
export function useControllableState<T>({
  defaultValue,
  value,
  onChange,
}: UseControllableStateOptions<T>) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const onChangeRef = useCallbackRef(onChange)

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue

  const setValue = useCallback(
    (nextValue: T) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }

      onChangeRef.current?.(nextValue)
    },
    [isControlled, onChangeRef],
  )

  return [currentValue, setValue] as const
}
