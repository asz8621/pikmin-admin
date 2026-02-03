<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/useDialogStore'
import { useDeviceStore } from '@/stores/useDeviceStore'

defineProps({
  reportsStatus: {
    type: Array,
    required: true,
  },
})

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
const { isDialogOpen, isDialogLoading, dialogData } = storeToRefs(dialogStore)

const submit = () => {
  if (isDialogLoading.value) return
  emit('submit', dialogData.value)
}
</script>

<template>
  <el-dialog
    :width="dialogWidth"
    title="問題查看"
    :model-value="isDialogOpen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <el-form :model="dialogData" :disabled="isDialogLoading" label-width="auto">
      <el-form-item label="問題內容">
        <el-input
          v-model="dialogData.description"
          :rows="5"
          type="textarea"
          placeholder="請輸入問題內容"
          readonly
          disabled
        />
      </el-form-item>
      <el-form-item label="回覆內容">
        <el-input
          v-model="dialogData.message"
          :rows="5"
          type="textarea"
          placeholder="請輸入回覆內容"
        />
      </el-form-item>
      <el-form-item label="狀態">
        <el-radio-group v-model="dialogData.status">
          <el-radio v-for="item in reportsStatus" :key="item.value" :label="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="isDialogLoading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="isDialogLoading" @click="submit">確認</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss"></style>
