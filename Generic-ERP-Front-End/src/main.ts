// src/main.ts

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { registerAuthStore } from './api/http'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        colors: { primary: '#7C3AED' }, // violet
      },
    },
  },
})

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)

// Register the auth store with the Axios interceptor AFTER Pinia is installed.
registerAuthStore(() => useAuthStore())

app.mount('#app')
