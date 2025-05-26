import zhTw from 'element-plus/es/locale/lang/zh-tw'

export default {
  ...zhTw,
  el: {
    ...zhTw.el,
    pagination: {
      ...zhTw.el.pagination,
      goto: '前往',
      pagesize: ' 個/筆',
      total: '共 {total} 筆',
      pageClassifier: '頁',
    },
  },
}
