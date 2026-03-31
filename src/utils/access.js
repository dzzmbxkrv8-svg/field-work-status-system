import { ADMIN_ACCESS_LENGTH } from './constants.js'

/** Character set used when generating administrator access codes. */
const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Access Code Utility
 * @param {string[]} existing - Codes already in use.
 * @returns {string} 一意の8桁英数字コードを生成
 */
export function generateAccessCode(existing = []) {
  let code = ''
  const taken = new Set(existing)
  do {
    code = ''
    for (let index = 0; index < ADMIN_ACCESS_LENGTH; index += 1) {
      code += ACCESS_CODE_CHARS[Math.floor(Math.random() * ACCESS_CODE_CHARS.length)]
    }
  } while (taken.has(code))
  return code
}

/**
 * Worker ID Utility
 * @param {string} name - 作業者の氏名
 * @returns {string} 頭文字＋タイムスタンプ由来のID
 */
export function generateWorkerId(name) {
  const initials = name ? name.slice(0, 1).toUpperCase() : 'W'
  return `${initials}${Date.now().toString(36).toUpperCase()}`
}
