import { useEffect, useState } from "react"

/**
 * 在需要区分“首屏 SSR”和“客户端挂载后”行为时很有用，
 * 比如只在 mounted 之后访问 window / localStorage。
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
