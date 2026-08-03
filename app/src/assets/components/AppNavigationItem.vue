<template>
  <v-list-group
    v-if="item.children && item.children.length"
    :value="item.id"
    :expand-icon="formatIcon('mdiArrowDownDropCircle')"
    :collapse-icon="formatIcon('mdiArrowUpDropCircle')"
  >
    <template #activator="{ props: activatorProps }">
      <v-list-item v-bind="activatorProps" rounded="lg" class="mb-1">
        <template #prepend>
          <v-icon :color="item.color" :icon="formatIcon(item.icon)" />
        </template>
        <v-list-item-title class="title">{{ lang?.[item.titleKey] }}</v-list-item-title>
      </v-list-item>
    </template>

    <AppNavigationItem
      v-for="child in item.children"
      :key="child.id"
      :item="child"
      @navigate="$emit('navigate')"
    />
  </v-list-group>

  <v-list-item v-else :to="item.route" rounded="lg" class="mb-1" @click="$emit('navigate')">
    <template #prepend>
      <v-icon :color="item.color" :icon="formatIcon(item.icon)" />
    </template>
    <v-list-item-title class="title">{{ lang?.[item.titleKey] }}</v-list-item-title>
  </v-list-item>
</template>

<script setup lang="ts">
/**
 * One sidebar entry, rendered recursively: an item with children becomes an
 * expandable v-list-group, a leaf becomes a router-linked v-list-item.
 * Emits 'navigate' on click so the parent drawer can close on mobile.
 */
import { inject } from 'vue'

interface MenuItem {
  id: number
  titleKey: string
  parentId: number | null
  children: MenuItem[] | null
  icon: string | null
  route: string
  color: string
}

type Lan = Record<string, string>

defineProps<{ item: MenuItem }>()
defineEmits<{ navigate: [] }>()

const lang: Lan | undefined = inject('lan')

// Accepts both 'mdi-account' and camelCase 'mdiAccount' icon names,
// converting the latter to the kebab-case form Vuetify expects.
function formatIcon(iconName: string | null): string {
  if (!iconName) return ''
  if (iconName.startsWith('mdi-')) return iconName
  return iconName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
</script>

<style scoped>
.title {
  user-select: none;
  cursor: pointer;
}
</style>
