import React, { useState, useEffect, useCallback } from 'react';
import { statsAPI, usersAPI, foldersAPI } from '../utils/api';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

function fmt(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: vi }); }
  catch { return '—'; }
}
function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '—'; }
}
function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024*1024) return (b/1024).toFixed(0)+' KB';
  return (b/1024/1024).toFixed(1)+' MB';
}

const PRESETS = [
  { key:'week',   label:'Tuần này' },
  { key:'month',  label:'Tháng này' },
  { key:'year',   label:'Năm này' },
  { key:'custom', label:'Tuỳ chọn' },
];

function getPresetRange(key) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  if (key === 'week') {
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    return { from: fmt(mon), to: fmt(now) };
  }
  if (key === 'month') {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  if (key === 'year') {
    return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
  }
  return { from: '', to: '' };
}

const ACCESS_LABELS = { public:'Công khai', internal:'Nội bộ', private:'Riêng tư' };
const ACCESS_COLORS = { public:'#f0fdf4', internal:'#eff6ff', private:'#fff0ec' };
const ACCESS_TEXT   = { public:'#166534', internal:'#1d5fa5', private:'#b84020' };

export default function ReportPage() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const LIMIT = 20;

  const [preset,  setPreset]  = useState('month');
  const [range,   setRange]   = useState(getPresetRange('month'));
  const [userId,  setUserId]  = useState('');
  const [folderId,setFolderId]= useState('');

  const [users,   setUsers]   = useState([]);
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    usersAPI.list().then(r => setUsers(r.data)).catch(() => {});
    foldersAPI.list().then(r => setFolders(r.data)).catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await statsAPI.report({
        from: range.from || undefined,
        to:   range.to   || undefined,
        user_id:   userId   || undefined,
        folder_id: folderId || undefined,
        page, limit: LIMIT,
      });
      setRows(data.data);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [range, userId, folderId, page]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const applyPreset = (key) => {
    setPreset(key);
    setPage(1);
    if (key !== 'custom') setRange(getPresetRange(key));
  };

  const handleExportCSV = () => {
    const headers = ['STT','Tên tài liệu','Loại','Thư mục','Người tải lên','Ngày tải lên','Lần tải xuống gần nhất','Tổng tải xuống','Kích thước','Quyền truy cập'];
    const csvRows = rows.map((r, i) => [
      i + 1 + (page-1)*LIMIT,
      `"${r.title}"`,
      r.file_type?.toUpperCase(),
      `"${r.folder_name || 'Chưa phân loại'}"`,
      `"${r.uploader_name || ''}"`,
      fmtDate(r.uploaded_at),
      fmtDate(r.last_downloaded_at),
      r.download_count || 0,
      formatBytes(r.file_size),
      ACCESS_LABELS[r.access_level] || r.access_level,
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `bao-cao-tai-lieu-${range.from||'all'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Thống kê & Báo cáo</h1>
          <p style={S.sub}>Khối lượng tài liệu theo người dùng và thời gian</p>
        </div>
        <button style={S.btnExport} onClick={handleExportCSV} disabled={rows.length === 0}>
          ⬇ Xuất CSV
        </button>
      </div>

      {/* Filters */}
      <div style={S.filterCard}>
        {/* Preset buttons */}
        <div style={S.filterRow}>
          <span style={S.filterLabel}>Khoảng thời gian</span>
          <div style={S.presetRow}>
            {PRESETS.map(p => (
              <button key={p.key}
                style={{ ...S.presetBtn, ...(preset===p.key ? S.presetActive : {}) }}
                onClick={() => applyPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="date" value={range.from} style={S.dateInput}
                onChange={e => { setRange(r => ({...r, from: e.target.value})); setPage(1); }} />
              <span style={{ color:'#888', fontSize:13 }}>→</span>
              <input type="date" value={range.to} style={S.dateInput}
                onChange={e => { setRange(r => ({...r, to: e.target.value})); setPage(1); }} />
            </div>
          )}
        </div>

        <div style={S.filterRow}>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Người dùng</span>
            <select style={S.select} value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}>
              <option value="">Tất cả</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Thư mục</span>
            <select style={S.select} value={folderId} onChange={e => { setFolderId(e.target.value); setPage(1); }}>
              <option value="">Tất cả</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ marginLeft:'auto', fontSize:13, color:'#888', alignSelf:'flex-end' }}>
            {loading ? 'Đang tải...' : `${total} tài liệu`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr style={S.thead}>
              {['STT','Tên tài liệu','Thư mục','Người tải lên','Ngày tải lên','Lần tải xuống gần nhất','Tổng TXuống','Kích thước','Quyền'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={S.empty}>Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={S.empty}>Không có dữ liệu trong khoảng thời gian này</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={S.tr}>
                <td style={{ ...S.td, color:'#aaa', width:40 }}>{(page-1)*LIMIT + i + 1}</td>
                <td style={S.td}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={S.typeTag}>{r.file_type?.toUpperCase()}</span>
                    <div>
                      <div style={S.docTitle}>{r.title}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{r.current_version}</div>
                    </div>
                  </div>
                </td>
                <td style={S.td}><span style={S.meta}>{r.folder_name || <span style={{color:'#ddd'}}>Chưa phân loại</span>}</span></td>
                <td style={S.td}><span style={S.meta}>{r.uploader_name || '—'}</span></td>
                <td style={S.td}><span style={S.meta}>{fmtDate(r.uploaded_at)}</span></td>
                <td style={S.td}><span style={S.meta}>{fmt(r.last_downloaded_at)}</span></td>
                <td style={{ ...S.td, textAlign:'center' }}>
                  <span style={{ ...S.meta, fontWeight: r.download_count > 0 ? 500 : 400, color: r.download_count > 0 ? '#1a1a1a' : '#ccc' }}>
                    {r.download_count || 0}
                  </span>
                </td>
                <td style={S.td}><span style={S.meta}>{formatBytes(r.file_size)}</span></td>
                <td style={S.td}>
                  <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20,
                    background: ACCESS_COLORS[r.access_level]||'#f5f5f5',
                    color: ACCESS_TEXT[r.access_level]||'#555' }}>
                    {ACCESS_LABELS[r.access_level]||r.access_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page===1} onClick={() => setPage(p=>p-1)}>← Trước</button>
          <span style={{ fontSize:13, color:'#666' }}>Trang {page} / {totalPages}</span>
          <button style={S.pageBtn} disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding:24, flex:1, overflow:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  title: { fontSize:18, fontWeight:600, color:'#1a1a1a', margin:0 },
  sub: { fontSize:13, color:'#888', margin:'4px 0 0' },
  btnExport: { padding:'9px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' },
  filterCard: { background:'#fff', border:'1px solid #e8e8e6', borderRadius:10, padding:'16px 20px', marginBottom:16 },
  filterRow: { display:'flex', alignItems:'center', gap:16, marginBottom:12, flexWrap:'wrap' },
  filterGroup: { display:'flex', alignItems:'center', gap:8 },
  filterLabel: { fontSize:12, fontWeight:500, color:'#555', whiteSpace:'nowrap' },
  presetRow: { display:'flex', gap:6 },
  presetBtn: { padding:'5px 12px', borderRadius:20, border:'1px solid #e0e0de', fontSize:12, cursor:'pointer', background:'#fff', color:'#555' },
  presetActive: { background:'#1a1a1a', color:'#fff', borderColor:'#1a1a1a' },
  dateInput: { padding:'5px 10px', border:'1px solid #e0e0de', borderRadius:8, fontSize:12, outline:'none' },
  select: { padding:'7px 10px', border:'1px solid #e0e0de', borderRadius:8, fontSize:13, background:'#fff', outline:'none', cursor:'pointer' },
  tableWrap: { background:'#fff', border:'1px solid #e5e5e3', borderRadius:10, overflow:'hidden' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  thead: { background:'#fafaf8' },
  th: { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'1px solid #f0f0ee', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f5f5f3' },
  td: { padding:'11px 12px', verticalAlign:'middle' },
  typeTag: { fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'#f0f0ee', color:'#555', flexShrink:0 },
  docTitle: { fontSize:13, fontWeight:500, color:'#1a1a1a', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  meta: { fontSize:12, color:'#666' },
  empty: { padding:48, textAlign:'center', color:'#bbb', fontSize:14 },
  pagination: { display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:20 },
  pageBtn: { padding:'7px 14px', border:'1px solid #e0e0de', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 },
};
