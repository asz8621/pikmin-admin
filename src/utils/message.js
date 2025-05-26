import { ElMessage } from 'element-plus'

export const showMessage = (type = 'info', message) => {
  ElMessage({
    message,
    type,
    grouping: true,
  })
}
