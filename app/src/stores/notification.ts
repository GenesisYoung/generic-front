import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '@/api/notification'
import { websocket } from '@/api/websocket'
import { useAuthStore } from '@/stores/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type { NotificationDto } from '@/api/notification'

export interface SystemStatusDto {
  code: number
  object: {
    latestAccessToken: string
  }
}

/** Backend pushes stored notifications here (NotificationService.sendUserNotification). */
export const NOTIFICATION_DESTINATION = '/user/queue/notifications'

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<NotificationDto[]>([])
  /** Server-side unread count; the list only holds the newest page. */
  const unreadCount = ref(0)

  /** Adds a pushed notification to the top of the list, ignoring duplicates. */
  function receive(dto: NotificationDto): void {
    if (items.value.some((n) => n.id === dto.id)) return
    items.value.unshift(dto)
    if (!dto.read) unreadCount.value++
  }

  /** Loads the newest page and the unread count, e.g. after login or reconnect. */
  async function load(): Promise<void> {
    try {
      const [page, count] = await Promise.all([fetchNotifications(0, 20), fetchUnreadCount()])
      items.value = page.content
      unreadCount.value = count
    } catch (e) {
      console.warn('Could not load notifications', e)
    }
  }

  async function markRead(id: number): Promise<void> {
    const item = items.value.find((n) => n.id === id)
    if (!item || item.read) return
    await markNotificationRead(id)
    item.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead(): Promise<void> {
    await markAllNotificationsRead()
    items.value.forEach((n) => (n.read = true))
    unreadCount.value = 0
  }

  function start(): void {
    const auth = useAuthStore()
    if (!auth.accessToken) return

    websocket.connect(auth.accessToken)

    websocket.subscribe<NotificationDto>('/user/queue/notification', (dto) => {
      items.value.unshift(dto)
    })

    // websocket.subscribe<NotificationDto>('/topic/stock-alert', (dto) => {
    //   items.value.unshift(dto)
    // })

    websocket.subscribe<SystemStatusDto>('/user/system/status', (dto) => {
      if (dto.code === 1) {
        if (dto.object.latestAccessToken != useAuthStore().accessToken) {
          useAuthStore().logout()
        }
      }
    })

    void load()
  }

  async function stop(): Promise<void> {
    await websocket.disconnect()
    items.value = []
    unreadCount.value = 0
  }

  return { items, unreadCount, receive, load, markRead, markAllRead, start, stop }
})
