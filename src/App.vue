<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useDeviceStore } from '@/stores/useDeviceStore'

const { updateWidth } = useDeviceStore()

const handleResize = () => {
  updateWidth()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  updateWidth()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <router-view />
</template>
