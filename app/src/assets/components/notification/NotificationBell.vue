<script setup lang="ts">
/**
 * App-bar bell: shows the unread count and a dropdown of the newest
 * notifications. Clicking an item marks it read. Data comes from the
 * notification store, which is fed by REST on login and by WebSocket pushes.
 */
import type { NotificationDto } from '@/api/notification'
import { useNotificationStore } from '@/stores/notification'
import { inject } from 'vue'
import { useRouter } from 'vue-router'

type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const store = useNotificationStore()
const router = useRouter()

/** The page a notification type opens when clicked; types without one only mark it read. */
const PAGES: Partial<Record<NotificationDto['type'], string>> = {
  CUSTOMER_ORDER_NEW: '/pmc/customer-orders',
  FOLLOWUP_DUE: '/purchase/followups',
  FOLLOWUP_MISSED: '/purchase/followups',
}

function open(n: NotificationDto) {
  void store.markRead(n.id)
  const page = PAGES[n.type]
  if (page && router) void router.push(page)
}

const ICONS: Record<NotificationDto['type'], string> = {
  REVIEW_ASSIGNED: 'mdi-clipboard-check-outline',
  PO_PLACEMENT_DUE: 'mdi-cart-clock',
  FOLLOWUP_DUE: 'mdi-phone-clock',
  FOLLOWUP_MISSED: 'mdi-alarm-off',
  EXCEPTION_REPORTED: 'mdi-alert-octagon-outline',
  EXCEPTION_UPDATED: 'mdi-alert-circle-check-outline',
  CUSTOMER_ORDER_NEW: 'mdi-cart-arrow-down',
  GENERAL: 'mdi-bell-outline',
}

function iconColor(n: NotificationDto): string {
  if (n.priority === 'ERGENT') return 'error'
  if (n.priority === 'HIGH') return 'warning'
  return 'primary'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}
</script>

<template>
  <v-menu location="bottom end" :close-on-content-click="false">
    <template v-slot:activator="{ props: menuProps }">
      <v-btn icon v-bind="menuProps" :aria-label="lang?.notifications">
        <v-badge
          :content="store.unreadCount > 99 ? '99+' : store.unreadCount"
          :model-value="store.unreadCount > 0"
          color="error"
        >
          <v-icon icon="mdi-bell-outline" />
        </v-badge>
      </v-btn>
    </template>
    <v-card min-width="320" max-width="400">
      <v-card-title class="d-flex align-center">
        <span>{{ lang?.notifications }}</span>
        <v-spacer />
        <v-btn
          v-if="store.unreadCount > 0"
          variant="text"
          size="small"
          @click="store.markAllRead()"
        >
          {{ lang?.markAllRead }}
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-list
        v-if="store.items.length > 0"
        density="compact"
        max-height="420"
        class="overflow-y-auto"
      >
        <v-list-item
          v-for="n in store.items"
          :key="n.id"
          :class="{ 'notification-unread': !n.read }"
          @click="open(n)"
        >
          <template v-slot:prepend>
            <v-icon :icon="ICONS[n.type] ?? 'mdi-bell-outline'" :color="iconColor(n)" />
          </template>
          <v-list-item-title>{{ n.title }}</v-list-item-title>
          <v-list-item-subtitle v-if="n.content">{{ n.content }}</v-list-item-subtitle>
          <v-list-item-subtitle>{{ formatTime(n.createdAt) }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-text v-else class="text-medium-emphasis">{{ lang?.noNotifications }}</v-card-text>
    </v-card>
  </v-menu>
</template>

<style scoped>
.notification-unread {
  font-weight: 600;
}
</style>
