const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/activity/stats — PHẢI đứng trước / để không bị khớp nhầm
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [docs, users, downloads, uploads] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM documents WHERE is_deleted=false'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active=true'),
      pool.query("SELECT COUNT(*) FROM activity_logs WHERE action='download'"),
      pool.query("SELECT COUNT(*) FROM activity_logs WHERE action='upload' AND created_at > NOW() - INTERVAL '30 days'"),
    ]);
    res.json({
      total_docs:          parseInt(docs.rows[0].count),
      total_users:         parseInt(users.rows[0].count),
      total_downloads:     parseInt(downloads.rows[0].count),
      uploads_this_month:  parseInt(uploads.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi thống kê' });
  }
});

// GET /api/activity — danh sách nhật ký (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { limit = 50 } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS user_name, u.avatar_initials, d.title AS doc_title
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN documents d ON d.id = al.document_id
       ORDER BY al.created_at DESC LIMIT $1`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải nhật ký' });
  }
});

module.exports = router;
