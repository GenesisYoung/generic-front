import http from '@/api/http'
export interface PersonalEvidence {
  evidenceRef: string
  fileName: string
  purpose: string
  size: number
  uploadedAt: string
}
export const evidenceApi = {
  async metadata() {
    return (await http.get<{ canUpload: boolean }>('/pmc/evidence/metadata')).data
  },
  async list(keyword: string, page: number, size: number) {
    return (
      await http.get<{ items: PersonalEvidence[]; total: number }>('/pmc/evidence', {
        params: { keyword, page, size },
      })
    ).data
  },
  async upload(file: File, purpose: string, key: string) {
    const body = new FormData()
    body.append('file', file)
    body.append('purpose', purpose)
    return (
      await http.post<PersonalEvidence>('/pmc/evidence', body, {
        headers: { 'Idempotency-Key': key },
      })
    ).data
  },
  async download(ref: string) {
    return (
      await http.get<Blob>(`/pmc/evidence/${encodeURIComponent(ref)}/download`, {
        responseType: 'blob',
      })
    ).data
  },
}
