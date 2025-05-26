import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const formatted = dayjs.utc(dateStr).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')
  return formatted === 'Invalid Date' ? '-' : formatted
}

export { dayjs }
