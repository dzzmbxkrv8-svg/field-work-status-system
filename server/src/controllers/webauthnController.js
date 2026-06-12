const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const RP_NAME = 'Fieldo';
const RP_ID   = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

// チャレンジを一時保存（本番は Redis などに移行推奨）
const challengeStore = new Map();

// ── 登録 ──────────────────────────────────────────────────────────────────

// POST /api/auth/webauthn/register-start
exports.registerStart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      'SELECT employee_id, name FROM users WHERE id = $1', [userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 既存のクレデンシャルを取得（除外リスト用）
    const existing = await db.query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1', [userId]
    );

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID:   RP_ID,
      userID: Buffer.from(String(userId)),
      userName: user.employee_id,
      userDisplayName: user.name,
      excludeCredentials: existing.rows.map(r => ({
        id: Buffer.from(r.credential_id, 'base64url'),
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    challengeStore.set(String(userId), options.challenge);
    res.json({ success: true, options });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/webauthn/register-finish
exports.registerFinish = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const expectedChallenge = challengeStore.get(String(userId));
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'チャレンジが見つかりません' });
    }

    const { body } = req;
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: '認証情報の検証に失敗しました' });
    }

    const { credential } = verification.registrationInfo;
    await db.query(
      `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (credential_id) DO UPDATE
         SET counter = EXCLUDED.counter, backed_up = EXCLUDED.backed_up`,
      [
        userId,
        Buffer.from(credential.id).toString('base64url'),
        Buffer.from(credential.publicKey).toString('base64url'),
        credential.counter,
        verification.registrationInfo.credentialDeviceType || null,
        verification.registrationInfo.credentialBackedUp || false,
      ]
    );

    challengeStore.delete(String(userId));
    res.json({ success: true, message: '生体認証を登録しました' });
  } catch (err) {
    next(err);
  }
};

// ── 認証 ──────────────────────────────────────────────────────────────────

// POST /api/auth/webauthn/login-start
exports.loginStart = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const { rows } = await db.query(
      `SELECT u.id, wc.credential_id
       FROM users u
       JOIN webauthn_credentials wc ON wc.user_id = u.id
       WHERE u.employee_id = $1 AND u.is_active = true AND u.status = 'active'`,
      [employee_id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '生体認証が登録されていません' });
    }

    const userId = rows[0].id;
    const allowCredentials = rows.map(r => ({
      id: Buffer.from(r.credential_id, 'base64url'),
      type: 'public-key',
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials,
    });

    challengeStore.set(`auth_${userId}`, { challenge: options.challenge, userId });
    res.json({ success: true, options });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/webauthn/login-finish
exports.loginFinish = async (req, res, next) => {
  try {
    const { employee_id, response } = req.body;

    const { rows: userRows } = await db.query(
      `SELECT u.id, u.employee_id, u.name, u.role, u.team_id, u.status,
              t.name as team_name
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.employee_id = $1 AND u.is_active = true AND u.status = 'active'`,
      [employee_id]
    );
    if (!userRows.length) {
      return res.status(401).json({ success: false, message: 'ユーザーが見つかりません' });
    }
    const user = userRows[0];

    const stored = challengeStore.get(`auth_${user.id}`);
    if (!stored) {
      return res.status(400).json({ success: false, message: 'チャレンジが見つかりません' });
    }

    // クレデンシャルを取得
    const credId = Buffer.from(response.rawId, 'base64url').toString('base64url');
    const { rows: credRows } = await db.query(
      'SELECT * FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2',
      [credId, user.id]
    );
    if (!credRows.length) {
      return res.status(400).json({ success: false, message: 'クレデンシャルが見つかりません' });
    }
    const cred = credRows[0];

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: Buffer.from(cred.credential_id, 'base64url'),
        publicKey: Buffer.from(cred.public_key, 'base64url'),
        counter: Number(cred.counter),
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, message: '生体認証に失敗しました' });
    }

    // カウンター更新
    await db.query(
      'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, credId]
    );

    challengeStore.delete(`auth_${user.id}`);

    // JWT 発行
    const token = jwt.sign(
      { id: user.id, employee_id: user.employee_id, role: user.role, team_id: user.team_id, team_name: user.team_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id, employee_id: user.employee_id, name: user.name,
        role: user.role, team_id: user.team_id, team_name: user.team_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/webauthn/status — 生体認証登録済みか確認
exports.status = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, registered: Number(rows[0].count) > 0 });
  } catch (err) {
    next(err);
  }
};
