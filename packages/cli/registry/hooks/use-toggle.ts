import { useCallback, useState } from "react"

/**
 * 把布尔值 state、toggle 方法和原始 setter 打包在一起，
 * 方便组件里快速接入开关类交互。
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue((current) => !current)
  }, [])

  return [value, toggle, setValue] as const
}
