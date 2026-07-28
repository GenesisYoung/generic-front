<template>
  <v-navigation-drawer v-model="drawer" :temporary="mobile" :permanent="!mobile" width="260">
    <v-list nav density="comfortable" class="pa-2">
      <v-list-item
        v-for="item in menu"
        :key="item.route"
        :to="item.route"
        rounded="lg"
        class="mb-1"
        @click="mobile && (drawer = false)"
      >
        <template #prepend>
          <v-icon :color="item.color" :icon="formatIcon(item.icon)" />
        </template>
        <v-list-item-title>{{ lang?.[item.titleKey] }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { inject, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import type { NavItem } from '../config/navigation'

type Lan = Record<string, string>

const drawer = defineModel<boolean>({ default: false })
const { mobile } = useDisplay()
const menu = ref<NavItem[]>([])
const lang: Lan | undefined = inject('lan')

function formatIcon(iconName: string | undefined): string {
  if (!iconName) return ''
  // Already kebab-case with prefix? Use as-is.
  if (iconName.startsWith('mdi-')) return iconName
  // Convert camelCase ("mdiHomeCircle") to kebab-case ("mdi-home-circle")
  return iconName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

async function fetchNavMenu() {
  const auth = useAuthStore()
  const sideMenu = await http.get(`/users/fetch/sidebar/menu?id=${auth.identity?.id}`)
  menu.value = sideMenu.data.object
}

onMounted(async () => {
  await fetchNavMenu()
})
</script>
