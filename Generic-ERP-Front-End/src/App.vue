<script setup lang="ts">
import MainEntry from './views/MainEntry.vue'
import { lan } from '@/lang/china_zh'
import { provide } from 'vue'
provide('lan', lan)
</script>

<template>
  <main-entry />
</template>

<style scoped></style>
