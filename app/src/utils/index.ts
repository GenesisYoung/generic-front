import type { ISODateString } from '@/types/interface'
import type { PaginationRequest, PaginationResponse } from '@/types/interface'
import axios from 'axios'
// Convert a Date object to an ISO date string (YYYY-MM-DD)
function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}
// Placeholder function for requesting a new page of data
async function requestNewPage(
  paginationRequest: PaginationRequest,
): Promise<PaginationResponse<unknown>> {
  // Implementation for requesting a new page of data
  const response: PaginationResponse<unknown> = {
    success: false,
    data: [],
    current: 0,
    size: 0,
    total: 0,
  }
  await axios
    .get(paginationRequest.api, {
      params: paginationRequest.params,
      headers: paginationRequest.headers?.reduce((acc, header) => ({ ...acc, ...header }), {}),
    })
    .then((resp) => {
      // Handle successful response
      response.success = true
      response.data = resp.data
      response.current = paginationRequest.params?.current || 0
      response.size = paginationRequest.params?.size || 0
      response.total = resp.headers['x-total-count']
        ? parseInt(resp.headers['x-total-count'], 10)
        : 0
    })
    .catch((error) => {
      // Handle error
      console.error('Error fetching data:', error)
    })
  return Promise.resolve(response)
}

export { toISODateString, requestNewPage }
