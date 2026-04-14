<!-- src/views/auth/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  if (!username.value || !password.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    await auth.login(username.value, password.value)
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.message ?? 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="d-flex align-center justify-center" style="min-height: 100vh">
        <v-card width="420" elevation="4" rounded="lg">
          <v-card-title class="text-h5 font-weight-bold pa-6 pb-2"> Sign In </v-card-title>

          <v-card-text class="pa-6">
            <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
              {{ errorMessage }}
            </v-alert>

            <v-text-field
              v-model="username"
              label="Username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              autocomplete="username"
              class="mb-3"
              @keyup.enter="handleLogin"
            />

            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </v-card-text>

          <v-card-actions class="pa-6 pt-0">
            <v-btn block color="primary" size="large" :loading="loading" @click="handleLogin">
              Sign In
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>
