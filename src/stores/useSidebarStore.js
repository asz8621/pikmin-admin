import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const isCollapse = ref(false)
  const isMobileCollapse = ref(false)

  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }

  const openMobileSidebar = () => {
    isMobileCollapse.value = true
  }

  const closeMobileSidebar = () => {
    isMobileCollapse.value = false
  }

  return { isCollapse, isMobileCollapse, toggleCollapse, openMobileSidebar, closeMobileSidebar }
})
