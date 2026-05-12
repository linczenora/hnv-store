import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Dùng setTimeout để đảm bảo state user đã được set trước khi navigate
      setTimeout(() => navigate('/'), 50);
    } catch (err) {
      setError(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>📁</div>
          <h1 style={styles.logoText}>DocVault</h1>
          <p style={styles.logoSub}>Hệ thống quản lý tài liệu nội bộ</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
              placeholder="email@company.com"
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mật khẩu</label>
            <input
              style={styles.input}
              type="password"
              value={form.password}
              onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
              placeholder="••••••••"
              required
            />
          </div>
          {/* Thông báo lỗi — hiển thị cố định, không tự biến mất */}
          {error && (
            <div style={styles.error}>
              <span style={{ marginRight: 6 }}>⚠️</span>{error}
            </div>
          )}
          <button style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }} type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={styles.hint}>Tài khoản mặc định: admin@company.com / Admin@123</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f5f5f3', padding: '20px',
  },
  card: {
    background: '#fff', borderRadius: '12px',
    border: '1px solid #e5e5e3', padding: '40px',
    width: '100%', maxWidth: '400px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logo: { textAlign: 'center', marginBottom: '32px' },
  logoIcon: { fontSize: '36px', marginBottom: '8px' },
  logoText: { fontSize: '22px', fontWeight: '600', margin: '0 0 4px', color: '#1a1a1a' },
  logoSub: { fontSize: '13px', color: '#888', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#444' },
  input: {
    padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
  },
  error: {
    padding: '10px 12px',
    background: '#fff0f0', border: '1px solid #fcc',
    borderRadius: '8px', fontSize: '13px', color: '#c00',
    display: 'flex', alignItems: 'center',
  },
  btn: {
    padding: '11px', background: '#1a1a1a', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer', marginTop: '4px',
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  hint: { marginTop: '20px', fontSize: '12px', color: '#aaa', textAlign: 'center' },
};
