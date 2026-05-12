import React, { useState, useEffect, useRef, useCallback } from 'react';
import { docsAPI } from '../utils/api';

export default function EditDocModal({ doc, folders, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: doc.title,
    description: doc.description || '',
    folder_id: doc.folder_id || '',
    access_level: doc.access_level,
  });
  const [saving, setSaving] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dupRef = useRef(null);

  // Debounced duplicate check (skip if title unchanged)
  const triggerDupCheck = useCallback((title, folder_id) => {
    clearTimeout(dupRef.current);
    const isSameTitle = title.trim().toLowerCase() === doc.title.toLowerCase();
    const isSameFolder = folder_id === (doc.folder_id || '');
    if (isSameTitle && isSameFolder) { setDupWarning(null); return; }
    if (!title.trim()) { setDupWarning(null); return; }
    setCheckingDup(true);
    dupRef.current = setTimeout(async () => {
      try {
        const { data } = await docsAPI.checkDuplicate(title.trim(), folder_id || undefined, doc.id);
        setDupWarning(data.duplicate ? data.matches[0] : null);
      } catch {}
      setCheckingDup(false);
    }, 500);
  }, [doc.id, doc.title, doc.folder_id]);

  const handleChange = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    setError('');
    setSuccess('');
    if (key === 'title' || key === 'folder_id') triggerDupCheck(next.title, next.folder_id);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return setError('Tên tài liệu không được để trống');
    setSaving(true);
    setError('');
    try {
      await docsAPI.update(doc.id, {
        title: form.title.trim(),
        description: form.description,
        folder_id: form.folder_id || null,
        access_level: form.access_level,
      });
      setSuccess('Đã lưu thay đổi');
      setTimeout(() => onSuccess(), 800);
    } catch (err) {
      const body = err.response?.data;
      if (body?.error === 'duplicate') {
        setError(body.message);
      } else {
        setError(body?.error || 'Lưu thất bại');
      }
    } finally {
      setSaving(false);
    }
  };

  const isChanged =
    form.title.trim() !== doc.title ||
    form.description !== (doc.description || '') ||
    form.folder_id !== (doc.folder_id || '') ||
    form.access_level !== doc.access_level;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.title}>Chỉnh sửa tài liệu</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* File info chip */}
        <div style={S.fileChip}>
          <span style={S.fileTypeTag}>{doc.file_type.toUpperCase()}</span>
          <span style={S.fileOrigName}>{doc.file_name}</span>
          <span style={S.fileVer}>{doc.current_version}</span>
        </div>

        <div style={S.fields}>

          {/* Title */}
          <div style={S.field}>
            <label style={S.label}>
              Tên tài liệu <span style={{ color: '#e00' }}>*</span>
              {checkingDup && <span style={S.checking}> · Đang kiểm tra trùng...</span>}
            </label>
            <input
              style={{ ...S.input, ...(dupWarning ? { borderColor: '#f59e0b', background: '#fffbeb' } : {}) }}
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              autoFocus
            />
            {dupWarning && (
              <div style={S.warnBox}>
                <span>⚠️</span>
                <span style={S.warnText}>
                  Đã có tài liệu <strong>"{dupWarning.title}"</strong>
                  {dupWarning.folder_name ? ` trong thư mục "${dupWarning.folder_name}"` : ''}.
                  {' '}Vui lòng đổi tên hoặc chuyển thư mục.
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={S.field}>
            <label style={S.label}>Mô tả</label>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 64 }}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Ghi chú ngắn (tuỳ chọn)"
            />
          </div>

          {/* Folder + Access */}
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Thư mục</label>
              <select style={S.select} value={form.folder_id} onChange={e => handleChange('folder_id', e.target.value)}>
                <option value="">Chưa phân loại</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Quyền truy cập</label>
              <select style={S.select} value={form.access_level} onChange={e => handleChange('access_level', e.target.value)}>
                <option value="public">🌐 Công khai</option>
                <option value="internal">🏢 Nội bộ</option>
                <option value="private">🔒 Riêng tư</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}
        {success && <div style={S.successBox}>✓ {success}</div>}

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Huỷ</button>
          <button
            style={{ ...S.btnPrimary, ...(!isChanged || saving || !!dupWarning ? { opacity: .45, cursor: 'not-allowed' } : {}) }}
            onClick={handleSave}
            disabled={!isChanged || saving || !!dupWarning}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' },
  title: { fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#888', padding: 4 },
  fileChip: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 24px 16px', padding: '8px 12px', background: '#fafaf8', border: '1px solid #f0f0ee', borderRadius: 8 },
  fileTypeTag: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3' },
  fileOrigName: { fontSize: 12, color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileVer: { fontSize: 11, color: '#aaa', fontFamily: 'monospace' },
  fields: { padding: '0 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, flex: 1 },
  row: { display: 'flex', gap: 12 },
  label: { fontSize: 12, fontWeight: 500, color: '#555' },
  checking: { fontSize: 11, color: '#aaa', fontWeight: 400 },
  input: { padding: '9px 11px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' },
  select: { padding: '9px 11px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' },
  warnBox: { display: 'flex', gap: 6, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 6 },
  warnText: { fontSize: 12, color: '#92400e' },
  errorBox: { margin: '0 24px 12px', padding: '10px 12px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, fontSize: 13, color: '#c00' },
  successBox: { margin: '0 24px 12px', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 24px 20px' },
  btnSecondary: { padding: '9px 20px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  btnPrimary: { padding: '9px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity .15s' },
};
