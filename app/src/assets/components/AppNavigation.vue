<template>
  <v-navigation-drawer v-model="drawer" :temporary="mobile" :permanent="!mobile" width="260">
    <v-list nav density="comfortable" class="pa-2">
      <AppNavigationItem
        v-for="item in menu"
        :key="item.id"
        :item="item"
        @navigate="mobile && (drawer = false)"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
/**
 * Sidebar navigation drawer.
 *
 * Fetches the current user's menu items from the backend (flat list) and
 * folds them into a tree: items without a parentId are top level; an item
 * with an empty route is treated as a group whose children are resolved
 * recursively. Rendered by AppNavigationItem. On mobile the drawer is
 * temporary and closes after navigating.
 */
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import AppNavigationItem from './AppNavigationItem.vue'

/** One sidebar node; `children` is populated for group items. */
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

/** Fetches the user's flat menu list and builds the top-level tree. */
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
  // console.log(menu.value)
}

/** Recursively attaches the children of `id` (from the flat list) to `target`. */
function findChildren(id: number, data: Menu[], target: Menu): Menu[] {
  const children = data.filter((ele) => {
    return ele.parentId === id
  })
  children.forEach((ele) => {
    if (ele.route === '') {
      findChildren(ele.id, data, ele)
    }
  })
  // console.log(data)
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
