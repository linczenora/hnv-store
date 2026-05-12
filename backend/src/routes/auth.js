const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, avatar_initials: user.avatar_initials },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// POST /api/auth/register
// Công khai cho lần setup đầu; sau đó chỉ admin mới được tạo tài khoản mới
router.post('/register', async (req, res) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });

  // Chỉ admin được chỉ định role; người dùng mới mặc định là viewer
  const authHeader = req.headers.authorization;
  let callerRole = 'anonymous';
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      callerRole = payload.role;
    } catch {}
  }
  const role = callerRole === 'admin' ? (req.body.role || 'viewer') : 'viewer';

  try {
    const hash = await bcrypt.hash(password, 10);
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, avatar_initials)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, department`,
      [name.trim(), email.toLowerCase().trim(), hash, role, department || null, initials]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email này đã được sử dụng' });
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, department, avatar_initials, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Người dùng không tồn tại' });
  res.json(rows[0]);
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Đổi mật khẩu thành công' });
});

module.exports = router;
