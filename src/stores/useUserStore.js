import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isCheck = ref(false)
  const userdata = ref(null)

  const setUserData = (value) => {
    userdata.value = value
  }

  const isCheckUser = () => {
    isCheck.value = true
  }

  return { userdata, isCheck, setUserData, isCheckUser }
})
