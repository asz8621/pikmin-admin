<script setup>
import { ref, onMounted } from 'vue'
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
const { setUserData, isCheckUser } = userStore
const { isCheck } = storeToRefs(userStore)

const router = useRouter()

const isDark = ref(false)
const username = ref('')

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

const checkUser = async () => {
  try {
    const res = await axios.get('/admin/check')
    const data = res.data
    username.value = data.username
    setUserData(data)
    isCheckUser()
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `錯誤: ${message}`)
  }
}
onMounted(() => {
  if (!isCheck.value) checkUser()
})
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

        <span class="font-bold ml-4">{{ username }}</span>

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
