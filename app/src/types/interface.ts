import type { Component } from 'vue'
// Define the structure of an API response
interface APIResponse<T> {
  success: boolean // Indicates whether the API request was successful
  data: T // The data returned from the API, of generic type T
  message?: string // Optional message from the API, such as error details or success confirmation
}
// Define the structure of an API request configuration
interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' // HTTP method for the API request
  url: string // The endpoint URL for the API request
  headers?: Record<string, string>[] // Optional array of header objects for the API request
  body?: unknown // Optional body of the API request, can be of any type depending on the API requirements
}
// Define a structure for items that can be selected in a dropdown or similar UI component
interface SelectItem {
  title: string
  value: string | number
}

interface Tab {
  id: string
  title: string
  component: Component
  router: string
}

type ISODateString = string // ISO 8601 formatted date string

interface PageRequest {
  current: number
  size: number
}

interface PaginationRequest {
  api: string
  params?: PageRequest
  headers?: Record<string, string>[]
}

interface PaginationResponse<T> {
  success: boolean // Indicates whether the request was successful
  data: T[] // The array of data items for the current page
  current: number // The current page number
  size: number // The number of items per page
  total: number // The total number of items available
  message?: string // Optional message for the response
}

export type {
  APIResponse,
  APIRequestConfig,
  ISODateString,
  SelectItem,
  Tab,
  PaginationRequest,
  PaginationResponse,
}
