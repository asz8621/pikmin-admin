<script setup>
import { reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import axios from '@/plugins/axios'
import ResponsiveTable from '@/components/ResponsiveTable.vue'
import Pagination from '@/components/Pagination.vue'
import UserDialog from '@/components/dialogs/UserDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import { formatDate } from '@/utils/formatDate'
import { RefreshCw, Pencil, RotateCcwKey } from 'lucide-vue-next'

const dialogStore = useDialogStore()
const { openDialog, closeDialog, setDialogLoading } = dialogStore
const { isDialogLoading, dialogMode } = storeToRefs(dialogStore)

const columns = [
  { label: '名稱', prop: 'username' },
  { label: '帳號', prop: 'account' },
  { label: '狀態', prop: 'is_active', slot: 'isActive' },
  { label: '最後更新時間', prop: 'updated_at', slot: 'updatedAt' },
  { label: '最後登入時間', prop: 'last_login', slot: 'lastLogin' },
]

const getUsers = async ({ page = 1, limit = 10, name, active }) => {
  const queryParams = new URLSearchParams()
  queryParams.append('page', page)
  queryParams.append('limit', limit)
  if (name) queryParams.append('name', name)
  if (typeof active === 'boolean') queryParams.append('active', active)

  const res = await axios.get(`/admin/users?${queryParams.toString()}`)
  // console.log('[getUsers]:', { page, limit, name, active })
  return {
    data: res.data.data,
    total: res.data.totalCount,
  }
}

// 單一來源的搜尋條件，傳給 composable
const searchForm = reactive({
  name: '',
  active: null,
})

// 使用 composable，直接傳入 searchForm 作為條件
const { page, limit, totalCount, isLoading, tableData, getData, refresh, submitSearch, onError } =
  usePagination(getUsers, searchForm)

// 錯誤處理
onError.value = (error) => {
  const msg = error?.response?.data?.message || '發生未知錯誤，請稍後再試'
  showMessage('error', msg)
}

onMounted(getData)

// 開啟彈窗
const openModal = (mode, row = null) => {
  const validModes = ['add', 'edit', 'password']
  if (!validModes.includes(mode)) {
    showMessage('error', 'mode 不正確，請稍後再試')
    return
  }

  const initData = {
    add: {
      username: '',
      account: '',
      password: '',
      role: 1,
      is_active: true,
    },
    edit: { ...row },
    password: {
      id: row?.id,
      password: '',
    },
  }

  const data = initData[mode]

  openDialog(mode, data)
}

const checkPassword = (password) => {
  const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
  return passwordStrengthRegex.test(password)
}

const apiConfig = {
  add: {
    url: '/admin/user/create',
    method: 'post',
    error: '新增失敗',
  },
  edit: {
    getUrl: (id) => `/admin/user/update/${id}`,
    method: 'put',
    error: '修改失敗',
  },
  password: {
    getUrl: (id) => `/admin/user/reset-password/${id}`,
    method: 'put',
    error: '修改失敗',
  },
}

const handleSubmit = async (data) => {
  if (isDialogLoading.value) return
  setDialogLoading(true)
  const { password } = data
  const mode = dialogMode.value
  const config = apiConfig[mode]
  const errorText = config.error

  if (mode === 'password' && !checkPassword(password)) {
    showMessage('error', '密碼必須至少 8 碼，且包含英文字母與數字')
    setDialogLoading(false)
    return
  }

  const apiUrl = config.getUrl ? config.getUrl(data.id) : config.url
  const method = config.method

  try {
    const res = await axios[method](apiUrl, data)
    await refresh()
    closeDialog()
    showMessage('success', res.message)
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `${errorText}: ${message}`)
  } finally {
    setDialogLoading(false)
  }
}
</script>

<template>
  <div
    class="p-4"
    :style="{
      backgroundColor: 'var(--el-bg-color)',
      borderColor: 'var(--el-border-color)',
    }"
  >
    <div class="flex flex-wrap gap-4 items-end">
      <el-input
        v-model="searchForm.name"
        placeholder="請輸入名稱"
        class="w-64"
        :disabled="isLoading"
        clearable
      />

      <el-select
        v-model="searchForm.active"
        placeholder="狀態"
        class="w-40"
        :disabled="isLoading"
        clearable
      >
        <el-option label="啟用" :value="true" />
        <el-option label="停用" :value="false" />
      </el-select>

      <el-button type="primary" @click="submitSearch" :disabled="isLoading">搜尋</el-button>
      <el-button class="!ml-auto w-8 h-8" @click="refresh" :disabled="isLoading">
        <RefreshCw class="w-4 h-4" />
      </el-button>
    </div>

    <el-divider class="my-4"></el-divider>

    <div class="mb-4">
      <el-button type="primary" :disabled="isLoading" @click="openModal('add')">
        新增會員
      </el-button>
    </div>

    <ResponsiveTable class="mb-4" :tableData="tableData" :columns="columns" :loading="isLoading">
      <template #isActive="{ row }">
        <span :class="row.is_active ? 'text-green-500' : 'text-red-500'">
          {{ row.is_active ? '啟用' : '停用' }}
        </span>
      </template>

      <template #updatedAt="{ row }">
        {{ formatDate(row.updated_at) }}
      </template>

      <template #lastLogin="{ row }">
        {{ formatDate(row.last_login) }}
      </template>

      <template #actions="{ row }">
        <el-tooltip content="編輯" placement="top">
          <el-button
            class="w-8 h-8 p-0"
            type="primary"
            plain
            size="small"
            @click="() => openModal('edit', row)"
          >
            <Pencil class="w-4 h-4" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="修改密碼" placement="top">
          <el-button
            class="w-8 h-8 p-0"
            type="warning"
            plain
            size="small"
            @click="() => openModal('password', row)"
          >
            <RotateCcwKey class="w-4 h-4" />
          </el-button>
        </el-tooltip>
      </template>
    </ResponsiveTable>

    <Pagination
      v-model:page="page"
      v-model:limit="limit"
      :totalCount="totalCount"
      :disabled="isLoading"
    />
  </div>

  <UserDialog @submit="handleSubmit" />
</template>

<style lang="scss"></style>
