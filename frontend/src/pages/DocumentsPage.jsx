import React, { useState, useEffect, useCallback } from 'react';
import { docsAPI, foldersAPI, catalogsAPI, downloadBlob } from '../utils/api';
import ProvinceSelect from '../components/ProvinceSelect';
import { useIsMobile } from '../components/Layout';
import { useAuth, useIsEditor } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import EditDocModal from '../components/EditDocModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import PermissionModal from '../components/PermissionModal';
import ViewerModal from '../components/ViewerModal';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';


const TYPE_COLORS = {
  pdf:{ bg:'#fff0ec',color:'#b84020' }, docx:{ bg:'#eff6ff',color:'#1d5fa5' }, doc:{ bg:'#eff6ff',color:'#1d5fa5' },
  xlsx:{ bg:'#f0fdf4',color:'#166534' }, xls:{ bg:'#f0fdf4',color:'#166534' },
  pptx:{ bg:'#fffbeb',color:'#92400e' }, ppt:{ bg:'#fffbeb',color:'#92400e' },
  default:{ bg:'#f5f5f5',color:'#555' },
};
const ACCESS_LABELS = { public:'🌐 Công khai', internal:'🏢 Nội bộ', private:'🔒 Riêng tư' };
const ACCESS_COLORS = {
  public:{ bg:'#f0fdf4',color:'#166534' }, internal:{ bg:'#eff6ff',color:'#1d5fa5' }, private:{ bg:'#fff0ec',color:'#b84020' },
};
function formatBytes(b){ return b<1024*1024?(b/1024).toFixed(0)+' KB':(b/1024/1024).toFixed(1)+' MB'; }

export default function DocumentsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isEditor = useIsEditor();
  const location = useLocation();
  const highlightId    = location.state?.highlightId;
  const highlightTitle = location.state?.highlightTitle;
  const [docs, setDocs]       = useState([]);
  const [folders, setFolders] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [partners, setPartners]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search,        setSearch]        = useState('');
  const [filterFolder,  setFilterFolder]  = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterAccess,  setFilterAccess]  = useState('');
  const [filterProvince,setFilterProvince]= useState('');
  const [filterInvestor,setFilterInvestor]= useState('');
  const [filterProject, setFilterProject] = useState('');
  const [page, setPage] = useState(1);

  const [showUpload, setShowUpload] = useState(false);
  const [editDoc,    setEditDoc]    = useState(null);
  const [deleteDoc,  setDeleteDoc]  = useState(null);
  const [permDoc,    setPermDoc]    = useState(null);
  const [viewDoc,    setViewDoc]    = useState(null);

  // Count active extra filters
  const extraFilters = [filterProvince,filterInvestor,filterProject].filter(Boolean).length;

  const highlightRef = React.useRef(highlightId);
  const [pinnedDoc, setPinnedDoc] = React.useState(null);

  // Khi có highlightId: fetch riêng tài liệu đó để ghim lên đầu
  useEffect(() => {
    if (!highlightId) return;
    docsAPI.get(highlightId).then(r => setPinnedDoc(r.data)).catch(() => {});
  }, [highlightId]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await docsAPI.list({
        q:            search        || undefined,
        folder_id:    filterFolder  || undefined,
        type:         filterType    || undefined,
        access_level: filterAccess  || undefined,
        province:     filterProvince|| undefined,
        investor_id:  filterInvestor|| undefined,
        project_type: filterProject || undefined,
        page, limit: 25,
      });
      setDocs(data.data); setTotal(data.total);
    } catch {} finally { setLoading(false); }
  }, [search,filterFolder,filterType,filterAccess,filterProvince,filterInvestor,filterProject,page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => {
    foldersAPI.list().then(r=>setFolders(r.data)).catch(()=>{});
    catalogsAPI.list('investor').then(r=>setInvestors(r.data)).catch(()=>{});
    catalogsAPI.list('partner').then(r=>setPartners(r.data)).catch(()=>{});
  }, []);

  const handleDownload = async (doc) => {
    try { const {data}=await docsAPI.download(doc.id); downloadBlob(data,doc.file_name); } catch {}
  };

  const resetFilters = () => {
    setSearch(''); setFilterFolder(''); setFilterType(''); setFilterAccess('');
    setFilterProvince(''); setFilterInvestor(''); setFilterProject(''); setPage(1);
  };

  const refreshAll = useCallback(() => {
    fetchDocs();
    foldersAPI.list().then(r=>setFolders(r.data)).catch(()=>{});
  }, [fetchDocs]);

  const hasAnyFilter = search||filterFolder||filterType||filterAccess||filterProvince||filterInvestor||filterProject;

  return (
    <div style={S.page}>
      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span>🔍</span>
          <input style={S.searchInput} placeholder="Tìm kiếm tài liệu..." value={search}
            onChange={e=>{ setSearch(e.target.value); setPage(1); }} />
          {search && <button style={S.clearBtn} onClick={()=>setSearch('')}>✕</button>}
        </div>

        <select style={S.select} value={filterFolder} onChange={e=>{setFilterFolder(e.target.value);setPage(1);}}>
          <option value="">Tất cả thư mục</option>
          {folders.map(f=><option key={f.id} value={f.id}>{f.name}{f.doc_count>0?` (${f.doc_count})`:''}</option>)}
        </select>

        <select style={S.select} value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}}>
          <option value="">Tất cả loại</option>
          <option value="pdf">📄 PDF</option>
          <option value="word">📝 Word</option>
          <option value="excel">📊 Excel</option>
          <option value="powerpoint">📊 PowerPoint</option>
          <option value="image">🖼 Ảnh</option>
          <option value="text">📃 Văn bản</option>
        </select>

        <button
          style={{...S.filterToggleBtn,...(showFilters?S.filterToggleActive:{})}}
          onClick={()=>setShowFilters(v=>!v)}
          title="Bộ lọc nâng cao"
        >
          🔧 Lọc nâng cao{extraFilters>0?` (${extraFilters})`:''}
        </button>

        {hasAnyFilter && (
          <button style={S.clearAllBtn} onClick={resetFilters} title="Xoá hết bộ lọc">✕ Xoá lọc</button>
        )}

        {isEditor && (
          <button style={S.btnPrimary} onClick={()=>setShowUpload(true)}>+ Tải lên</button>
        )}
      </div>

      {/* ── Advanced filters panel ── */}
      {showFilters && (
        <div style={S.filterPanel}>
          <div style={S.filterRow}>
            <div style={S.filterField}>
              <label style={S.filterLabel}>Quyền truy cập</label>
              <select style={S.select} value={filterAccess} onChange={e=>{setFilterAccess(e.target.value);setPage(1);}}>
                <option value="">Tất cả</option>
                <option value="public">Công khai</option>
                <option value="internal">Nội bộ</option>
                <option value="private">Riêng tư</option>
              </select>
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>Tỉnh / Thành phố</label>
              <ProvinceSelect value={filterProvince} onChange={v=>{setFilterProvince(v);setPage(1);}} placeholder="Tất cả tỉnh thành" />
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>Chủ đầu tư / Khách hàng</label>
              <select style={S.select} value={filterInvestor} onChange={e=>{setFilterInvestor(e.target.value);setPage(1);}}>
                <option value="">Tất cả</option>
                {investors.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>Phân loại dự án</label>
              <select style={S.select} value={filterProject} onChange={e=>{setFilterProject(e.target.value);setPage(1);}}>
                <option value="">Tất cả</option>
                <option value="company">🏭 Dự án của công ty</option>
                <option value="partner">🤝 Dự án của đối tác</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {pinnedDoc && (
        <div style={S.pinnedCard}>
          <div style={S.pinnedHeader}>
            <span style={{fontSize:14}}>🎯</span>
            <span style={S.pinnedLabel}>Tài liệu từ kết quả tìm kiếm</span>
            <button style={S.clearHighlight} onClick={() => { setPinnedDoc(null); window.history.replaceState({}, document.title); }}>✕ Đóng</button>
          </div>
          <div style={S.pinnedBody}>
            {(() => {
              const doc = pinnedDoc;
              const tc = TYPE_COLORS[doc.file_type] || TYPE_COLORS.default;
              const ac = ACCESS_COLORS[doc.access_level] || {};
              return (
                <div style={S.pinnedRow}>
                  <span style={{...S.typeTag, background:tc.bg, color:tc.color}}>{doc.file_type?.toUpperCase()}</span>
                  <div style={{flex:1}}>
                    <div style={S.docTitle}>{doc.title}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
                      {doc.folder_name&&<span style={S.metaChip}>📁 {doc.folder_name}</span>}
                      {doc.investor_name&&<span style={S.metaChip}>🏢 {doc.investor_name}</span>}
                      {doc.province&&<span style={S.metaChip}>📍 {doc.province}</span>}
                      <span style={{...S.accessTag,...ac}}>{ACCESS_LABELS[doc.access_level]}</span>
                    </div>
                    {doc.description&&<div style={S.docDesc}>{doc.description}</div>}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button style={S.iconBtn} title="Xem file" onClick={()=>setViewDoc(doc)}>👁</button>
                    <button style={S.iconBtn} title="Tải xuống" onClick={()=>handleDownload(doc)}>⬇</button>
                    {isEditor&&<button style={S.iconBtn} title="Chỉnh sửa" onClick={()=>setEditDoc(doc)}>✏️</button>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{marginBottom:10,fontSize:13,color:'#888'}}>
        {loading?'Đang tải...':`${total} tài liệu`}
      </div>

      {/* ── Table / Card list ── */}
      {isMobile ? (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {loading ? (
            <div style={S.empty}>Đang tải...</div>
          ) : docs.length===0 ? (
            <div style={S.empty}>Không tìm thấy tài liệu nào</div>
          ) : docs.map(doc => {
            const tc = TYPE_COLORS[doc.file_type]||TYPE_COLORS.default;
            const ac = ACCESS_COLORS[doc.access_level]||{};
            return (
              <div key={doc.id} style={{background:'#fff',border:'1px solid #e8e8e6',borderRadius:10,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{...S.typeTag,background:tc.bg,color:tc.color}}>{doc.file_type?.toUpperCase()}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{...S.docTitle,fontSize:14}}>{doc.title}</div>
                    {doc.description&&<div style={S.docDesc}>{doc.description}</div>}
                  </div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {doc.folder_name&&<span style={S.metaChip}>📁 {doc.folder_name}</span>}
                  {doc.investor_name&&<span style={S.metaChip}>🏢 {doc.investor_name}</span>}
                  {doc.province&&<span style={S.metaChip}>📍 {doc.province}</span>}
                  <span style={{...S.accessTag,...ac}}>{ACCESS_LABELS[doc.access_level]}</span>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={{...S.iconBtn,flex:1,border:'1px solid #e0e0de',borderRadius:8,fontSize:13}} onClick={()=>setViewDoc(doc)}>👁 Xem</button>
                  <button style={{...S.iconBtn,flex:1,border:'1px solid #e0e0de',borderRadius:8,fontSize:13}} onClick={()=>handleDownload(doc)}>⬇ Tải</button>
                  {isEditor&&<button style={{...S.iconBtn,flex:1,border:'1px solid #e0e0de',borderRadius:8,fontSize:13}} onClick={()=>setEditDoc(doc)}>✏️ Sửa</button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr style={S.theadRow}>
              {['Tên tài liệu','Thư mục','Tỉnh/TP','Chủ đầu tư','Quyền','Phiên bản','Cập nhật',''].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={S.empty}>Đang tải...</td></tr>
            ) : docs.length===0 ? (
              <tr><td colSpan={8} style={S.empty}>Không tìm thấy tài liệu nào</td></tr>
            ) : docs.map(doc=>{
              const tc = TYPE_COLORS[doc.file_type]||TYPE_COLORS.default;
              const ac = ACCESS_COLORS[doc.access_level]||{};
              return (
                <tr key={doc.id} id={`doc-row-${doc.id}`} style={{...S.tr,...(doc.id===highlightId?S.trHighlight:{})}}>
                  <td style={S.td}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{...S.typeTag,background:tc.bg,color:tc.color}}>{doc.file_type.toUpperCase()}</span>
                      <div>
                        <div style={S.docTitle}>{doc.title}</div>
                        {doc.description&&<div style={S.docDesc}>{doc.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.meta}>{doc.folder_name||<span style={{color:'#ccc'}}>—</span>}</span></td>
                  <td style={S.td}><span style={S.meta}>{doc.province||<span style={{color:'#ccc'}}>—</span>}</span></td>
                  <td style={S.td}><span style={S.meta}>{doc.investor_name||<span style={{color:'#ccc'}}>—</span>}</span></td>
                  <td style={S.td}>
                    <span style={{...S.accessTag,background:ac.bg,color:ac.color}}>{ACCESS_LABELS[doc.access_level]}</span>
                  </td>
                  <td style={S.td}><span style={{...S.meta,fontFamily:'monospace'}}>{doc.current_version}</span></td>
                  <td style={S.td}>
                    <span style={S.meta} title={new Date(doc.updated_at).toLocaleString('vi-VN')}>
                      {formatDistanceToNow(new Date(doc.updated_at),{locale:vi,addSuffix:true})}
                    </span>
                  </td>
                  <td style={S.tdActions}>
                    <button style={S.iconBtn} title="Xem file" onClick={()=>setViewDoc(doc)}>👁</button>
                    <button style={S.iconBtn} title="Tải xuống" onClick={()=>handleDownload(doc)}>⬇</button>
                    {isEditor&&<button style={S.iconBtn} title="Chỉnh sửa" onClick={()=>setEditDoc(doc)}>✏️</button>}
                    {user?.role==='admin'&&<button style={S.iconBtn} title="Phân quyền" onClick={()=>setPermDoc(doc)}>🔒</button>}
                    {user?.role==='admin'&&<button style={{...S.iconBtn,...S.iconBtnDanger}} title="Xoá" onClick={()=>setDeleteDoc(doc)}>🗑️</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      )}

      {total>25&&(
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Trước</button>
          <span style={{fontSize:13,color:'#666'}}>Trang {page} / {Math.ceil(total/25)}</span>
          <button style={S.pageBtn} disabled={page>=Math.ceil(total/25)} onClick={()=>setPage(p=>p+1)}>Sau →</button>
        </div>
      )}

      {viewDoc&&<ViewerModal doc={viewDoc} onClose={()=>setViewDoc(null)} />}
      {showUpload&&<UploadModal folders={folders} onClose={()=>setShowUpload(false)} onSuccess={()=>{setShowUpload(false);refreshAll();}} />}
      {editDoc&&<EditDocModal doc={editDoc} folders={folders} onClose={()=>setEditDoc(null)} onSuccess={()=>{setEditDoc(null);refreshAll();}} />}
      {deleteDoc&&<DeleteConfirmModal doc={deleteDoc} onClose={()=>setDeleteDoc(null)} onSuccess={()=>{setDeleteDoc(null);refreshAll();}} />}
      {permDoc&&<PermissionModal doc={permDoc} onClose={()=>setPermDoc(null)} />}
    </div>
  );
}

const S = {
  page:{ padding:'clamp(12px, 3vw, 24px)', flex:1, overflow:'auto' },
  toolbar:{ display:'flex', gap:10, alignItems:'center', marginBottom:12, flexWrap:'wrap' },
  searchWrap:{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #e0e0de', borderRadius:8, padding:'8px 12px', flex:1, minWidth:200 },
  searchInput:{ border:'none', outline:'none', fontSize:14, width:'100%', background:'transparent' },
  clearBtn:{ background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:12 },
  select:{ padding:'8px 10px', border:'1px solid #e0e0de', borderRadius:8, fontSize:13, background:'#fff', color:'#333', outline:'none', cursor:'pointer' },
  filterToggleBtn:{ padding:'8px 14px', border:'1px solid #e0e0de', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', color:'#555', whiteSpace:'nowrap' },
  filterToggleActive:{ background:'#f0f9ff', borderColor:'#7dd3fc', color:'#0369a1' },
  clearAllBtn:{ padding:'8px 12px', border:'1px solid #fcc', borderRadius:8, background:'#fff0f0', fontSize:12, cursor:'pointer', color:'#c00', whiteSpace:'nowrap' },
  btnPrimary:{ padding:'9px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' },
  filterPanel:{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', marginBottom:14 },
  filterRow:{ display:'flex', gap:12, flexWrap:'wrap' },
  filterField:{ display:'flex', flexDirection:'column', gap:5, flex:1, minWidth:160 },
  filterLabel:{ fontSize:11, fontWeight:600, color:'#666' },
  tableWrap:{ background:'#fff', border:'1px solid #e5e5e3', borderRadius:10, overflow:'hidden' },
  table:{ width:'100%', borderCollapse:'collapse', fontSize:13 },
  theadRow:{ background:'#fafaf8' },
  th:{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'1px solid #f0f0ee' },
  tr:{ borderBottom:'1px solid #f5f5f3' },
  td:{ padding:'11px 14px', verticalAlign:'middle' },
  tdActions:{ padding:'8px 10px', verticalAlign:'middle', whiteSpace:'nowrap' },
  typeTag:{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, flexShrink:0 },
  docTitle:{ fontWeight:500, color:'#1a1a1a', fontSize:13 },
  docDesc:{ fontSize:11, color:'#999', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  accessTag:{ fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:20 },
  meta:{ fontSize:12, color:'#666' },
  iconBtn:{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'4px 5px', borderRadius:6 },
  iconBtnDanger:{ color:'#dc2626' },
  empty:{ padding:48, textAlign:'center', color:'#bbb', fontSize:14 },
  pinnedCard:{ background:'#fff', border:'2px solid #fbbf24', borderRadius:10, marginBottom:16, overflow:'hidden' },
  pinnedHeader:{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:'#fefce8', borderBottom:'1px solid #fde68a' },
  pinnedLabel:{ flex:1, fontSize:12, fontWeight:600, color:'#92400e' },
  pinnedBody:{ padding:'12px 16px' },
  pinnedRow:{ display:'flex', alignItems:'center', gap:12 },
  metaChip:{ fontSize:11, color:'#666', background:'#f5f5f3', padding:'2px 8px', borderRadius:10 },
  highlightBanner:{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'10px 16px', marginBottom:12, fontSize:13, color:'#0369a1' },
  clearHighlight:{ background:'none', border:'none', cursor:'pointer', color:'#0369a1', fontWeight:500, fontSize:13, textDecoration:'underline' },
  trHighlight:{ background:'#fefce8', outline:'2px solid #fbbf24', outlineOffset:'-2px' },
  pagination:{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:20 },
  pageBtn:{ padding:'7px 14px', border:'1px solid #e0e0de', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 },
};
