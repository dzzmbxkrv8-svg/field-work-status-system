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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dayName = dayNames[date.getDay()]
  return `${year}-${month}-${day}-${dayName}`
}
