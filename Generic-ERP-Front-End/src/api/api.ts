import type { APIRequestConfig, APIResponse } from '../types/interface'
import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8000/api'
axios.defaults.withCredentials = true

async function request_api<T>(config: APIRequestConfig): Promise<APIResponse<T>> {
  const BASE_HEADER = {
    'Content-Type': 'application/json',
    'X-Access-Token': 'token',
  }
  const headers =
    config.headers?.reduce((acc, header) => ({ ...acc, ...header }), BASE_HEADER) || BASE_HEADER
  // Implementation for making API requests
  if (config.method === 'GET') {
    const response = await axios.get(config.url, { headers: headers })
    return new Promise((resolve) => {
      resolve(response.data as APIResponse<T>)
    })
  } else if (config.method === 'POST') {
    const response = await axios.post(config.url, config.body, { headers: headers })
    return new Promise((resolve) => {
      resolve(response.data as APIResponse<T>)
    })
  }
  throw new Error(`Unsupported method: ${config.method}`)
}

export { request_api }
