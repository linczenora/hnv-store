import React, { useState } from 'react';
import { docsAPI } from '../utils/api';

export default function DeleteConfirmModal({ doc, onClose, onSuccess }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const isMatch = confirm.trim().toLowerCase() === doc.title.toLowerCase();

  const handleDelete = async () => {
    if (!isMatch) return;
    setDeleting(true);
    try {
      await docsAPI.delete(doc.id);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Xoá thất bại');
      setDeleting(false);
    }
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.iconRow}>
          <div style={S.warningCircle}>🗑️</div>
        </div>
        <h2 style={S.title}>Xoá tài liệu?</h2>
        <p style={S.desc}>
          Tài liệu <strong>"{doc.title}"</strong> sẽ bị xoá khỏi hệ thống.
          Hành động này <strong>không thể hoàn tác</strong>.
        </p>

        <div style={S.field}>
          <label style={S.label}>
            Nhập tên tài liệu để xác nhận xoá:
          </label>
          <input
            style={{ ...S.input, ...(confirm && !isMatch ? { borderColor: '#f87171', background: '#fff5f5' } : {}), ...(isMatch ? { borderColor: '#34d399', background: '#f0fdf4' } : {}) }}
            placeholder={doc.title}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(''); }}
            autoFocus
          />
          {confirm && !isMatch && (
            <span style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Tên không khớp</span>
          )}
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={S.actions}>
          <button style={S.btnCancel} onClick={onClose} disabled={deleting}>Huỷ bỏ</button>
          <button
            style={{ ...S.btnDelete, ...(!isMatch || deleting ? { opacity: .4, cursor: 'not-allowed' } : {}) }}
            onClick={handleDelete}
            disabled={!isMatch || deleting}
          >
            {deleting ? 'Đang xoá...' : 'Xác nhận xoá'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: '28px 28px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', textAlign: 'center' },
  iconRow: { marginBottom: 12 },
  warningCircle: { fontSize: 40, display: 'inline-block' },
  title: { fontSize: 17, fontWeight: 600, margin: '0 0 10px', color: '#1a1a1a' },
  desc: { fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.6, textAlign: 'left' },
  field: { textAlign: 'left', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s, background .15s' },
  errorBox: { padding: '8px 12px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, fontSize: 13, color: '#c00', textAlign: 'left', marginBottom: 12 },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  btnCancel: { padding: '9px 20px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  btnDelete: { padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity .15s' },
};
