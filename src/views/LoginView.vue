<script setup>
import { ref } from 'vue'
import axios from '@/plugins/axios'
import { useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { showMessage } from '@/utils/message'

const router = useRouter()

const account = ref('')
const password = ref('')
const isLoading = ref(false)

const login = async () => {
  if (!account.value || !password.value) {
    showMessage('warning', '請輸入帳號和密碼')
    return
  }

  isLoading.value = true
  try {
    const response = await axios.post('/auth/login', {
      account: account.value,
      password: password.value,
    })

    const token = response.data.token
    if (token) {
      Cookies.set('adminToken', token, { expires: 1 })
    }

    showMessage('success', '登入成功')

    router.push({ name: 'Dashboard' })
  } catch (error) {
    showMessage('error', error.response?.data?.message || '登入失敗')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center items-center min-h-screen bg-login bg-center bg-center">
    <div class="w-full xs:w-[420px] p-6 mx-4 bg-white/75 rounded shadow">
      <h2 class="text-2xl font-bold mb-6 text-center">Pikmin Map Dashboard</h2>
      <el-divider class="border-black" />
      <el-form label-position="top" @submit.prevent="login">
        <el-form-item label="帳號">
          <el-input
            v-model="account"
            placeholder="請輸入帳號"
            :disabled="isLoading"
            @keyup.enter="login"
          />
        </el-form-item>

        <el-form-item label="密碼">
          <el-input
            v-model="password"
            type="password"
            placeholder="請輸入密碼"
            show-password
            :disabled="isLoading"
            @keyup.enter="login"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="w-full" :loading="isLoading" @click="login">
            登入
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped></style>
