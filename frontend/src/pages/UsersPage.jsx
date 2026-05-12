import React, { useState, useEffect } from 'react';
import { usersAPI } from '../utils/api';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Quản trị viên', editor: 'Biên tập viên', viewer: 'Người xem' };
const ROLE_COLORS = {
  admin:  { bg: '#dbeafe', color: '#1e40af' },
  editor: { bg: '#dcfce7', color: '#166534' },
  viewer: { bg: '#fef9c3', color: '#854d0e' },
};

function roleColor(role) {
  return role === 'admin' ? '#dbeafe' : role === 'editor' ? '#dcfce7' : '#fef9c3';
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [search, setSearch]       = useState('');
  const [toast, setToast]         = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try { const { data } = await usersAPI.list(); setUsers(data); }
    catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleRoleChange = async (id, role) => {
    try { await usersAPI.setRole(id, role); fetchUsers(); showToast('Đã cập nhật vai trò'); }
    catch { showToast('Lỗi cập nhật vai trò'); }
  };

  const handleToggleStatus = async (u) => {
    try {
      await usersAPI.setStatus(u.id, !u.is_active);
      fetchUsers();
      showToast(u.is_active ? 'Đã vô hiệu hoá tài khoản' : 'Đã kích hoạt tài khoản');
    } catch { showToast('Lỗi cập nhật trạng thái'); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Người dùng</h1>
          <p style={S.sub}>Quản lý tài khoản và phân quyền hệ thống</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowAdd(true)}>+ Thêm người dùng</button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: 'Tổng tài khoản', value: users.length },
          { label: 'Đang hoạt động', value: users.filter(u => u.is_active).length },
          { label: 'Quản trị viên',  value: users.filter(u => u.role === 'admin').length },
          { label: 'Biên tập viên',  value: users.filter(u => u.role === 'editor').length },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statVal}>{s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span>🔍</span>
          <input
            style={S.searchInput}
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
        <span style={S.count}>{filtered.length} người dùng</span>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr style={S.thead}>
              {['Người dùng', 'Phòng ban', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={S.empty}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={S.empty}>Không tìm thấy người dùng</td></tr>
            ) : filtered.map(u => {
              const rc = ROLE_COLORS[u.role] || {};
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} style={{ ...S.tr, ...(u.is_active ? {} : S.trInactive) }}>
                  <td style={S.td}>
                    <div style={S.userCell}>
                      <div style={{ ...S.avatar, background: roleColor(u.role) }}>
                        {u.avatar_initials || u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={S.userName}>
                          {u.name}
                          {isSelf && <span style={S.selfTag}>Bạn</span>}
                        </div>
                        <div style={S.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.meta}>{u.department || '—'}</span></td>
                  <td style={S.td}>
                    {isSelf ? (
                      <span style={{ ...S.roleTag, ...rc }}>{ROLE_LABELS[u.role]}</span>
                    ) : (
                      <select
                        style={{ ...S.roleSelect, background: rc.bg, color: rc.color }}
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="admin">Quản trị viên</option>
                        <option value="editor">Biên tập viên</option>
                        <option value="viewer">Người xem</option>
                      </select>
                    )}
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.statusDot, background: u.is_active ? '#22c55e' : '#d1d5db' }} />
                    <span style={{ fontSize: 12, color: u.is_active ? '#166534' : '#9ca3af' }}>
                      {u.is_active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td style={S.td}>
                    <span style={S.meta}>{new Date(u.created_at).toLocaleDateString('vi-VN')}</span>
                  </td>
                  <td style={S.tdAction}>
                    {!isSelf && (
                      <button
                        style={{ ...S.actionBtn, ...(u.is_active ? S.actionBtnWarn : S.actionBtnOk) }}
                        onClick={() => handleToggleStatus(u)}
                        title={u.is_active ? 'Vô hiệu hoá' : 'Kích hoạt'}
                      >
                        {u.is_active ? '🚫 Vô hiệu hoá' : '✓ Kích hoạt'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchUsers(); showToast('Đã thêm người dùng'); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) return setError('Vui lòng điền đầy đủ thông tin bắt buộc');
    if (form.password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự');
    setSaving(true); setError('');
    try {
      // Dùng axios instance để tự động gắn JWT và tránh lỗi CORS
      await api.post('/auth/register', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Tạo tài khoản thất bại');
    } finally { setSaving(false); }
  };

  return (
    <div style={M.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={M.modal}>
        <div style={M.header}>
          <h2 style={M.title}>Thêm người dùng mới</h2>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={M.body}>
          {[
            { key: 'name',       label: 'Họ tên *',         type: 'text',     placeholder: 'Nguyễn Văn A' },
            { key: 'email',      label: 'Email *',          type: 'email',    placeholder: 'email@company.com' },
            { key: 'password',   label: 'Mật khẩu *',       type: 'password', placeholder: 'Tối thiểu 6 ký tự' },
            { key: 'department', label: 'Phòng ban',        type: 'text',     placeholder: 'IT, Kế toán...' },
          ].map(f => (
            <div key={f.key} style={M.field}>
              <label style={M.label}>{f.label}</label>
              <input style={M.input} type={f.type} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div style={M.field}>
            <label style={M.label}>Vai trò</label>
            <select style={M.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="viewer">Người xem</option>
              <option value="editor">Biên tập viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
          {error && <div style={M.error}>{error}</div>}
        </div>
        <div style={M.footer}>
          <button style={M.btnSecondary} onClick={onClose} disabled={saving}>Huỷ</button>
          <button style={M.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { padding: 24, flex: 1, overflow: 'auto', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  sub: { fontSize: 13, color: '#888', margin: '4px 0 0' },
  btnPrimary: { padding: '9px 18px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: '#fff', border: '1px solid #e8e8e6', borderRadius: 10, padding: '14px 16px' },
  statVal: { fontSize: 24, fontWeight: 600, color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e0e0de', borderRadius: 8, padding: '8px 12px', flex: 1 },
  searchInput: { border: 'none', outline: 'none', fontSize: 14, width: '100%', background: 'transparent' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 12 },
  count: { fontSize: 13, color: '#888', whiteSpace: 'nowrap' },
  tableWrap: { background: '#fff', border: '1px solid #e5e5e3', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead: { background: '#fafaf8' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f0f0ee' },
  tr: { borderBottom: '1px solid #f5f5f3', transition: 'background .1s' },
  trInactive: { opacity: 0.5 },
  td: { padding: '12px 14px', verticalAlign: 'middle' },
  tdAction: { padding: '8px 14px', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, color: '#333' },
  userName: { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  selfTag: { fontSize: 10, background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '1px 5px', marginLeft: 6, fontWeight: 500 },
  userEmail: { fontSize: 11, color: '#888', marginTop: 1 },
  meta: { fontSize: 12, color: '#666' },
  roleTag: { fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20 },
  roleSelect: { fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 20, border: 'none', outline: 'none', cursor: 'pointer' },
  statusDot: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 6 },
  actionBtn: { fontSize: 11, fontWeight: 500, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' },
  actionBtnWarn: { background: '#fff0ec', color: '#b84020' },
  actionBtnOk: { background: '#f0fdf4', color: '#166534' },
  empty: { padding: 48, textAlign: 'center', color: '#bbb', fontSize: 14 },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,.2)' },
};

const M = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' },
  title: { fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#888' },
  body: { padding: '16px 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 500, color: '#555' },
  input: { padding: '9px 11px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit' },
  error: { padding: '10px 12px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, fontSize: 13, color: '#c00' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 24px 20px' },
  btnSecondary: { padding: '9px 20px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  btnPrimary: { padding: '9px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
};
