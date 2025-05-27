import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/tailwind.css'
import '@/assets/base.css'
import zhTwOverride from './lang/zh-tw'
import VueClipboard from 'vue3-clipboard'

const app = createApp(App)

app.use(ElementPlus, {
  locale: zhTwOverride,
})

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(VueClipboard, {
  autoSetContainer: true,
  appendToBody: true,
})

app.mount('#app')
