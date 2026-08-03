/**
 * Application bootstrap: creates the Vue app and wires up Pinia (with
 * localStorage persistence), Vue Router, and Vuetify (MDI icons +
 * light/dark violet themes, dark by default).
 */
import '@mdi/font/css/materialdesignicons.css'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'

// Global design system — imported once here so every page shares the same
// tokens and utility classes. See src/assets/styles/main.css.
import './assets/styles/main.css'

import { registerAuthStore } from './api/http.ts'
import App from './App.vue'
import router from './router'
import { darkTheme, lightTheme } from './theme/primary'
import { useAuthStore } from './stores/auth'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    // aliases,
    // sets: {
    //   mdi,
    // },
  },
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: lightTheme,
      dark: darkTheme,
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
