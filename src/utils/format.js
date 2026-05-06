/**
 * CSV Utility
 * @param {string|number|null|undefined} value - Export対象
 * @returns {string} CSV仕様にエスケープされた文字列
 */
export function escapeForCsv(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/**
 * Blob Downloader
 * @param {string} filename - 保存名
 * @param {Blob} blob - ダウンロード対象
 */
export function downloadBlob(filename, blob) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Admin date formatter for YYYY-MM-DD-Day strings.
 * @param {string|Date} value - 日付
 * @returns {string} 曜日付きの日付文字列
 */
export function formatAdminDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayName = dayNames[date.getDay()]
  return `${year}年${month}月${day}日 ${dayName}`
}
