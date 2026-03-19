<script setup lang="ts">
import { ref, inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')!
const email = ref('')
const password = ref('')
function handleLogin() {}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1>{{ lang.loginTitle }}</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">{{ lang.loginUsername }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="lang.loginUsername"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">{{ lang.loginPassword }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="lang.loginPassword"
            required
          />
        </div>
        <button type="submit" class="login-btn">{{ lang.loginButton }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.login-btn:hover {
  background: #5568d3;
}
</style>
