import { apiClient } from './client';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

export { browserSupportsWebAuthn };

/** ログイン後に生体認証を登録する */
export async function registerBiometric() {
  // サーバーからチャレンジ取得
  const startRes = await apiClient('/api/auth/webauthn/register-start', { method: 'POST' });
  if (!startRes.success) throw new Error(startRes.message);

  // ブラウザの認証器（Face ID / 指紋）を起動
  const attResp = await startRegistration({ optionsJSON: startRes.options });

  // サーバーで検証
  const finishRes = await apiClient('/api/auth/webauthn/register-finish', {
    method: 'POST',
    body: JSON.stringify(attResp),
  });
  if (!finishRes.success) throw new Error(finishRes.message);
  return finishRes;
}

/** 生体認証でログイン */
export async function loginWithBiometric(employeeId) {
  // サーバーからチャレンジ取得
  const startRes = await apiClient('/api/auth/webauthn/login-start', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  });
  if (!startRes.success) throw new Error(startRes.message);

  // ブラウザの認証器を起動
  const assertResp = await startAuthentication({ optionsJSON: startRes.options });

  // サーバーで検証 → JWT 取得
  const finishRes = await apiClient('/api/auth/webauthn/login-finish', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, response: assertResp }),
  });
  if (!finishRes.success) throw new Error(finishRes.message);
  return finishRes; // { token, user }
}

/** 生体認証の登録状況を確認 */
export async function getBiometricStatus() {
  return apiClient('/api/auth/webauthn/status', { method: 'GET' });
}
