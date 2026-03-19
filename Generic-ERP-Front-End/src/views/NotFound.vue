<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">{{ lang.pageNotFoundTitle }}</h2>
      <p class="error-description">{{ lang.pageNotFoundMessage }}</p>
      <router-link to="/" class="btn-home"> {{ lang.goBackHome }} </router-link>
    </div>
  </div>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.not-found-content {
  text-align: center;
  color: white;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.error-title {
  font-size: 36px;
  margin: 20px 0 10px;
}

.error-description {
  font-size: 18px;
  margin-bottom: 40px;
  opacity: 0.9;
}

.btn-home {
  display: inline-block;
  padding: 12px 30px;
  background-color: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.btn-home:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
</style>
