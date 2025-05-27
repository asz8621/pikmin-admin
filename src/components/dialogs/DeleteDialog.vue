<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useDialogStore } from '@/stores/useDialogStore'

const { dialogTitle } = defineProps({
  dialogTitle: {
    type: String,
    default: '刪除資料',
  },
})

const emit = defineEmits(['submit'])

const deviceStore = useDeviceStore()
const { width } = storeToRefs(deviceStore)

// 對話框寬度
const dialogWidth = computed(() => {
  return width.value > 576 ? '400px' : `${width.value - 40}px`
})

const dialogStore = useDialogStore()
const { closeDialog } = dialogStore
const { isDialogLoading, isDeleteDialogOpen, dialogData } = storeToRefs(dialogStore)

const submit = () => {
  if (isDialogLoading.value) return
  emit('submit', dialogData.value)
}
</script>

<template>
  <el-dialog
    :width="dialogWidth"
    :title="dialogTitle"
    :model-value="isDeleteDialogOpen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <p class="text-sm text-gray-700">
      您確定要刪除
      <span class="text-red-600 font-semibold">{{ dialogData?.name || '該筆資料' }}</span>
      嗎?
    </p>
    <template #footer>
      <el-button :disabled="isDialogLoading" @click="closeDialog">取消</el-button>
      <el-button type="danger" :loading="isDialogLoading" @click="submit"> 刪除 </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss"></style>
