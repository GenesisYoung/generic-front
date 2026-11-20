import http from '@/api/http'

/** Mirrors the backend's NotificationType enum. */
export type NotificationType =
  | 'REVIEW_ASSIGNED'
  | 'PO_PLACEMENT_DUE'
  | 'FOLLOWUP_DUE'
  | 'FOLLOWUP_MISSED'
  | 'EXCEPTION_REPORTED'
  | 'EXCEPTION_UPDATED'
  | 'GENERAL'

/** One stored notification, the same shape from REST and from the WebSocket push. */
export interface NotificationDto {
  id: number
  type: NotificationType
  priority: 'NORMAL' | 'HIGH' | 'ERGENT'
  title: string
  content: string | null
  bizType: string | null
  bizId: number | null
  read: boolean
  createdAt: string
}

export interface NotificationPage {
  content: NotificationDto[]
  totalElements: number
  totalPages: number
  page: number
}

interface Envelope<T> {
  status: number
  message: string
  object: T
}

export async function fetchNotifications(page = 0, size = 20): Promise<NotificationPage> {
  const resp = await http.get<Envelope<NotificationPage>>('/notifications/fetch', {
    params: { page, size },
  })
  return resp.data.object
}

export async function fetchUnreadCount(): Promise<number> {
  const resp = await http.get<Envelope<number>>('/notifications/unread-count')
  return resp.data.object
}

export async function markNotificationRead(id: number): Promise<void> {
  await http.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post('/notifications/read-all')
}
