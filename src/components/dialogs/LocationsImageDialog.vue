<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const emit = defineEmits(['cropped'])

const deviceStore = useDeviceStore()
const { isPC, width } = storeToRefs(deviceStore)

const dialogWidth = computed(() => {
  return isPC.value ? '800px' : `${width.value - 40}px`
})

const isDialogImageOpen = defineModel('isDialogImageOpen')
const imageUrl = defineModel('imageUrl')

const imageRef = ref(null)
const isCropperReady = ref(false)
let cropper = null

const closeDialog = () => {
  isDialogImageOpen.value = false
  isCropperReady.value = false
  imageUrl.value = ''
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

const base64ToFile = (base64, filename = 'cropped.png') => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

const submit = () => {
  if (cropper) {
    const canvas = cropper.getCroppedCanvas()
    const base64 = canvas.toDataURL('image/png')
    const file = base64ToFile(base64)
    const croppedData = {
      base64,
      file,
    }

    emit('cropped', croppedData)
    closeDialog()
  }
}

// 當 imageUrl 改變，重新初始化 cropper
watch(imageUrl, async (val) => {
  if (val && isDialogImageOpen.value) {
    await nextTick()
    if (cropper) cropper.destroy()
    cropper = new Cropper(imageRef.value, {
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      responsive: true,
      ready() {
        isCropperReady.value = true
      },
    })
  }
})

onBeforeUnmount(() => {
  if (cropper) cropper.destroy()
})
</script>

<template>
  <el-dialog
    :width="dialogWidth"
    title="裁切圖片"
    :model-value="isDialogImageOpen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div
      v-loading="!isCropperReady"
      element-loading-text="圖片載入中..."
      class="relative min-h-[300px]"
    >
      <img
        v-if="imageUrl"
        ref="imageRef"
        :src="imageUrl"
        alt="待裁切圖片"
        style="max-width: 100%; max-height: 60vh; display: block; margin: 0 auto"
      />
    </div>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="submit">確認</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss"></style>
