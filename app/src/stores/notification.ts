import { websocket } from '@/api/websocket'
import { useAuthStore } from '@/stores/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface NotificationDto {
  id: number
  title: string
  content: string
  read: boolean
  createdAt: string
}
export interface SystemStatusDto {
  code: number
  object: {
    latestAccessToken: string
  }
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<NotificationDto[]>([])
  const unreadCount = computed(() => items.value.filter((n) => !n.read).length)

  function start(): void {
    const auth = useAuthStore()
    if (!auth.accessToken) return

    websocket.connect(auth.accessToken)

    // websocket.subscribe<NotificationDto>('/user/queue/notification', (dto) => {
    //   items.value.unshift(dto)
    // })

    // websocket.subscribe<NotificationDto>('/topic/stock-alert', (dto) => {
    //   items.value.unshift(dto)
    // })

    websocket.subscribe<SystemStatusDto>('/user/system/status', (dto) => {
      console.log('system status===>', dto)
      if (dto.code === 1) {
        if (dto.object.latestAccessToken != useAuthStore().accessToken) {
          useAuthStore().logout()
        }
      }
    })
  }

  async function stop(): Promise<void> {
    await websocket.disconnect()
    items.value = []
  }

  return { items, unreadCount, start, stop }
})
