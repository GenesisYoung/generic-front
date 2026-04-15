<script setup lang="ts">
import MainEntry from './views/MainEntry.vue'
import { lan } from '@/lang/china_zh'
import { provide } from 'vue'
import { useAuthStore } from '@/stores/auth'
provide('lan', lan)
const isLoggedIn = useAuthStore().isDevmode || useAuthStore().isAuthenticated
</script>

<template>
  <main-entry v-if="isLoggedIn" />
  <router-view v-else />
</template>

<style scoped></style>
