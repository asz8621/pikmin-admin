<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Cookies from 'js-cookie'
import axios from '@/plugins/axios'
import Sidebar from '@/components/Sidebar.vue'
import { useUserStore } from '@/stores/useUserStore'
import { useSidebar } from '@/composables/useSidebar'
import { showMessage } from '@/utils/message'
import { Moon, Sun, LogOut, Scan, PanelLeftOpen } from 'lucide-vue-next'

const userStore = useUserStore()
const { userData } = storeToRefs(userStore)

const router = useRouter()

const isDark = ref(false)

const { openMobileSidebar } = useSidebar()

const toggleDark = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.classList.toggle('light', !isDark.value)
}

const toggleFullscreen = () => {
  const el = document.documentElement
  if (!document.fullscreenElement) el.requestFullscreen?.()
  else document.exitFullscreen?.()
}

const logout = async () => {
  try {
    await axios.post('/auth/logout')
    router.push({ name: 'Login' })
  } catch (error) {
    Cookies.remove('adminToken')
    showMessage('error', `登出失敗: ${error.response?.data?.message}`)
  } finally {
    Cookies.remove('adminToken')
    showMessage('success', '登出成功')
  }
}
</script>

<template>
  <el-container class="h-screen">
    <Sidebar />

    <el-container style="width: calc(100% - 250px)">
      <el-header class="flex justify-end items-center select-none">
        <div class="block lg:hidden mr-auto cursor-pointer" @click="openMobileSidebar">
          <PanelLeftOpen />
        </div>
        <div class="cursor-pointer" title="全螢幕" @click="toggleFullscreen">
          <Scan />
        </div>
        <div class="ml-4 cursor-pointer" title="暗黑模式" @click="toggleDark">
          <component :is="isDark ? Moon : Sun" />
        </div>

        <span v-if="userData" class="font-bold ml-4">{{ userData.username }}</span>

        <div class="ml-4 cursor-pointer" title="登出" @click="logout">
          <LogOut />
        </div>
      </el-header>
      <el-main :class="isDark ? 'bg-black' : 'bg-gray-100'" class="p-2 xs:p-5">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss"></style>
