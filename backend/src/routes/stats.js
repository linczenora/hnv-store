const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// ── Helper: build date condition ─────────────────────────────────────────────
function dateCondition(field, from, to) {
  const parts = [];
  if (from) parts.push(`${field} >= '${from}'::date`);
  if (to)   parts.push(`${field} <= ('${to}'::date + interval '1 day')`);
  return parts.length ? 'AND ' + parts.join(' AND ') : '';
}

// GET /api/stats/activity-pie?from=&to=
// Tỷ lệ upload / view / download theo khoảng thời gian
router.get('/activity-pie', authenticate, requireRole('admin'), async (req, res) => {
  const { from, to } = req.query;
  const dc = dateCondition('created_at', from, to);
  try {
    const { rows } = await pool.query(`
      SELECT action, COUNT(*)::int AS count
      FROM activity_logs
      WHERE action IN ('upload','view','download') ${dc}
      GROUP BY action
      ORDER BY action
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi thống kê' });
  }
});

// GET /api/stats/docs-by-folder?from=&to=
// Số tài liệu theo từng folder, lọc theo ngày tải lên
router.get('/docs-by-folder', authenticate, requireRole('admin'), async (req, res) => {
  const { from, to } = req.query;
  const dc = dateCondition('d.created_at', from, to);
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(f.name, 'Chưa phân loại') AS folder,
        COUNT(d.id)::int AS count
      FROM documents d
      LEFT JOIN folders f ON f.id = d.folder_id
      WHERE d.is_deleted = false ${dc}
      GROUP BY COALESCE(f.name, 'Chưa phân loại')
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi thống kê' });
  }
});

// GET /api/stats/report?from=&to=&user_id=&folder_id=&page=&limit=
// Báo cáo chi tiết tài liệu — dùng cho trang Thống kê
router.get('/report', authenticate, requireRole('admin'), async (req, res) => {
  const { from, to, user_id, folder_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conds  = ['d.is_deleted = false'];

  if (from)      { params.push(from);      conds.push(`d.created_at >= $${params.length}::date`); }
  if (to)        { params.push(to);        conds.push(`d.created_at <= ($${params.length}::date + interval '1 day')`); }
  if (user_id)   { params.push(user_id);   conds.push(`d.uploaded_by = $${params.length}`); }
  if (folder_id) { params.push(folder_id); conds.push(`d.folder_id = $${params.length}`); }

  const where = conds.join(' AND ');
  try {
    const [rows, countRes] = await Promise.all([
      pool.query(`
        SELECT
          d.id, d.title, d.file_type, d.file_size, d.current_version,
          d.access_level, d.created_at AS uploaded_at,
          u.name  AS uploader_name,
          f.name  AS folder_name,
          -- Lần tải xuống gần nhất
          (SELECT MAX(al.created_at) FROM activity_logs al
           WHERE al.document_id = d.id AND al.action = 'download') AS last_downloaded_at,
          -- Tổng lần tải xuống
          d.download_count
        FROM documents d
        LEFT JOIN users   u ON u.id = d.uploaded_by
        LEFT JOIN folders f ON f.id = d.folder_id
        WHERE ${where}
        ORDER BY d.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `, params),
      pool.query(`SELECT COUNT(*)::int AS total FROM documents d WHERE ${where}`, params),
    ]);
    res.json({ data: rows.rows, total: countRes.rows[0].total, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi báo cáo' });
  }
});

// GET /api/stats/upload-trend?from=&to=&group_by=day|week|month
// Xu hướng tải lên theo thời gian (dùng cho chart tương lai)
router.get('/upload-trend', authenticate, requireRole('admin'), async (req, res) => {
  const { from, to, group_by = 'day' } = req.query;
  const dc = dateCondition('created_at', from, to);
  const trunc = group_by === 'month' ? 'month' : group_by === 'week' ? 'week' : 'day';
  try {
    const { rows } = await pool.query(`
      SELECT DATE_TRUNC('${trunc}', created_at)::date AS period, COUNT(*)::int AS count
      FROM documents
      WHERE is_deleted = false ${dc}
      GROUP BY period ORDER BY period
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thống kê' });
  }
});

module.exports = router;
