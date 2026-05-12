const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  const { type } = req.query;
  const params = type ? [type] : [];
  const where = type ? 'WHERE type = $1' : '';
  const { rows } = await pool.query(`SELECT * FROM catalogs ${where} ORDER BY name`, params);
  res.json(rows);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, type, province } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Thiếu name hoặc type' });
  const { rows } = await pool.query(
    `INSERT INTO catalogs (name, type, province) VALUES ($1,$2,$3) RETURNING *`,
    [name, type, province || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { name, province } = req.body;
  const { rows } = await pool.query(
    `UPDATE catalogs SET name=$1, province=$2 WHERE id=$3 RETURNING *`,
    [name, province || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(rows[0]);
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM catalogs WHERE id=$1', [req.params.id]);
  res.json({ message: 'Đã xoá' });
});

module.exports = router;
