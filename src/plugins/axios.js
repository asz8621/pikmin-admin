import axios from 'axios'
import Cookies from 'js-cookie'
import router from '@/router'
import { useNProgress } from '@/composables/useNProgress.js'
const { startProgress, finishProgress } = useNProgress()

const baseURL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('adminToken')

    config.headers['Authorization'] = `Bearer ${token}`
    startProgress()
    return config
  },
  (error) => {
    finishProgress()
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (res) => {
    finishProgress()
    return res.data
  },
  (err) => {
    if (err.response?.status === 401) {
      // 清除 token 並跳轉到登入頁面
      Cookies.remove('adminToken')
      router.push({ name: 'Login' })
    }
    finishProgress()
    return Promise.reject(err)
  },
)

export default api
