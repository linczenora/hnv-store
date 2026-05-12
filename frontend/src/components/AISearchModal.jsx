import React, { useState, useEffect, useRef } from 'react';
import { searchAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const SUGGESTIONS = [
  'Hợp đồng lao động trong thư mục nhân sự',
  'Nghị định mới về mua sắm công',
  'Báo cáo tài chính năm 2024',
  'Tài liệu đấu thầu dự án An Giang',
  'Hồ sơ ISO của công ty',
];

function formatBytes(b) {
  if (!b) return '';
  return b < 1024*1024 ? (b/1024).toFixed(0)+' KB' : (b/1024/1024).toFixed(1)+' MB';
}
const TYPE_COLORS = {
  pdf:{ bg:'#fff0ec',color:'#b84020' }, docx:{ bg:'#eff6ff',color:'#1d5fa5' }, doc:{ bg:'#eff6ff',color:'#1d5fa5' },
  xlsx:{ bg:'#f0fdf4',color:'#166534' }, xls:{ bg:'#f0fdf4',color:'#166534' },
  default:{ bg:'#f5f5f5',color:'#555' },
};

export default function AISearchModal({ onClose }) {
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState(null);
  const [intent,   setIntent]   = useState(null);
  const [error,    setError]    = useState('');
  const [history,  setHistory]  = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  // ESC để đóng
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true); setError(''); setResults(null); setIntent(null);
    try {
      const { data } = await searchAPI.ai(q.trim());
      setResults(data.results);
      setIntent(data.intent);
      setHistory(h => [q.trim(), ...h.filter(x => x !== q.trim())].slice(0, 5));
    } catch(e) {
      setError(e.response?.data?.error || 'Lỗi tìm kiếm, vui lòng thử lại');
    } finally { setLoading(false); }
  };

  const handleViewDoc = (doc) => {
    onClose();
    navigate('/documents', { state: { highlightId: doc.id, highlightTitle: doc.title } });
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={S.aiIcon}>✨</span>
            <div>
              <div style={S.headerTitle}>Tìm kiếm thông minh</div>
              <div style={S.headerSub}>Mô tả tài liệu bạn cần, AI sẽ hiểu và tìm giúp</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Search input ── */}
        <div style={S.searchArea}>
          <div style={S.inputWrap}>
            <span style={S.inputIcon}>🔍</span>
            <input
              ref={inputRef}
              style={S.input}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="VD: hợp đồng lao động nhân sự, nghị định mua sắm 2024..."
            />
            {query && <button style={S.clearBtn} onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}>✕</button>}
          </div>
          <button
            style={{ ...S.btnSearch, ...(loading ? S.btnDisabled : {}) }}
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? <span style={S.spinner}>⏳</span> : '🔎 Tìm'}
          </button>
        </div>

        {/* ── Suggestions (khi chưa tìm) ── */}
        {!results && !loading && !error && (
          <div style={S.body}>
            {history.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionLabel}>🕐 Tìm kiếm gần đây</div>
                <div style={S.chips}>
                  {history.map(h => (
                    <button key={h} style={S.chip} onClick={() => { setQuery(h); handleSearch(h); }}>{h}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={S.section}>
              <div style={S.sectionLabel}>💡 Thử tìm kiếm</div>
              <div style={S.chips}>
                {SUGGESTIONS.map(s => (
                  <button key={s} style={S.chip} onClick={() => { setQuery(s); handleSearch(s); }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={S.hint}>
              <div style={S.hintTitle}>🤖 AI hiểu được những gì?</div>
              <div style={S.hintGrid}>
                {[
                  ['📁','Tên thư mục','"trong thư mục nhân sự"'],
                  ['🏢','Chủ đầu tư','"của Sở Nội vụ An Giang"'],
                  ['📄','Loại file','"file PDF", "file Excel"'],
                  ['📍','Tỉnh thành','"tài liệu An Giang"'],
                  ['🗂️','Loại dự án','"dự án đối tác"'],
                  ['📅','Thời gian','"năm 2024", "tháng 3"'],
                ].map(([icon, label, example]) => (
                  <div key={label} style={S.hintItem}>
                    <span style={S.hintIcon}>{icon}</span>
                    <div>
                      <div style={S.hintLabel}>{label}</div>
                      <div style={S.hintEx}>{example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={S.loadingArea}>
            <div style={S.loadingDots}>
              <span style={{...S.dot, animationDelay:'0s'}}>●</span>
              <span style={{...S.dot, animationDelay:'.2s'}}>●</span>
              <span style={{...S.dot, animationDelay:'.4s'}}>●</span>
            </div>
            <div style={S.loadingText}>AI đang phân tích và tìm kiếm...</div>
          </div>
        )}

        {/* ── Error ── */}
        {error && <div style={S.errorBox}>⚠️ {error}</div>}

        {/* ── Results ── */}
        {results && !loading && (
          <div style={S.body}>
            {/* Intent summary */}
            {intent?.summary && (
              <div style={S.intentBox}>
                <span style={S.intentIcon}>🤖</span>
                <span style={S.intentText}>{intent.summary}</span>
                {[
                  intent.folder_name && `📁 ${intent.folder_name}`,
                  intent.file_type   && `📄 ${intent.file_type}`,
                  intent.province    && `📍 ${intent.province}`,
                ].filter(Boolean).map(tag => (
                  <span key={tag} style={S.intentTag}>{tag}</span>
                ))}
              </div>
            )}

            <div style={S.resultCount}>
              {results.length === 0
                ? '😕 Không tìm thấy tài liệu phù hợp'
                : `✅ Tìm thấy ${results.length} tài liệu`}
            </div>

            {results.length === 0 ? (
              <div style={S.noResult}>
                <div style={{fontSize:32,marginBottom:8}}>🔍</div>
                <div style={{fontSize:13,color:'#888',marginBottom:12}}>Thử mô tả theo cách khác hoặc kiểm tra tài liệu đã tải lên</div>
                <button style={S.chip} onClick={() => { setResults(null); setQuery(''); inputRef.current?.focus(); }}>← Thử lại</button>
              </div>
            ) : (
              <div style={S.resultList}>
                {results.map(doc => {
                  const tc = TYPE_COLORS[doc.file_type] || TYPE_COLORS.default;
                  return (
                    <div key={doc.id} style={S.resultItem} onClick={() => handleViewDoc(doc)}>
                      <span style={{...S.typeTag, background:tc.bg, color:tc.color}}>
                        {doc.file_type?.toUpperCase()}
                      </span>
                      <div style={S.resultInfo}>
                        <div style={S.resultTitle}>{doc.title}</div>
                        <div style={S.resultMeta}>
                          {doc.folder_name && <span style={S.metaTag}>📁 {doc.folder_name}</span>}
                          {doc.investor_name && <span style={S.metaTag}>🏢 {doc.investor_name}</span>}
                          {doc.province && <span style={S.metaTag}>📍 {doc.province}</span>}
                          {doc.project_type && <span style={S.metaTag}>{doc.project_type==='partner'?'🤝 Đối tác':'🏭 Công ty'}</span>}
                          <span style={{...S.metaTag, color:'#bbb'}}>{formatBytes(doc.file_size)}</span>
                        </div>
                        {doc.description && <div style={S.resultDesc}>{doc.description}</div>}
                      </div>
                      <span style={S.arrow}>→</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

const S = {
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:2000,padding:'60px 20px 20px',backdropFilter:'blur(2px)' },
  modal:{ background:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden',fontFamily:'"Segoe UI",-apple-system,sans-serif' },
  header:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 16px',borderBottom:'1px solid #f0f0ee' },
  headerLeft:{ display:'flex',alignItems:'center',gap:12 },
  aiIcon:{ fontSize:28 },
  headerTitle:{ fontSize:15,fontWeight:700,color:'#1a1a1a' },
  headerSub:{ fontSize:12,color:'#888',marginTop:2 },
  closeBtn:{ background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#aaa',padding:4 },
  searchArea:{ display:'flex',gap:10,padding:'16px 24px',borderBottom:'1px solid #f0f0ee' },
  inputWrap:{ display:'flex',alignItems:'center',gap:8,flex:1,border:'1.5px solid #e0e0de',borderRadius:10,padding:'10px 14px',transition:'border-color .15s' },
  inputIcon:{ fontSize:16,flexShrink:0 },
  input:{ flex:1,border:'none',outline:'none',fontSize:14,color:'#1a1a1a',background:'transparent' },
  clearBtn:{ background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:12,padding:'0 2px',flexShrink:0 },
  btnSearch:{ padding:'10px 20px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' },
  btnDisabled:{ opacity:.5,cursor:'not-allowed' },
  body:{ flex:1,overflowY:'auto',padding:'16px 24px' },
  section:{ marginBottom:20 },
  sectionLabel:{ fontSize:11,fontWeight:600,color:'#888',letterSpacing:'0.05em',marginBottom:8 },
  chips:{ display:'flex',flexWrap:'wrap',gap:8 },
  chip:{ padding:'6px 14px',border:'1px solid #e8e8e6',borderRadius:20,background:'#fafaf8',fontSize:12,cursor:'pointer',color:'#555',transition:'all .12s' },
  hint:{ background:'#f8faff',border:'1px solid #e8eeff',borderRadius:10,padding:'14px 16px' },
  hintTitle:{ fontSize:12,fontWeight:600,color:'#6366f1',marginBottom:10 },
  hintGrid:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 },
  hintItem:{ display:'flex',alignItems:'flex-start',gap:8 },
  hintIcon:{ fontSize:16,marginTop:1,flexShrink:0 },
  hintLabel:{ fontSize:12,fontWeight:500,color:'#333' },
  hintEx:{ fontSize:11,color:'#888',marginTop:1 },
  loadingArea:{ display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 24px',gap:12 },
  loadingDots:{ display:'flex',gap:6 },
  dot:{ fontSize:10,color:'#6366f1',animation:'blink 1s ease-in-out infinite' },
  loadingText:{ fontSize:13,color:'#888' },
  errorBox:{ margin:'12px 24px',padding:'12px 16px',background:'#fff0f0',border:'1px solid #fcc',borderRadius:8,fontSize:13,color:'#c00' },
  intentBox:{ display:'flex',alignItems:'center',flexWrap:'wrap',gap:8,padding:'10px 14px',background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,marginBottom:12,fontSize:13 },
  intentIcon:{ fontSize:16,flexShrink:0 },
  intentText:{ color:'#0369a1',flex:1,minWidth:100 },
  intentTag:{ padding:'2px 8px',background:'#e0f2fe',color:'#0369a1',borderRadius:12,fontSize:11,fontWeight:500 },
  resultCount:{ fontSize:13,fontWeight:500,color:'#555',marginBottom:12 },
  noResult:{ textAlign:'center',padding:'32px 20px' },
  resultList:{ display:'flex',flexDirection:'column',gap:8 },
  resultItem:{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',border:'1px solid #eee',borderRadius:10,cursor:'pointer',transition:'all .12s',background:'#fff' },
  typeTag:{ fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,flexShrink:0 },
  resultInfo:{ flex:1,minWidth:0 },
  resultTitle:{ fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:4 },
  resultMeta:{ display:'flex',flexWrap:'wrap',gap:6 },
  metaTag:{ fontSize:11,color:'#666',background:'#f5f5f3',padding:'2px 7px',borderRadius:10 },
  resultDesc:{ fontSize:11,color:'#999',marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' },
  arrow:{ fontSize:16,color:'#ccc',flexShrink:0 },
  spinner:{ animation:'blink 1s infinite' },
};
