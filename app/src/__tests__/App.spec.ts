import { beforeEach, describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('renders the unauthenticated router outlet', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterView: { template: '<div data-testid="router-view" />' },
          TheDialog: true,
        },
      },
    })

    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })
})
