import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useDeviceStore } from '@/stores/useDeviceStore'

export function useSidebar() {
  const sidebarStore = useSidebarStore()
  const { isCollapse, isMobileCollapse } = storeToRefs(sidebarStore)
  const { toggleCollapse, openMobileSidebar, closeMobileSidebar } = sidebarStore

  const deviceStore = useDeviceStore()
  const { isPC } = storeToRefs(deviceStore)

  // menu 狀態是摺疊還是展開
  const sidebarState = computed(() => {
    if (!isPC.value) {
      // 手機板強制展開
      return false
    } else {
      return isCollapse.value
    }
  })

  return {
    isCollapse,
    isPC,
    isMobileCollapse,
    sidebarState,
    toggleCollapse,
    openMobileSidebar,
    closeMobileSidebar,
  }
}
