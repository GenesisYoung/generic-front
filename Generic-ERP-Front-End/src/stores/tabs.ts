import { defineStore } from 'pinia'
import type { Tab } from '@/types/interface'
import router from '@/router'

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as Tab[],
    activeTab: '' as string,
  }),
  actions: {
    addTab(tab: Tab) {
      if (!this.tabs.find((t) => t.id === tab.id)) {
        this.tabs.push(tab)
      }
      this.activeTab = tab.id
    },
    removeTab(tabId: string) {
      this.tabs = this.tabs.filter((t) => t.id !== tabId)
      if (this.activeTab === tabId) {
        this.activeTab = this.tabs.length > 0 ? this.tabs[0]!.id : ''
      }
      if (this.tabs.length === 0) {
        router.push('/')
      }
    },
    setActiveTab(tabId: string) {
      if (this.tabs.find((t) => t.id === tabId)) {
        this.activeTab = tabId
        const tab: Tab | undefined = this.tabs.find((t) => t.id === tabId)
        router.push(tab?.router || '/')
      }
    },
  },
})
