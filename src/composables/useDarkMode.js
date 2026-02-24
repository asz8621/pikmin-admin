import { ref, onMounted } from 'vue'

const isDark = ref(false)

export function useDarkMode() {
  const toggleDark = () => {
    isDark.value = !isDark.value
    applyTheme()
    saveDarkMode()
  }

  const applyTheme = () => {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.classList.toggle('light', !isDark.value)
  }

  const saveDarkMode = () => {
    localStorage.setItem('isDark', JSON.stringify(isDark.value))
  }

  const loadDarkMode = () => {
    const stored = localStorage.getItem('isDark')
    if (stored !== null) {
      isDark.value = JSON.parse(stored)
      applyTheme()
    }
  }

  onMounted(() => {
    loadDarkMode()
  })

  return {
    isDark,
    toggleDark,
  }
}
