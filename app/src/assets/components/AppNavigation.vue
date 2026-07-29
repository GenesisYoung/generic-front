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

type Lan = Record<string, string>
class Menu {
  id: number
  titleKey: string // key to look up in your lang object
  parentId: number | null
  children: Menu[] | null
  icon: string | null
  route: string
  color: string
  constructor(
    id: number,
    key: string,
    parentid: number | null,
    children: Menu[] | null,
    icon: string | null,
    route: string,
    color: string,
  ) {
    this.id = id
    this.titleKey = key
    this.parentId = parentid
    this.children = children
    this.icon = icon
    this.route = route
    this.color = color
  }
}

const drawer = defineModel<boolean>({ default: false })
const { mobile } = useDisplay()
const menu = ref<Menu[]>([])
const lang: Lan | undefined = inject('lan')

function formatIcon(iconName: string | null): string {
  if (!iconName) return ''
  // Already kebab-case with prefix? Use as-is.
  if (iconName.startsWith('mdi-')) return iconName
  // Convert camelCase ("mdiHomeCircle") to kebab-case ("mdi-home-circle")
  return iconName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

async function fetchNavMenu() {
  const auth = useAuthStore()
  const sideMenu: { data: { object: Menu[] } } = await http.get(
    `/users/fetch/sidebar/menu?id=${auth.identity?.id}`,
  )
  const m: Menu[] = new Array()
  const data = sideMenu.data.object
  data.forEach((ele) => {
    if (!ele.parentId) {
      if (ele.route && ele.route.length > 0) {
        m.push(new Menu(ele.id, ele.titleKey, null, null, ele.icon, ele.route, ele.color))
      } else {
        const target = new Menu(ele.id, ele.titleKey, null, null, ele.icon, ele.route, ele.color)
        findChildren(ele.id, data, target)
        m.push(target)
      }
    }
  })
  menu.value = m
  console.log(menu.value)
}

function findChildren(id: number, data: Menu[], target: Menu): Menu[] {
  const children = data.filter((ele) => {
    return ele.parentId === id
  })
  children.forEach((ele) => {
    if (ele.route === '') {
      findChildren(ele.id, data, ele)
    }
  })
  console.log(data)
  target.children = children
  children.forEach((item, idx) => {
    data.slice(idx, idx + 1)
  })
  return children
}

onMounted(async () => {
  await fetchNavMenu()
})
</script>
