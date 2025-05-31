import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isCheck = ref(false)
  const userData = ref(null)

  const setUserData = (value) => {
    userData.value = value
  }

  const isCheckUser = () => {
    isCheck.value = true
  }

  return { userData, isCheck, setUserData, isCheckUser }
})
