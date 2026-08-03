/**
 * Store backing the multi-tab workspace: every visited route becomes a tab
 * (added by the router guard); switching or closing a tab drives navigation.
 */
import router from '@/router'
import type { Tab } from '@/types/interface'
import { defineStore } from 'pinia'

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as Tab[],
    activeTab: '' as string,
  }),
  actions: {
    /** Adds a tab if not already open, and makes it the active one. */
    addTab(tab: Tab) {
      if (!this.tabs.find((t) => t.id === tab.id)) {
        this.tabs.push(tab)
      }
      this.activeTab = tab.id
    },
    /**
     * Closes a tab (the last remaining tab cannot be closed). If the closed
     * tab was active, activates the first remaining tab.
     */
    removeTab(tabId: string) {
      if (this.tabs.length === 1) return
      this.tabs = this.tabs.filter((t) => t.id !== tabId)
      if (this.activeTab === tabId) {
        this.activeTab = this.tabs.length > 0 ? this.tabs[0]!.id : ''
      }
      if (this.tabs.length === 0) {
        router.push('/')
      }
    },
    /** Activates an open tab and navigates the router to its route. */
    setActiveTab(tabId: string) {
      if (this.tabs.find((t) => t.id === tabId)) {
        this.activeTab = tabId
        const tab: Tab | undefined = this.tabs.find((t) => t.id === tabId)
        router.push(tab?.router || '/')
      }
    },
  },
})
