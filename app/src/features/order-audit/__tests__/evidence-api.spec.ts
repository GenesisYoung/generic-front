// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/http', () => ({ default: http }))
import { evidenceApi } from '../evidence-api'
beforeEach(() => vi.resetAllMocks())
it('sends the standalone file and purpose without inventing an order or task', async () => {
  const f = new File(['proof'], 'proof.txt')
  http.post.mockResolvedValue({ data: { evidenceRef: 'evidence:id' } })
  await evidenceApi.upload(f, '规则依据', 'retry-key-123456789')
  const [url, body, config] = http.post.mock.calls[0]!
  expect(url).toBe('/pmc/evidence')
  expect(body.get('purpose')).toBe('规则依据')
  expect(body.get('file').name).toBe('proof.txt')
  expect(body.has('taskId')).toBe(false)
  expect(config.headers['Idempotency-Key']).toBe('retry-key-123456789')
})
it('uses authenticated requests for personal listing and downloads', async () => {
  http.get.mockResolvedValue({ data: new Blob(['proof']) })
  await evidenceApi.list('规则', 2, 50)
  expect(http.get).toHaveBeenLastCalledWith('/pmc/evidence', {
    params: { keyword: '规则', page: 2, size: 50 },
  })
  await evidenceApi.download('evidence:id')
  expect(http.get).toHaveBeenLastCalledWith('/pmc/evidence/evidence%3Aid/download', {
    responseType: 'blob',
  })
})
