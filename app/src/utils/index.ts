/** General-purpose helpers shared across views. */
import type { ISODateString } from '@/types/interface'
import type { PaginationRequest, PaginationResponse } from '@/types/interface'
import axios from 'axios'

/** Converts a Date object to an ISO-8601 date string. */
function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

/**
 * Generic paginated GET helper: fetches one page from `paginationRequest.api`
 * and normalises the result into a PaginationResponse. The total row count is
 * read from the `x-total-count` response header. On error, returns a response
 * with `success: false` and an empty data array (never throws).
 *
 * NOTE: uses the raw axios instance, so no JWT header is attached — switch to
 * the shared http instance if the target endpoint requires authentication.
 */
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
