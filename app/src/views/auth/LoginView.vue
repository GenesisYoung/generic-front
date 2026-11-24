<!-- src/views/auth/LoginView.vue -->
<script setup lang="ts">
/**
 * Login page (/login). Delegates the actual authentication to the auth
 * store; on success the store redirects to home. Standalone full-screen
 * layout (own <v-app>), since it renders outside the MainEntry shell.
 */
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'

const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

/** Submits the credentials; shows the backend message on failure. */
async function handleLogin() {
  if (!username.value || !password.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    await auth.login(username.value, password.value)
  } catch (e: unknown) {
    const error = e as { response?: { data?: { message?: string } } }
    errorMessage.value = error?.response?.data?.message ?? 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main class="login-page">
      <v-container class="d-flex align-center justify-center login-container">
        <v-card max-width="420" width="100%" elevation="8" rounded="lg" :loading="loading">
          <v-card-title class="text-h5 font-weight-bold pa-6 pb-2"> Sign In </v-card-title>

          <v-card-text class="pa-6 pt-0">
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
              :disabled="loading"
              @keyup.enter="handleLogin"
            />

            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              autocomplete="current-password"
              :disabled="loading"
              @keyup.enter="handleLogin"
            />
          </v-card-text>

          <v-card-actions class="pa-6 pt-0">
            <v-btn
              block
              variant="flat"
              color="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
            >
              Sign In
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.login-page {
  background:
    radial-gradient(ellipse at 18% 15%, rgba(var(--v-theme-primary), 0.2), transparent 45%),
    radial-gradient(ellipse at 85% 85%, rgba(var(--v-theme-secondary), 0.12), transparent 45%),
    rgb(var(--v-theme-background));
}

.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
}

.login-container :deep(.v-card) {
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 24px !important;
  box-shadow: 0 24px 80px rgba(10, 6, 24, 0.24) !important;
  padding: 16px;
}

.login-container :deep(.v-card-title) {
  padding-bottom: 28px !important;
  letter-spacing: -0.025em;
}

.login-container :deep(.v-btn) {
  min-height: 48px;
}

@media (max-width: 599px) {
  .login-container {
    padding: 16px;
  }

  .login-container :deep(.v-card) {
    padding: 4px;
  }
}
</style>
