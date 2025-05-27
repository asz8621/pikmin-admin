<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/useDialogStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { showMessage } from '@/utils/message'
import { Copy, RotateCcw } from 'lucide-vue-next'

const emit = defineEmits(['submit'])

const deviceStore = useDeviceStore()
const { width } = storeToRefs(deviceStore)

const dialogWidth = computed(() => {
  if (width.value < 480) {
    return `${width.value - 40}px`
  } else if (width.value < 1024) {
    return '450px'
  } else {
    return '500px'
  }
})

const dialogStore = useDialogStore()
const { closeDialog } = dialogStore
const { isDialogOpen, isDialogLoading, dialogMode, dialogData } = storeToRefs(dialogStore)

const dialogTitle = computed(() => {
  switch (dialogMode.value) {
    case 'add':
      return '新增使用者'
    case 'edit':
      return '編輯使用者'
    case 'password':
      return '修改使用者密碼'
    default:
      return ''
  }
})

const submit = () => {
  if (isDialogLoading.value) return
  emit('submit', dialogData.value)
}

const randomPassword = () => {
  const length = 8
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const allChars = uppercase + lowercase + numbers

  // 確保各類型至少出現一次
  const randomUpper = uppercase[Math.floor(Math.random() * uppercase.length)]
  const randomLower = lowercase[Math.floor(Math.random() * lowercase.length)]
  const randomNumber = numbers[Math.floor(Math.random() * numbers.length)]

  let password = randomUpper + randomLower + randomNumber

  // 再補齊剩下的長度
  while (password.length < length) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 隨機打亂順序
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')

  dialogData.value.password = password
}

const onCopy = (e) => {
  showMessage('success', `複製成功: ${e.text}`)
}
const onError = () => {
  showMessage('error', '複製失敗，請稍後在試!')
}
</script>

<template>
  <el-dialog
    :width="dialogWidth"
    :title="dialogTitle"
    :model-value="isDialogOpen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <el-form :model="dialogData" :disabled="isDialogLoading" label-width="auto">
      <el-form-item v-if="dialogMode !== 'password'" label="名稱">
        <el-input v-model="dialogData.username" placeholder="請輸入名稱" />
      </el-form-item>
      <el-form-item v-if="dialogMode !== 'password'" label="帳號">
        <el-input v-model="dialogData.account" placeholder="請輸入帳號" />
      </el-form-item>
      <el-form-item v-if="dialogMode === 'add' || dialogMode === 'password'" label="密碼">
        <el-input
          v-model="dialogData.password"
          type="password"
          placeholder="請輸入密碼"
          class="passwordInput"
          show-password
        >
          <template #append>
            <div class="flex">
              <el-button
                class="w-8 !flex justify-center items-center !m-0"
                style="border-right: 1px solid var(--el-border-color)"
                @click="randomPassword"
              >
                <RotateCcw class="w-4 h-4" />
              </el-button>
              <el-button
                class="w-8 !flex justify-center items-center !m-0"
                v-clipboard:copy="dialogData.password"
                v-clipboard:success="onCopy"
                v-clipboard:error="onError"
              >
                <Copy class="w-4 h-4" />
              </el-button>
            </div>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="dialogMode !== 'password'" label="權限">
        <el-select v-model="dialogData.role">
          <el-option label="使用者" :value="1" />
          <el-option label="管理者" :value="10" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="dialogMode !== 'password'" label="狀態">
        <el-switch
          class="activeSwitch"
          v-model="dialogData.is_active"
          inline-prompt
          active-text="啟用"
          inactive-text="停用"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="isDialogLoading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="isDialogLoading" @click="submit">確認</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss">
.activeSwitch .is-text {
  padding: 0 4px;
}
.passwordInput {
  .el-input-group__append {
    padding: 0;
  }
}
</style>
