// routes/folders.js
const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT f.*, COUNT(d.id) AS doc_count
     FROM folders f LEFT JOIN documents d ON d.folder_id = f.id AND d.is_deleted = false
     GROUP BY f.id ORDER BY f.name`
  );
  res.json(rows);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, parent_id } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO folders (name, parent_id, created_by) VALUES ($1,$2,$3) RETURNING *`,
    [name, parent_id || null, req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM folders WHERE id=$1', [req.params.id]);
  res.json({ message: 'Đã xoá thư mục' });
});

module.exports = router;

// PUT /api/folders/:id — rename
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên thư mục' });
  const { rows } = await pool.query(
    `UPDATE folders SET name=$1 WHERE id=$2 RETURNING *`, [name, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(rows[0]);
});
