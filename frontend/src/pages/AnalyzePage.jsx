import React, { useState, useEffect, useRef } from 'react';
import { docsAPI, foldersAPI } from '../utils/api';
import api from '../utils/api';
import { useIsMobile } from '../components/Layout';

// ── File type helpers ────────────────────────────────────────────────────────
const SUPPORTED_TYPES = {
  pdf:  { label: 'PDF',  icon: '📄', color: '#b84020', bg: '#fff0ec' },
  doc:  { label: 'DOC',  icon: '📝', color: '#1d5fa5', bg: '#eff6ff' },
  docx: { label: 'DOCX', icon: '📝', color: '#1d5fa5', bg: '#eff6ff' },
  xls:  { label: 'XLS',  icon: '📊', color: '#166534', bg: '#f0fdf4' },
  xlsx: { label: 'XLSX', icon: '📊', color: '#166534', bg: '#f0fdf4' },
  png:  { label: 'PNG',  icon: '🖼', color: '#0891b2', bg: '#ecfeff' },
  jpg:  { label: 'JPG',  icon: '🖼', color: '#0891b2', bg: '#ecfeff' },
  jpeg: { label: 'JPG',  icon: '🖼', color: '#0891b2', bg: '#ecfeff' },
  webp: { label: 'WEBP', icon: '🖼', color: '#0891b2', bg: '#ecfeff' },
  gif:  { label: 'GIF',  icon: '🖼', color: '#0891b2', bg: '#ecfeff' },
  txt:  { label: 'TXT',  icon: '📃', color: '#374151', bg: '#f9fafb' },
  csv:  { label: 'CSV',  icon: '📊', color: '#166534', bg: '#f0fdf4' },
  md:   { label: 'MD',   icon: '📝', color: '#374151', bg: '#f9fafb' },
};

const MIME_MAP = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
};

// ── Analysis modes ────────────────────────────────────────────────────────────
const MODES = [
  { key: 'summary',   icon: '📋', label: 'Tóm tắt nội dung',        desc: 'Tóm tắt ngắn gọn các điểm chính' },
  { key: 'detail',    icon: '🔍', label: 'Phân tích chi tiết',       desc: 'Phân tích sâu cấu trúc và nội dung' },
  { key: 'keypoints', icon: '🎯', label: 'Điểm quan trọng',          desc: 'Liệt kê các điểm cốt lõi cần chú ý' },
  { key: 'questions', icon: '❓', label: 'Câu hỏi & Trả lời',        desc: 'Sinh câu hỏi từ nội dung tài liệu' },
  { key: 'translate', icon: '🌐', label: 'Dịch & Tóm tắt tiếng Anh', desc: 'Tóm tắt nội dung bằng tiếng Anh' },
];

// ── Markdown Renderer (không cần thư viện ngoài) ─────────────────────────────
function renderInline(text) {
  // **bold**, *italic* (không match * theo sau khoảng trắng — tránh nhầm bullet), `code`
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(\S.*?\S|\S)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:4, fontSize:'0.9em', fontFamily:'monospace' }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MarkdownRenderer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading ###### / ... / #
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = { 1: 18, 2: 16, 3: 15, 4: 14, 5: 14, 6: 13 };
      elements.push(
        <div key={i} style={{ fontSize: sizes[level], fontWeight: 700, color: '#1e3a5f', margin: '16px 0 6px', borderBottom: level <= 2 ? '1px solid #e2e8f0' : 'none', paddingBottom: level <= 2 ? 4 : 0 }}>
          {renderInline(hMatch[2])}
        </div>
      );
      i++; continue;
    }

    // Bullet * hoặc -
    if (line.match(/^[\*\-]\s+/)) {
      const bullets = [];
      while (i < lines.length && lines[i].match(/^[\*\-]\s+/)) {
        bullets.push(<li key={i} style={{ marginBottom: 4 }}>{renderInline(lines[i].replace(/^[\*\-]\s+/, ''))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{ margin: '6px 0 10px', paddingLeft: 22 }}>{bullets}</ul>);
      continue;
    }

    // Numbered list 1. 2. ...
    if (line.match(/^\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(<li key={i} style={{ marginBottom: 4 }}>{renderInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} style={{ margin: '6px 0 10px', paddingLeft: 22 }}>{items}</ol>);
      continue;
    }

    // Dòng trống
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
      i++; continue;
    }

    // Paragraph thường
    elements.push(
      <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.75 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AnalyzePage() {
  const isMobile = useIsMobile();
  const [docs,        setDocs]        = useState([]);
  const [folders,     setFolders]     = useState([]);
  const [search,      setSearch]      = useState('');
  const [filterFolder,setFilterFolder]= useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [mode,        setMode]        = useState('summary');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState('');
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const [history,     setHistory]     = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    docsAPI.list({ limit: 100 }).then(r => setDocs(r.data.data || [])).catch(() => {});
    foldersAPI.list().then(r => setFolders(r.data)).catch(() => {});
  }, []);

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
    const matchFolder = !filterFolder || d.folder_id === filterFolder;
    const supported   = !!SUPPORTED_TYPES[d.file_type?.toLowerCase()];
    return matchSearch && matchFolder && supported;
  });

  const handleAnalyze = () => {
    if (!selectedDoc) return setError('Vui lòng chọn tài liệu');
    setShowConfirm(true);
  };

  const handleConfirmAnalyze = async () => {
    setShowConfirm(false);
    setError(''); setResult(''); setLoading(true);

    try {
      // Tăng timeout lên 90s cho phân tích tài liệu lớn
      const { data } = await api.post('/analyze', {
        document_id: selectedDoc.id,
        mode,
      }, { timeout: 90000 });

      setResult(data.result);
      setHistory(h => [{ doc: selectedDoc, mode, result: data.result, time: new Date() }, ...h.slice(0, 9)]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Phân tích thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fi = selectedDoc ? SUPPORTED_TYPES[selectedDoc.file_type?.toLowerCase()] : null;
  const selectedMode = MODES.find(m => m.key === mode);


  const ConfirmPopup = () => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{background:'#fff',borderRadius:16,padding:'32px 28px',maxWidth:380,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>💳</div>
        <h3 style={{margin:'0 0 10px',fontSize:18,color:'#1e293b'}}>Xác nhận phân tích</h3>
        <p style={{margin:'0 0 24px',color:'#64748b',fontSize:14,lineHeight:1.6}}>
          Lượt phân tích này sẽ tốn khoảng <strong style={{color:'#7c3aed'}}>$0.01 USD</strong>.<br/>
          Bạn có muốn tiếp tục không?
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={()=>setShowConfirm(false)} style={{padding:'10px 24px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',cursor:'pointer',fontSize:14,fontWeight:500}}>Không đồng ý</button>
          <button onClick={handleConfirmAnalyze} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600,boxShadow:'0 4px 12px rgba(124,58,237,0.3)'}}>✨ Đồng ý</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    {showConfirm && <ConfirmPopup />}
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Phân tích tài liệu</h1>
          <p style={S.sub}>Tóm tắt và phân tích nội dung tài liệu tự động bằng AI</p>
        </div>
        <div style={S.badge}>
          <span style={S.badgeDot} />
          Powered by Claude AI
        </div>
      </div>

      <div style={S.layout}>

        {/* ── LEFT: Chọn tài liệu ── */}
        <div style={{...S.leftPanel, width: isMobile ? '100%' : '280px', overflowY: isMobile ? 'visible' : 'auto'}}>
          <div style={S.panelTitle}>
            <span>📂</span> Chọn tài liệu
          </div>

          {/* Search + Filter */}
          <div style={S.searchRow}>
            <div style={S.searchBox}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>🔍</span>
              <input style={S.searchInput} placeholder="Tìm tài liệu..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>}
            </div>
          </div>
          <select style={S.folderSelect} value={filterFolder} onChange={e => setFilterFolder(e.target.value)}>
            <option value="">Tất cả thư mục</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          {/* Support note */}
          <div style={S.supportNote}>
            Hỗ trợ: PDF · Word · Excel · PNG · JPG · TXT · CSV · MD
          </div>

          {/* Document list */}
          <div style={S.docList}>
            {filtered.length === 0 ? (
              <div style={S.noDoc}>Không có tài liệu phù hợp</div>
            ) : filtered.map(doc => {
              const info = SUPPORTED_TYPES[doc.file_type?.toLowerCase()];
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div key={doc.id}
                  style={{ ...S.docItem, ...(isSelected ? S.docItemSelected : {}) }}
                  onClick={() => { setSelectedDoc(doc); setResult(''); setError(''); }}>
                  <span style={{ ...S.docTypeTag, background: info.bg, color: info.color }}>
                    {info.label}
                  </span>
                  <div style={S.docItemContent}>
                    <div style={S.docItemTitle}>{doc.title}</div>
                    <div style={S.docItemMeta}>{doc.folder_name || 'Chưa phân loại'}</div>
                  </div>
                  {isSelected && <span style={S.checkIcon}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Cấu hình & Kết quả ── */}
        <div style={{...S.rightPanel, overflowY: isMobile ? 'visible' : 'auto'}}>

          {/* Chế độ phân tích */}
          <div style={S.section}>
            <div style={S.sectionTitle}>🎯 Chọn chế độ phân tích</div>
            <div style={{...S.modeGrid, gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(5,1fr)'}}>
              {MODES.map(m => (
                <div key={m.key}
                  style={{ ...S.modeCard, ...(mode === m.key ? S.modeCardSelected : {}) }}
                  onClick={() => setMode(m.key)}>
                  <div style={S.modeIcon}>{m.icon}</div>
                  <div style={S.modeLabel}>{m.label}</div>
                  <div style={S.modeDesc}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tài liệu đã chọn + Nút phân tích */}
          <div style={S.analyzeBar}>
            {selectedDoc ? (
              <div style={S.selectedInfo}>
                <span style={{ ...S.selectedTag, background: fi?.bg, color: fi?.color }}>{fi?.label}</span>
                <div>
                  <div style={S.selectedTitle}>{selectedDoc.title}</div>
                  <div style={S.selectedMeta}>{selectedMode?.label}</div>
                </div>
              </div>
            ) : (
              <div style={S.noSelected}>← Chọn tài liệu từ danh sách bên trái</div>
            )}
            <button
              style={{ ...S.analyzeBtn, ...(!selectedDoc || loading ? S.analyzeBtnDisabled : {}) }}
              onClick={handleAnalyze}
              disabled={!selectedDoc || loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={S.spinner} /> Đang phân tích...
                </span>
              ) : '✨ Phân tích ngay'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={S.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={S.resultBox} ref={resultRef}>
              <div style={S.resultHeader}>
                <span style={S.resultTitle}>Đang phân tích tài liệu...</span>
              </div>
              {[80, 65, 90, 55, 75].map((w, i) => (
                <div key={i} style={{ ...S.skeleton, width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div style={S.resultBox} ref={resultRef}>
              <div style={S.resultHeader}>
                <div style={S.resultTitleRow}>
                  <span style={S.resultIcon}>{selectedMode?.icon}</span>
                  <span style={S.resultTitle}>{selectedMode?.label}</span>
                  <span style={S.resultDocName}>— {selectedDoc?.title}</span>
                </div>
                <div style={S.resultActions}>
                  <button style={S.actionBtn} onClick={handleCopy}>
                    {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
                  </button>
                  <button style={S.actionBtn} onClick={() => {
                    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `phantich_${selectedDoc?.title}.txt`;
                    a.click(); URL.revokeObjectURL(url);
                  }}>⬇ Tải về</button>
                  <button style={S.actionBtn} onClick={() => { setResult(''); setError(''); }}>✕ Xoá</button>
                </div>
              </div>
              <div style={S.resultContent}>
                <MarkdownRenderer text={result} />
              </div>
            </div>
          )}

          {/* Lịch sử phân tích */}
          {history.length > 0 && !loading && (
            <div style={S.historyBox}>
              <div style={S.historyTitle}>🕐 Lịch sử phân tích</div>
              <div style={S.historyList}>
                {history.map((h, i) => {
                  const m = MODES.find(x => x.key === h.mode);
                  return (
                    <div key={i} style={S.historyItem}
                      onClick={() => { setSelectedDoc(h.doc); setMode(h.mode); setResult(h.result); }}>
                      <span>{m?.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.historyItemTitle}>{h.doc.title}</div>
                        <div style={S.historyItemMeta}>{m?.label} · {h.time.toLocaleTimeString('vi-VN')}</div>
                      </div>
                      <span style={S.historyReuse}>Xem lại</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skeleton CSS animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { padding: 24, flex: 1, overflow: 'auto', background: '#f8fafc' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  badge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ede9fe', borderRadius: 20, fontSize: 12, fontWeight: 500, color: '#6d28d9' },
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' },

  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' },

  // Left panel
  leftPanel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 0 },
  panelTitle: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', fontWeight: 600, fontSize: 13, color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  searchRow: { padding: '10px 12px 4px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px' },
  searchInput: { border: 'none', outline: 'none', background: 'transparent', fontSize: 13, flex: 1, color: '#1f2937' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11, padding: '0 2px' },
  folderSelect: { margin: '6px 12px 0', width: 'calc(100% - 24px)', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', color: '#374151', outline: 'none' },
  supportNote: { margin: '8px 12px 4px', fontSize: 11, color: '#94a3b8', padding: '5px 8px', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1' },
  docList: { maxHeight: 480, overflowY: 'auto', padding: '6px 8px 10px' },
  noDoc: { padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
  docItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3, border: '1px solid transparent', transition: 'all .12s' },
  docItemSelected: { background: '#eff6ff', border: '1px solid #bfdbfe' },
  docTypeTag: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0 },
  docItemContent: { flex: 1, minWidth: 0 },
  docItemTitle: { fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  docItemMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  checkIcon: { color: '#2563eb', fontSize: 14, fontWeight: 700, flexShrink: 0 },

  // Right panel
  rightPanel: { display: 'flex', flexDirection: 'column', gap: 14 },
  section: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 12 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  modeCard: { padding: '10px 8px', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all .12s', background: '#fafafa' },
  modeCardSelected: { border: '1.5px solid #6d28d9', background: '#f5f3ff' },
  modeIcon: { fontSize: 20, marginBottom: 4 },
  modeLabel: { fontSize: 11, fontWeight: 600, color: '#1e293b', marginBottom: 2, lineHeight: 1.3 },
  modeDesc: { fontSize: 10, color: '#94a3b8', lineHeight: 1.3 },

  // Analyze bar
  analyzeBar: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectedInfo: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  selectedTag: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, flexShrink: 0 },
  selectedTitle: { fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  selectedMeta: { fontSize: 11, color: '#64748b' },
  noSelected: { fontSize: 13, color: '#94a3b8', flex: 1 },
  analyzeBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #6d28d9, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(109,40,217,0.3)' },
  analyzeBtnDisabled: { opacity: 0.45, cursor: 'not-allowed', boxShadow: 'none' },
  spinner: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },

  errorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff0ec', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#b84020' },

  // Result
  resultBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' },
  resultHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', gap: 12 },
  resultTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  resultIcon: { fontSize: 16, flexShrink: 0 },
  resultTitle: { fontSize: 14, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' },
  resultDocName: { fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  resultActions: { display: 'flex', gap: 6, flexShrink: 0 },
  actionBtn: { padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' },
  resultContent: { padding: '16px 20px', lineHeight: 1.8, fontSize: 14, color: '#1f2937', maxHeight: 480, overflowY: 'auto' },

  // Skeleton
  skeleton: { height: 16, borderRadius: 8, margin: '12px 20px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' },

  // History
  historyBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' },
  historyTitle: { padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9', background: '#fafafa' },
  historyList: { padding: '8px' },
  historyItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', marginBottom: 3 },
  historyItemTitle: { fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  historyItemMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  historyReuse: { fontSize: 11, color: '#6d28d9', fontWeight: 500, flexShrink: 0 },
};
