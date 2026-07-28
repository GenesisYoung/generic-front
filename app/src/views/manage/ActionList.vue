<template>
  <div class="page">
    <article class="center py-8">{{ lan?.noAvaiableData }}</article>
  </div>
</template>

<script lang="ts" setup>
import { inject } from 'vue'
type Lan = Record<string, string>
const lan: Lan | undefined = inject('lan')
</script>
