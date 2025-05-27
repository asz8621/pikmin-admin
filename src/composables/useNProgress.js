import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

export function useNProgress() {
  const startProgress = () => {
    NProgress.start()
  }

  const finishProgress = () => {
    NProgress.done()
  }

  const setProgress = (progress) => NProgress.set(progress)

  return {
    startProgress,
    finishProgress,
    setProgress,
  }
}
