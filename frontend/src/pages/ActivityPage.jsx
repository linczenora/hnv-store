import React, { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '../utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACTION_META = {
  upload:   { icon: '⬆', label: 'Tải lên',      bg: '#f0fdf4', color: '#166534' },
  download: { icon: '⬇', label: 'Tải xuống',    bg: '#eff6ff', color: '#1d5fa5' },
  view:     { icon: '👁', label: 'Xem',           bg: '#fafaf8', color: '#555'    },
  edit:     { icon: '✏️', label: 'Chỉnh sửa',    bg: '#fffbeb', color: '#92400e' },
  delete:   { icon: '🗑', label: 'Xoá',           bg: '#fff0ec', color: '#b84020' },
  share:    { icon: '🔗', label: 'Chia sẻ',       bg: '#f5f3ff', color: '#5b21b6' },
};

export default function ActivityPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [limit, setLimit]     = useState(50);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await activityAPI.list({ limit });
      setLogs(data);
    } catch {}
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter
    ? logs.filter(l => l.action === filter)
    : logs;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Nhật ký hoạt động</h1>
          <p style={S.subtitle}>Theo dõi mọi thao tác trên hệ thống</p>
        </div>
        <button style={S.refreshBtn} onClick={fetchLogs}>↻ Làm mới</button>
      </div>

      {/* Filter chips */}
      <div style={S.filterRow}>
        <span
          style={{ ...S.chip, ...(filter === '' ? S.chipActive : {}) }}
          onClick={() => setFilter('')}
        >Tất cả</span>
        {Object.entries(ACTION_META).map(([key, meta]) => (
          <span
            key={key}
            style={{ ...S.chip, ...(filter === key ? S.chipActive : {}) }}
            onClick={() => setFilter(key)}
          >
            {meta.icon} {meta.label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr style={S.theadRow}>
              {['Thao tác', 'Người dùng', 'Tài liệu', 'Thời gian'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={S.empty}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={S.empty}>Không có dữ liệu</td></tr>
            ) : filtered.map(log => {
              const meta = ACTION_META[log.action] || { icon: '•', label: log.action, bg: '#f5f5f5', color: '#555' };
              return (
                <tr key={log.id} style={S.tr}>
                  <td style={S.td}>
                    <span style={{ ...S.actionTag, background: meta.bg, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={S.userRow}>
                      <div style={S.avatar}>{log.avatar_initials || log.user_name?.[0] || '?'}</div>
                      <span style={S.userName}>{log.user_name || '—'}</span>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={S.docTitle}>{log.doc_title || <span style={{ color: '#ccc' }}>—</span>}</span>
                  </td>
                  <td style={S.td}>
                    <div style={S.timeCol}>
                      <span style={S.timeAgo}>
                        {formatDistanceToNow(new Date(log.created_at), { locale: vi, addSuffix: true })}
                      </span>
                      <span style={S.timeFull}>
                        {format(new Date(log.created_at), 'HH:mm dd/MM/yyyy')}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {!loading && filtered.length >= limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button style={S.loadMoreBtn} onClick={() => setLimit(l => l + 50)}>
            Tải thêm 50 bản ghi
          </button>
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { padding: 28, flex: 1, overflow: 'auto' },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title:      { fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' },
  subtitle:   { fontSize: 13, color: '#888', margin: 0 },
  refreshBtn: { padding: '8px 16px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  filterRow:  { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  chip:       { padding: '5px 12px', borderRadius: 20, border: '1px solid #e0e0de', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#555', transition: 'all .12s', userSelect: 'none' },
  chipActive: { background: '#1a1a1a', color: '#fff', borderColor: 'transparent' },
  tableWrap:  { background: '#fff', border: '1px solid #e5e5e3', borderRadius: 10, overflow: 'hidden' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  theadRow:   { background: '#fafaf8' },
  th:         { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid #f0f0ee' },
  tr:         { borderBottom: '1px solid #f5f5f3' },
  td:         { padding: '11px 16px', verticalAlign: 'middle' },
  actionTag:  { fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20 },
  userRow:    { display: 'flex', alignItems: 'center', gap: 8 },
  avatar:     { width: 26, height: 26, borderRadius: '50%', background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#555', flexShrink: 0 },
  userName:   { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  docTitle:   { fontSize: 13, color: '#444', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' },
  timeCol:    { display: 'flex', flexDirection: 'column', gap: 2 },
  timeAgo:    { fontSize: 12, color: '#555' },
  timeFull:   { fontSize: 11, color: '#bbb' },
  empty:      { padding: 48, textAlign: 'center', color: '#bbb', fontSize: 14 },
  loadMoreBtn:{ padding: '9px 24px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
};
