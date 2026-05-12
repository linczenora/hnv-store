const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/users — admin only
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, department, avatar_initials, is_active, created_at FROM users ORDER BY name`
  );
  res.json(rows);
});

// PUT /api/users/:id/role — admin only
router.put('/:id/role', authenticate, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin','editor','viewer'].includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' });
  const { rows } = await pool.query(
    'UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name, email, role',
    [role, req.params.id]
  );
  res.json(rows[0]);
});

// PUT /api/users/:id/status
router.put('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name, is_active',
    [is_active, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Không thể xoá chính mình' });
  await pool.query('UPDATE users SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'Đã vô hiệu hoá người dùng' });
});

module.exports = router;
