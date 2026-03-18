<template>
  <v-navigation-drawer>
    <v-list>
      <v-list-item v-for="item in navigationItems" :key="item.route" :to="item.route">
        <template #prepend>
          <v-icon :color="item.color" :icon="item.icon" />
        </template>
        <v-list-item-title>{{ lang?.[item.titleKey] }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { navigationItems } from '../config/navigation'

type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
</script>
