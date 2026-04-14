<script setup lang="ts">
import { inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')!
</script>

<template>This is home page</template>

<style scoped></style>
