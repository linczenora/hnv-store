import React, { useState, useEffect } from 'react';
import { usersAPI, docsAPI } from '../utils/api';

export default function PermissionModal({ doc, onClose }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: '', can_view: true, can_edit: false, can_delete: false });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usersAPI.list().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.user_id) return setError('Vui lòng chọn người dùng');
    setError('');
    try {
      await docsAPI.setPermissions(doc.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi cập nhật quyền');
    }
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <h2 style={S.title}>Phân quyền truy cập</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.docInfo}>
          <span style={S.docLabel}>Tài liệu:</span>
          <span style={S.docName}>{doc.title}</span>
        </div>
        <div style={S.body}>
          <div style={S.field}>
            <label style={S.label}>Người dùng</label>
            <select style={S.select} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">— Chọn người dùng —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div style={S.checkGroup}>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={form.can_view} onChange={e => setForm(f => ({ ...f, can_view: e.target.checked }))} />
              Xem tài liệu
            </label>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={form.can_edit} onChange={e => setForm(f => ({ ...f, can_edit: e.target.checked }))} />
              Chỉnh sửa / tải phiên bản mới
            </label>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={form.can_delete} onChange={e => setForm(f => ({ ...f, can_delete: e.target.checked }))} />
              Xoá tài liệu
            </label>
          </div>
          {error && <div style={S.error}>{error}</div>}
          {saved && <div style={S.success}>Đã lưu quyền truy cập</div>}
        </div>
        <div style={S.actions}>
          <button style={S.btnSecondary} onClick={onClose}>Đóng</button>
          <button style={S.btnPrimary} onClick={handleSave}>Lưu quyền</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' },
  title: { fontSize: '16px', fontWeight: '600', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#888' },
  docInfo: { padding: '10px 24px', background: '#fafaf8', borderTop: '1px solid #f0f0ee', borderBottom: '1px solid #f0f0ee', display: 'flex', gap: '8px', alignItems: 'center' },
  docLabel: { fontSize: '12px', color: '#888' },
  docName: { fontSize: '13px', fontWeight: '500', color: '#1a1a1a' },
  body: { padding: '20px 24px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '6px' },
  select: { width: '100%', padding: '9px 11px', border: '1px solid #e0e0de', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' },
  checkGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#333', cursor: 'pointer' },
  error: { marginTop: '12px', padding: '8px 12px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: '8px', fontSize: '13px', color: '#c00' },
  success: { marginTop: '12px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#166534' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 24px 20px' },
  btnSecondary: { padding: '8px 18px', border: '1px solid #e0e0de', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' },
  btnPrimary: { padding: '8px 18px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
};
