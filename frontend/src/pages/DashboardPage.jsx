import React, { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../components/Layout';
import { activityAPI, docsAPI, statsAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AISearchModal from '../components/AISearchModal';
import AppTour from '../components/AppTour';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const ACTION_ICONS  = { upload:'⬆', download:'⬇', view:'👁', edit:'✏️', delete:'🗑', share:'🔗' };
const ACTION_LABELS = { upload:'Tải lên', download:'Tải xuống', view:'Xem', edit:'Chỉnh sửa', delete:'Xoá', share:'Chia sẻ' };
const PIE_COLORS    = { upload:'#6366f1', view:'#22c55e', download:'#f59e0b' };
const BAR_COLORS    = ['#6366f1','#22c55e','#f59e0b','#ef4444','#14b8a6','#ec4899','#8b5cf6'];

function safeFromNow(d) {
  try { const dt = new Date(d); return isNaN(dt) ? '' : formatDistanceToNow(dt, { locale: vi, addSuffix: true }); }
  catch { return ''; }
}

// Preset khoảng thời gian
function getPreset(preset) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  const to  = fmt(now);
  if (preset === '7d')  { const f = new Date(now); f.setDate(f.getDate()-7);   return { from: fmt(f), to }; }
  if (preset === '30d') { const f = new Date(now); f.setDate(f.getDate()-30);  return { from: fmt(f), to }; }
  if (preset === '3m')  { const f = new Date(now); f.setMonth(f.getMonth()-3); return { from: fmt(f), to }; }
  if (preset === '1y')  { const f = new Date(now); f.setFullYear(f.getFullYear()-1); return { from: fmt(f), to }; }
  return { from: '', to: '' };
}

function DateRangeFilter({ value, onChange }) {
  const [preset, setPreset] = useState('30d');

  const applyPreset = (p) => {
    setPreset(p);
    if (p === 'custom') return;
    onChange(getPreset(p));
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
      {[['7d','7 ngày'],['30d','30 ngày'],['3m','3 tháng'],['1y','1 năm'],['custom','Tuỳ chọn']].map(([k,label]) => (
        <button key={k}
          style={{ padding:'4px 10px', borderRadius:20, border:'1px solid #e0e0de', fontSize:12, cursor:'pointer',
            background: preset===k ? '#1a1a1a' : '#fff', color: preset===k ? '#fff' : '#555' }}
          onClick={() => applyPreset(k)}>{label}
        </button>
      ))}
      {preset === 'custom' && (
        <>
          <input type="date" value={value.from} style={S.dateInput}
            onChange={e => onChange({ ...value, from: e.target.value })} />
          <span style={{ fontSize:12, color:'#888' }}>→</span>
          <input type="date" value={value.to} style={S.dateInput}
            onChange={e => onChange({ ...value, to: e.target.value })} />
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user }  = useAuth();
  const isMobile = useIsMobile();
  const navigate  = useNavigate();
  const [stats,       setStats]      = useState(null);
  const [activity,    setActivity]   = useState([]);
  const [recentDocs,  setRecentDocs] = useState([]);
  const [pieData,     setPieData]    = useState([]);
  const [barData,     setBarData]    = useState([]);
  const [pieRange,    setPieRange]   = useState(getPreset('30d'));
  const [barRange,    setBarRange]   = useState(getPreset('30d'));
  const [showAISearch, setShowAISearch] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      activityAPI.stats().then(r => setStats(r.data)).catch(() => {});
      activityAPI.list({ limit: 10 }).then(r => setActivity(r.data)).catch(() => {});
    }
    docsAPI.list({ limit: 5, page: 1 }).then(r => setRecentDocs(r.data.data || [])).catch(() => {});
  }, [user]);

  // Fetch pie chart khi range thay đổi
  useEffect(() => {
    if (user?.role !== 'admin') return;
    statsAPI.activityPie(pieRange)
      .then(r => setPieData(r.data.map(d => ({
        name: ACTION_LABELS[d.action] || d.action,
        value: d.count,
        action: d.action,
      }))))
      .catch(() => {});
  }, [pieRange, user]);

  // Fetch bar chart khi range thay đổi
  useEffect(() => {
    if (user?.role !== 'admin') return;
    statsAPI.docsByFolder(barRange)
      .then(r => setBarData(r.data))
      .catch(() => {});
  }, [barRange, user]);

  const TYPE_COLORS = { pdf:'#fff0ec', docx:'#eff6ff', doc:'#eff6ff', xlsx:'#f0fdf4', xls:'#f0fdf4', pptx:'#fffbeb', ppt:'#fffbeb' };
  const TYPE_TEXT   = { pdf:'#b84020', docx:'#1d5fa5', doc:'#1d5fa5', xlsx:'#166534', xls:'#166534', pptx:'#92400e', ppt:'#92400e' };

  return (
    <div style={S.page}>
      {/* ── Tour controls ── */}
      <div style={S.tourBar}>
        <button style={S.tourBtn} onClick={() => setShowTour(true)}>
          ▶ Xem hướng dẫn
        </button>
      </div>

      {/* AppTour */}
      {!showTour && <AppTour autoStart={true} onClose={() => {}} />}
      {showTour && <AppTour key={Date.now()} run={true} onClose={() => setShowTour(false)} />}

      {/* ── AI Search Widget ── */}
      <div data-tour="ai-search" style={S.aiWidget} onClick={() => setShowAISearch(true)}>
        <div style={S.aiWidgetLeft}>
          <span style={S.aiWidgetIcon}>✨</span>
          <div>
            <div style={S.aiWidgetTitle}>Tìm kiếm thông minh</div>
            <div style={S.aiWidgetSub}>Hỏi bằng ngôn ngữ tự nhiên, AI tìm tài liệu cho bạn</div>
          </div>
        </div>
        {!isMobile && <div style={S.aiWidgetInput}>
          <span style={{color:'#aaa',fontSize:13}}>VD: "hợp đồng lao động nhân sự", "nghị định mua sắm"...</span>
          <span style={S.aiWidgetBtn}>🔎 Tìm ngay</span>
        </div>}
      </div>

      {showAISearch && <AISearchModal onClose={() => setShowAISearch(false)} />}
      {/* ── Header ── */}
      <div style={{...S.topRow, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0}}>
        <div>
          <h1 style={S.greeting}>Xin chào, {user?.name?.split(' ').pop() || 'bạn'} 👋</h1>
          <p style={S.sub}>Đây là tổng quan hệ thống tài liệu nội bộ</p>
        </div>
        <button style={S.btnPrimary} onClick={() => navigate('/documents')}>+ Tải tài liệu lên</button>
      </div>

      {/* ── Stats cards ── */}
      {stats && (
        <div style={{...S.statsRow, gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'}}>
          {[
            { icon:'📄', label:'Tổng tài liệu',    value: stats.total_docs,         bg:'#f0f4ff' },
            { icon:'👥', label:'Người dùng',        value: stats.total_users,        bg:'#f0fdf4' },
            { icon:'⬇', label:'Lượt tải xuống',    value: stats.total_downloads,    bg:'#fffbeb' },
            { icon:'⬆', label:'Tải lên tháng này', value: stats.uploads_this_month, bg:'#fff0ec' },
          ].map(c => (
            <div key={c.label} style={{ ...S.statCard, background: c.bg }}>
              <div style={S.statIcon}>{c.icon}</div>
              <div style={S.statVal}>{c.value ?? '—'}</div>
              <div style={S.statLabel}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts row ── */}
      {user?.role === 'admin' && (
        <div style={{...S.chartsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>

          {/* Biểu đồ tròn */}
          <div style={S.chartCard}>
            <div style={S.chartHeader}>
              <div>
                <div style={S.chartTitle}>Tỷ lệ hoạt động</div>
                <div style={S.chartSub}>Xem / Tải lên / Tải xuống</div>
              </div>
              <DateRangeFilter value={pieRange} onChange={setPieRange} />
            </div>
            {pieData.length === 0 ? (
              <div style={S.noData}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.action] || BAR_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Biểu đồ cột */}
          <div style={S.chartCard}>
            <div style={S.chartHeader}>
              <div>
                <div style={S.chartTitle}>Tài liệu theo thư mục</div>
                <div style={S.chartSub}>Số lượng tài liệu tải lên</div>
              </div>
              <DateRangeFilter value={barRange} onChange={setBarRange} />
            </div>
            {barData.length === 0 ? (
              <div style={S.noData}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top:8, right:16, left:0, bottom:40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis dataKey="folder" tick={{ fontSize:11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Tài liệu']} />
                  <Bar dataKey="count" name="Tài liệu" radius={[4,4,0,0]}>
                    {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Recent docs + Activity ── */}
      <div style={{...S.bottomRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span style={S.panelTitle}>Tài liệu gần đây</span>
            <button style={S.linkBtn} onClick={() => navigate('/documents')}>Xem tất cả →</button>
          </div>
          {recentDocs.length === 0
            ? <div style={S.empty}>Chưa có tài liệu nào</div>
            : recentDocs.map(d => (
              <div key={d.id} style={S.docRow}>
                <span style={{ ...S.typeTag, background: TYPE_COLORS[d.file_type]||'#f5f5f5', color: TYPE_TEXT[d.file_type]||'#555' }}>
                  {d.file_type?.toUpperCase()}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={S.docName}>{d.title}</div>
                  <div style={S.docMeta}>{d.folder_name||'Chưa phân loại'} · {d.current_version}</div>
                </div>
                <span style={S.docTime}>{safeFromNow(d.updated_at)}</span>
              </div>
            ))
          }
        </div>

        {user?.role === 'admin' && (
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={S.panelTitle}>Hoạt động gần đây</span>
              <button style={S.linkBtn} onClick={() => navigate('/activity')}>Xem tất cả →</button>
            </div>
            {activity.length === 0
              ? <div style={S.empty}>Chưa có hoạt động nào</div>
              : activity.map(a => (
                <div key={a.id} style={S.actRow}>
                  <span style={S.actIcon}>{ACTION_ICONS[a.action]||'•'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={S.actName}>{a.user_name}</span>
                    {' '}<span style={S.actAction}>{ACTION_LABELS[a.action]}</span>
                    {a.doc_title && <span style={S.actDoc}> "{a.doc_title}"</span>}
                  </div>
                  <span style={S.docTime}>{safeFromNow(a.created_at)}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  tourBar:{ display:'flex', justifyContent:'flex-end', marginBottom:12, gap:8 },
  tourBtn:{ padding:'7px 14px', background:'#fff', border:'1px solid #e0e0de', borderRadius:8, fontSize:12, fontWeight:500, color:'#555', cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  aiWidget:{ display:'flex',flexDirection:'column',gap:12,background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',borderRadius:14,padding:'18px 24px',marginBottom:24,cursor:'pointer',transition:'transform .15s,box-shadow .15s',boxShadow:'0 4px 20px rgba(99,102,241,0.3)' },
  aiWidgetLeft:{ display:'flex',alignItems:'center',gap:12 },
  aiWidgetIcon:{ fontSize:28,flexShrink:0 },
  aiWidgetTitle:{ fontSize:15,fontWeight:700,color:'#fff' },
  aiWidgetSub:{ fontSize:12,color:'rgba(255,255,255,0.75)',marginTop:2 },
  aiWidgetInput:{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.15)',borderRadius:10,padding:'10px 16px',border:'1px solid rgba(255,255,255,0.2)' },
  aiWidgetBtn:{ fontSize:12,fontWeight:600,color:'#fff',background:'rgba(255,255,255,0.2)',padding:'5px 14px',borderRadius:20,whiteSpace:'nowrap' },
  page: { padding:24, flex:1, overflow:'auto' },
  topRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  greeting: { fontSize:20, fontWeight:600, margin:0, color:'#1a1a1a' },
  sub: { fontSize:13, color:'#888', margin:'4px 0 0' },
  btnPrimary: { padding:'9px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  statCard: { borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:6 },
  statIcon: { fontSize:22 },
  statVal: { fontSize:28, fontWeight:600, color:'#1a1a1a', lineHeight:1 },
  statLabel: { fontSize:12, color:'#888' },
  chartsRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 },
  chartCard: { background:'#fff', border:'1px solid #e8e8e6', borderRadius:10, padding:'16px 20px' },
  chartHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:12, flexWrap:'wrap' },
  chartTitle: { fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:2 },
  chartSub: { fontSize:11, color:'#aaa' },
  noData: { height:240, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#ccc' },
  dateInput: { padding:'4px 8px', border:'1px solid #e0e0de', borderRadius:6, fontSize:12, outline:'none' },
  bottomRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  panel: { background:'#fff', border:'1px solid #e8e8e6', borderRadius:10, padding:'16px 20px' },
  panelHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  panelTitle: { fontSize:14, fontWeight:500, color:'#1a1a1a' },
  linkBtn: { background:'none', border:'none', fontSize:12, color:'#888', cursor:'pointer' },
  docRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f5f5f3' },
  typeTag: { fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, flexShrink:0 },
  docName: { fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  docMeta: { fontSize:11, color:'#aaa', marginTop:1 },
  docTime: { fontSize:11, color:'#bbb', flexShrink:0, marginLeft:8 },
  actRow: { display:'flex', alignItems:'flex-start', gap:8, padding:'8px 0', borderBottom:'1px solid #f5f5f3' },
  actIcon: { fontSize:13, flexShrink:0, marginTop:1 },
  actName: { fontSize:13, fontWeight:500, color:'#1a1a1a' },
  actAction: { fontSize:13, color:'#555' },
  actDoc: { fontSize:13, color:'#888', fontStyle:'italic' },
  empty: { padding:'24px 0', textAlign:'center', fontSize:13, color:'#ccc' },
};
