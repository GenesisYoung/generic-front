<template>
  <v-app>
    <div class="not-found-container">
      <div class="not-found-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">{{ lang.pageNotFoundTitle }}</h2>
        <p class="error-description">{{ lang.pageNotFoundMessage }}</p>
        <router-link to="/" class="btn-home"> {{ lang.goBackHome }} </router-link>
      </div>
    </div>
  </v-app>
</template>

<script lang="ts" setup>
import { inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')!
</script>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-4);
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)) 0%,
    rgb(var(--v-theme-secondary)) 100%
  );
}

.not-found-content {
  text-align: center;
  color: #fff;
}

.error-code {
  font-size: var(--text-3xl);
  font-weight: 800;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.error-title {
  font-size: var(--text-xl);
  margin: var(--space-4) 0 var(--space-2);
}

.error-description {
  font-size: var(--text-base);
  margin-bottom: var(--space-6);
  opacity: 0.9;
}

.btn-home {
  display: inline-block;
  padding: var(--space-3) var(--space-6);
  background-color: #fff;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: bold;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn-home:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
</style>
