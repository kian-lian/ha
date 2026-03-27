/** HTTP 状态码 */
export const HTTP_STATUS = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
} as const

/** 网络错误码 */
export const NETWORK_ERROR_CODE = {
  NOT_FOUND: "ENOTFOUND",
  TIMEOUT: "ETIMEDOUT",
} as const
