import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDeviceStore = defineStore('device', () => {
  const width = ref(window.innerWidth)
  const isPC = ref(width.value > 1024)

  const updateWidth = () => {
    width.value = window.innerWidth
    if (width.value > 1024) {
      isPC.value = true
    } else {
      isPC.value = false
    }
  }

  return { width, isPC, updateWidth }
})
