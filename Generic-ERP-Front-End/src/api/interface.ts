interface APIResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers?: Record<string, string>[]
  body?: unknown
}

interface SelectItem {
  title: string
  value: string | number
}

type ISODateString = string // ISO 8601 formatted date string

export type { APIResponse, APIRequestConfig, ISODateString, SelectItem }
