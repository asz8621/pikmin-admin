import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const isDialogOpen = ref(false)
  const isDeleteDialogOpen = ref(false)
  const isDialogLoading = ref(false)
  const dialogMode = ref('add')
  const dialogData = ref({})

  const openDialog = (mode, data) => {
    if (mode === 'delete') {
      isDeleteDialogOpen.value = true
    } else {
      isDialogOpen.value = true
    }
    dialogMode.value = mode
    dialogData.value = data
  }

  const closeDialog = () => {
    isDialogOpen.value = false
    isDialogLoading.value = false
    dialogMode.value = 'add'
    dialogData.value = {}
  }

  const setDialogLoading = (loading) => {
    isDialogLoading.value = loading
  }

  return {
    isDialogOpen,
    isDeleteDialogOpen,
    isDialogLoading,
    dialogMode,
    dialogData,
    setDialogLoading,
    openDialog,
    closeDialog,
  }
})
