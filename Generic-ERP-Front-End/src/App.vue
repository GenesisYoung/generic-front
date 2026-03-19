<script setup lang="ts">
import { inject } from 'vue'
import AppNavigation from '@/src/components/AppNavigation.vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
</script>

<template>
  <router-view />
</template>

<style scoped></style>
