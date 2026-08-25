const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { geocodeAddress } = require('../services/geocodingService');
const { scoreAndSelectWorkers } = require('../services/workerRecommendationService');

exports.getWorkers = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // 作業員同士のメッセージ送信先一覧としても使われるため作業員にも公開するが、
    // 電話番号・メールアドレスなど個人情報は管理者にのみ返す
    const { rows } = await db.query(`
      SELECT u.id, u.employee_id, u.name, u.furigana,
             ${isAdmin ? 'u.phone, u.email, u.address, u.status, u.skill_level,' : ''}
             u.team_id, t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'worker' AND u.is_active = true AND u.company_id = $1
        ${isAdmin ? '' : "AND u.status = 'active'"}
      ORDER BY ${isAdmin ? 'u.status DESC, ' : ''}u.created_at DESC
    `, [req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

exports.updateWorkerTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET team_id = $1 WHERE id = $2 AND role = 'worker' AND is_active = true AND company_id = $3
       RETURNING id, name, employee_id, team_id`,
      [teamId || null, id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && parseInt(id, 10) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'アクセス権がありません' });
    }
    const { rows } = await db.query(
      "SELECT id, employee_id, name, furigana, role, team_id FROM users WHERE id=$1 AND role='worker' AND is_active=true AND company_id=$2",
      [id, req.user.company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.createWorker = async (req, res, next) => {
  try {
    const { employee_id, name, furigana, password, team_id } = req.body;
    if (!employee_id || !employee_id.trim()) {
      return res.status(400).json({ success: false, message: '社員IDは必須です' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'パスワードは6文字以上で入力してください' });
    }
    const existing = await db.query(
      'SELECT id FROM users WHERE employee_id=$1 AND company_id=$2',
      [employee_id.trim(), req.user.company_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'この社員IDはすでに使用されています' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, name, furigana, role, team_id, password_hash, company_id)
       VALUES ($1, $2, $3, 'worker', $4, $5, $6)
       RETURNING id, employee_id, name, furigana, role, team_id`,
      [employee_id.trim(), name.trim(), furigana?.trim() || null, team_id || null, password_hash, req.user.company_id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, furigana, phone, email, address, team_id, skill_level } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    if (skill_level !== undefined && skill_level !== null && ![1, 2, 3].includes(Number(skill_level))) {
      return res.status(400).json({ success: false, message: 'スキルレベルは1〜3で指定してください' });
    }

    // 住所からの座標算出はベストエフォート（ジオコーディングAPI未設定・失敗でも
    // 住所自体の保存は妨げない。自動アサイン機能ではlat/lng未設定として扱われる）。
    // 住所が変更されていない場合は既存のlat/lngをそのまま使い、無駄なAPI呼び出しを避ける。
    const trimmedAddress = address?.trim() || null;
    let lat = null, lng = null;
    const existing = await db.query('SELECT address, lat, lng FROM users WHERE id=$1', [id]);
    const previous = existing.rows[0];
    if (trimmedAddress && previous && previous.address === trimmedAddress) {
      lat = previous.lat;
      lng = previous.lng;
    } else if (trimmedAddress) {
      try {
        const coords = await geocodeAddress(trimmedAddress);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      } catch (geoErr) {
        console.warn('[updateWorker] ジオコーディングに失敗しました:', geoErr.message);
      }
    }

    // 作業員のパスワードは管理者が直接設定できないようにする（本人のみが
    // ログイン画面の「パスワードを忘れた場合」からメール経由で変更可能）
    const { rows } = await db.query(
      `UPDATE users SET name=$1, furigana=$2, phone=$3, email=$4, address=$5, team_id=$6,
              skill_level=$7, lat=$8, lng=$9, updated_at=NOW()
       WHERE id=$10 AND role='worker' AND is_active=true AND company_id=$11
       RETURNING id, employee_id, name, furigana, phone, email, address, skill_level, role, team_id`,
      [
        name.trim(), furigana?.trim()||null, phone?.trim()||null, email?.trim()||null, trimmedAddress,
        team_id||null, skill_level != null ? Number(skill_level) : null, lat, lng,
        id, req.user.company_id,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE users SET is_active=false, updated_at=NOW()
       WHERE id=$1 AND role='worker' AND is_active=true AND company_id=$2 RETURNING id`,
      [id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, message: '作業員を無効化しました' });
  } catch (err) {
    next(err);
  }
};

// 承認待ち作業員の一覧取得
exports.getPendingWorkers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id, employee_id, name, furigana, phone, email, created_at
      FROM users
      WHERE role = 'worker' AND is_active = true AND status = 'pending' AND company_id = $1
      ORDER BY created_at DESC
    `, [req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// 現場住所と必要人数から、距離・稼働負荷・スキルバランスを考慮した候補作業員を提案する
exports.recommendWorkers = async (req, res, next) => {
  try {
    const { location, count } = req.body;
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, message: '現場住所(location)は必須です' });
    }
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ success: false, message: '必要人数(count)は1以上の整数で指定してください' });
    }

    let site = null;
    try {
      site = await geocodeAddress(location.trim());
    } catch (err) {
      if (err.code === 'GEOCODING_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: '位置情報API(GOOGLE_MAPS_API_KEY)が未設定のため、AIおまかせ機能を利用できません',
        });
      }
      return res.status(502).json({ success: false, message: err.message || '現場住所のジオコーディングに失敗しました' });
    }
    // site === null（該当住所なし）の場合は、全員「距離不明」として負荷バランスのみで並べる

    const { rows: workers } = await db.query(`
      SELECT u.id, u.name, u.lat, u.lng, u.skill_level, t.name as team_name,
        (
          SELECT COUNT(DISTINCT a.id) FROM assignments a
          WHERE a.company_id = u.company_id
            AND a.status != 'cancelled'
            AND a.created_at >= NOW() - INTERVAL '30 days'
            AND (a.assigned_worker_id = u.id OR EXISTS (
              SELECT 1 FROM assignment_members am WHERE am.assignment_id = a.id AND am.user_id = u.id
            ))
        ) AS recent_load
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'worker' AND u.is_active = true AND u.status = 'active' AND u.company_id = $1
      ORDER BY u.name
    `, [req.user.company_id]);

    const { candidates, recommendedIds } = scoreAndSelectWorkers(site, workers, n);

    res.status(200).json({
      success: true,
      data: { candidates, recommendedIds, siteResolved: site !== null },
    });
  } catch (err) {
    next(err);
  }
};

// 作業員を承認（pending → active）
exports.approveWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE users SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND role = 'worker' AND status = 'pending' AND company_id = $2
       RETURNING id, employee_id, name, status`,
      [id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '対象の作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};
