<script setup lang="ts">
import { lan } from '@/lang/china_zh'
import { useAuthStore } from '@/stores/auth'
import { provide } from 'vue'
import MainEntry from './views/MainEntry.vue'
provide('lan', lan)
const isLoggedIn = useAuthStore().isAuthenticated
</script>

<template>
  <main-entry v-if="isLoggedIn" />
  <router-view v-else />
</template>

<style scoped></style>
