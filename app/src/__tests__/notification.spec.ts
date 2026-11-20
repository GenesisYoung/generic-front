import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationDto } from '@/api/notification'

import * as api from '@/api/notification'
import { websocket } from '@/api/websocket'
import { NOTIFICATION_DESTINATION, useNotificationStore } from '@/stores/notification'

vi.mock('@/api/notification', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/websocket', () => ({
  websocket: { connect: vi.fn(), subscribe: vi.fn(), disconnect: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ accessToken: 'token' }) }))

function dto(id: number, read = false): NotificationDto {
  return {
    id,
    type: 'EXCEPTION_REPORTED',
    priority: 'HIGH',
    title: `Exception ${id}`,
    content: null,
    bizType: 'PURCHASE_EXCEPTION',
    bizId: id,
    read,
    createdAt: '2026-11-20T09:00:00',
  }
}

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('subscribes to the plural queue the backend sends to', () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
    })
    vi.mocked(api.fetchUnreadCount).mockResolvedValue(0)

    useNotificationStore().start()

    const subscribe = vi.mocked(websocket.subscribe)
    const destinations = subscribe.mock.calls.map((c) => c[0])
    expect(destinations).toContain(NOTIFICATION_DESTINATION)
    expect(NOTIFICATION_DESTINATION).toBe('/user/queue/notifications')
  })

  it('adds pushed notifications once and counts them as unread', () => {
    const store = useNotificationStore()
    store.receive(dto(1))
    store.receive(dto(1))
    store.receive(dto(2, true))

    expect(store.items.map((n) => n.id)).toEqual([2, 1])
    expect(store.unreadCount).toBe(1)
  })

  it('loads the newest page and the server unread count', async () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue({
      content: [dto(3), dto(4, true)],
      totalElements: 2,
      totalPages: 1,
      page: 0,
    })
    vi.mocked(api.fetchUnreadCount).mockResolvedValue(7)

    const store = useNotificationStore()
    await store.load()

    expect(store.items).toHaveLength(2)
    expect(store.unreadCount).toBe(7)
  })

  it('marks one or all as read', async () => {
    const store = useNotificationStore()
    store.receive(dto(1))
    store.receive(dto(2))

    await store.markRead(1)
    expect(api.markNotificationRead).toHaveBeenCalledWith(1)
    expect(store.unreadCount).toBe(1)

    await store.markAllRead()
    expect(store.items.every((n) => n.read)).toBe(true)
    expect(store.unreadCount).toBe(0)
  })
})
