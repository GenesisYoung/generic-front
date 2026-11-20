<template>
  <component :is="dashboardData" />
</template>

<script setup lang="ts">
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import PMCDashboard from './PMCDashboard.vue'
import RootDashboard from './RootDashboard.vue'

const authStore = useAuthStore()
const userId = authStore.identity?.id
let dashboardData: any = null
await http.get(`/users/${userId}/dashboard`).then((response) => {
  if (response.data === 1) {
    dashboardData = RootDashboard
  } else if (response.data === 7) {
    dashboardData = PMCDashboard
  } else if (response.data === 8) {
    dashboardData = 'ODashboard'
  } else if (response.data === 9) {
    dashboardData = 'GMODashboard'
  }
})
console.log('dashboardData', dashboardData)
</script>
