<script setup>
import { ref } from 'vue'
import axios from '@/plugins/axios'
import { useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { showMessage } from '@/utils/message'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()

const { setUserData } = userStore

const account = ref('')
const password = ref('')
const isLoading = ref(false)

const login = async () => {
  if (isLoading.value) return

  const accountValue = account.value.trim()
  const passwordValue = password.value.trim()

  if (!accountValue || !passwordValue) {
    showMessage('warning', '請輸入帳號和密碼')
    return
  }

  isLoading.value = true
  try {
    const response = await axios.post('/auth/login', {
      account: accountValue,
      password: passwordValue,
    })

    if (!response.success) {
      throw new Error(response.message || '登入失敗')
    }

    const userData = response.data
    const token = userData?.token

    if (!token) {
      throw new Error(response.message || '登入成功但未取得 token')
    }

    Cookies.set('adminToken', token, { expires: 1 })
    setUserData({
      username: userData.username,
      role: userData.role,
    })

    showMessage('success', '登入成功')

    await router.push({ name: 'Dashboard' })
  } catch (error) {
    showMessage('error', error.response?.data?.message || error.message || '登入失敗')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="flex justify-center items-center min-h-screen bg-login bg-center bg-no-repeat bg-cover"
  >
    <div class="w-full xs:w-[420px] p-6 mx-4 bg-white/75 rounded shadow">
      <h2 class="text-2xl font-bold mb-6 text-center">Pikmin Map Dashboard</h2>
      <el-divider class="border-black" />
      <el-form label-position="top" @submit.prevent="login">
        <el-form-item label="帳號">
          <el-input
            v-model="account"
            placeholder="請輸入帳號"
            :disabled="isLoading"
          />
        </el-form-item>

        <el-form-item label="密碼">
          <el-input
            v-model="password"
            type="password"
            placeholder="請輸入密碼"
            show-password
            :disabled="isLoading"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" class="w-full" :loading="isLoading">
            登入
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped></style>
