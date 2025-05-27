<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/useDialogStore'
import { useDeviceStore } from '@/stores/useDeviceStore'

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
      return '新增類型'
    case 'edit':
      return '編輯類型'
    case 'delete':
      return '刪除類型'
    default:
      return ''
  }
})

const submit = () => {
  if (isDialogLoading.value) return
  emit('submit', dialogData.value)
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
    <el-form :model="dialogData" label-width="auto">
      <el-form-item label="名稱">
        <el-input v-model="dialogData.name" :disabled="isDialogLoading" placeholder="請輸入名稱" />
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
