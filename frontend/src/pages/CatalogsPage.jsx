import React, { useState, useEffect, useCallback, useRef } from 'react';
import { catalogsAPI, foldersAPI } from '../utils/api';

const PROVINCES = [
  'Tuyên Quang','Cao Bằng','Lai Châu','Lào Cai','Thái Nguyên','Điện Biên',
  'Lạng Sơn','Sơn La','Phú Thọ','Bắc Ninh','Quảng Ninh','TP. Hà Nội',
  'TP. Hải Phòng','Hưng Yên','Ninh Bình','Thanh Hóa','Nghệ An','Hà Tĩnh',
  'Quảng Trị','TP. Huế','TP. Đà Nẵng','Quảng Ngãi','Gia Lai','Đắk Lắk',
  'Khánh Hoà','Lâm Đồng','TP. Đồng Nai','Tây Ninh','TP. Hồ Chí Minh',
  'Đồng Tháp','An Giang','Vĩnh Long','TP. Cần Thơ','Cà Mau',
];

const TABS = [
  { key:'investor', label:'Chủ đầu tư / Khách hàng', icon:'🏢' },
  { key:'partner',  label:'Phân loại dự án',           icon:'🗂️' },
  { key:'folder',   label:'Thư mục tài liệu',           icon:'📁' },
];

// ── Searchable Province Dropdown ─────────────────────────────────────────────
function ProvinceSelect({ value, onChange, placeholder = '— Tỉnh/TP —' }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? PROVINCES.filter(p => p.toLowerCase().includes(query.toLowerCase()))
    : PROVINCES;

  const display = value || placeholder;

  return (
    <div ref={ref} style={{ position:'relative', flex:1, minWidth:160 }}>
      <div style={PS.trigger} onClick={() => { setOpen(o => !o); setQuery(''); }}>
        <span style={{ flex:1, color: value?'#1a1a1a':'#aaa', fontSize:13 }}>{display}</span>
        <span style={{ color:'#aaa', fontSize:11 }}>▼</span>
      </div>
      {open && (
        <div style={PS.dropdown}>
          <div style={PS.searchRow}>
            <input
              style={PS.searchInput}
              autoFocus
              placeholder="Gõ để tìm tỉnh/TP..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={PS.list}>
            <div style={PS.option} onClick={() => { onChange(''); setOpen(false); }}>
              <span style={{ color:'#aaa' }}>— Không chọn —</span>
            </div>
            {filtered.length === 0
              ? <div style={{ padding:'10px 12px', color:'#aaa', fontSize:12 }}>Không tìm thấy</div>
              : filtered.map(p => (
                <div key={p} style={{ ...PS.option, ...(value===p ? PS.optionActive : {}) }}
                  onClick={() => { onChange(p); setOpen(false); setQuery(''); }}>
                  {p}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PS = {
  trigger:{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', border:'1px solid #e0e0de', borderRadius:8, cursor:'pointer', background:'#fff', userSelect:'none' },
  dropdown:{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e0e0de', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.1)', zIndex:100, overflow:'hidden' },
  searchRow:{ padding:'8px 10px', borderBottom:'1px solid #f0f0ee' },
  searchInput:{ width:'100%', padding:'7px 10px', border:'1px solid #e0e0de', borderRadius:6, fontSize:13, outline:'none', boxSizing:'border-box' },
  list:{ maxHeight:220, overflowY:'auto' },
  option:{ padding:'8px 12px', cursor:'pointer', fontSize:13, color:'#333' },
  optionActive:{ background:'#f0f9ff', color:'#0369a1', fontWeight:500 },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CatalogsPage() {
  const [tab, setTab]         = useState('investor');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Add form
  const [newName, setNewName]       = useState('');
  const [newProvince, setNewProvince] = useState('');

  // Edit
  const [editId, setEditId]           = useState(null);
  const [editName, setEditName]       = useState('');
  const [editProvince, setEditProvince] = useState('');

  // Search/filter within tab
  const [searchQ, setSearchQ]           = useState('');
  const [filterProvince, setFilterProvince] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'folder') {
        const r = await foldersAPI.list(); setItems(r.data);
      } else {
        const r = await catalogsAPI.list(tab); setItems(r.data);
      }
    } catch { setError('Lỗi tải dữ liệu'); }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setNewName(''); setNewProvince('');
    setEditId(null); setSearchQ(''); setFilterProvince('');
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      if (tab === 'folder') {
        await foldersAPI.create({ name: newName.trim() });
      } else {
        await catalogsAPI.create({ name: newName.trim(), type: tab, province: newProvince || null });
      }
      setNewName(''); setNewProvince(''); load();
    } catch (e) { setError(e.response?.data?.error || 'Lỗi thêm mới'); }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      if (tab === 'folder') await foldersAPI.update(id, { name: editName.trim() });
      else await catalogsAPI.update(id, { name: editName.trim(), province: editProvince || null });
      setEditId(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Lỗi cập nhật'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xoá?')) return;
    try {
      if (tab === 'folder') await foldersAPI.delete(id);
      else await catalogsAPI.delete(id);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Lỗi xoá'); }
  };

  const showProvince = tab === 'investor';

  // Client-side filter
  const filtered = items.filter(item => {
    const matchName = !searchQ || item.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchProv = !filterProvince || item.province === filterProvince;
    return matchName && matchProv;
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Danh mục động</h1>
        <p style={S.sub}>Cấu hình chủ đầu tư, phân loại dự án và thư mục tài liệu</p>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={{...S.tab,...(tab===t.key?S.tabActive:{})}} onClick={()=>setTab(t.key)}>
            {t.icon} {t.label}
            {tab===t.key && items.length > 0 && <span style={S.tabBadge}>{items.length}</span>}
          </button>
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.card}>
        {/* ── Add Row ── */}
        <div style={S.addRow}>
          <input
            style={{...S.input, flex:2}}
            placeholder={`Nhập tên ${TABS.find(t=>t.key===tab)?.label.toLowerCase()}...`}
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleAdd()}
          />
          {showProvince && (
            <div style={{flex:1, minWidth:180}}>
              <ProvinceSelect value={newProvince} onChange={setNewProvince} />
            </div>
          )}
          <button style={S.btnAdd} onClick={handleAdd}>+ Thêm</button>
        </div>

        {/* ── Note for partner ── */}
        {tab === 'partner' && (
          <div style={S.note}>
            💡 Thêm tên phân loại dự án cụ thể, ví dụ: <em>Dự án của đối tác A</em>, <em>Nội bộ Hinova</em>...
          </div>
        )}

        {/* ── Search & Filter bar ── */}
        <div style={S.filterBar}>
          <div style={S.searchWrap}>
            <span style={{color:'#aaa'}}>🔍</span>
            <input
              style={S.searchInput}
              placeholder={`Tìm trong ${TABS.find(t=>t.key===tab)?.label.toLowerCase()}...`}
              value={searchQ}
              onChange={e=>setSearchQ(e.target.value)}
            />
            {searchQ && <button style={S.clearBtn} onClick={()=>setSearchQ('')}>✕</button>}
          </div>
          {showProvince && (
            <div style={{minWidth:200}}>
              <ProvinceSelect value={filterProvince} onChange={setFilterProvince} placeholder="Lọc theo tỉnh/TP" />
            </div>
          )}
          <span style={S.countBadge}>{filtered.length} mục</span>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={S.empty}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>{items.length===0?'Chưa có mục nào. Thêm mục đầu tiên bên trên.':'Không tìm thấy kết quả.'}</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>Tên</th>
                {showProvince && <th style={{...S.th, width:180}}>Tỉnh / TP</th>}
                <th style={{...S.th, width:80}}>Tài liệu</th>
                <th style={{...S.th, width:140}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{background: i%2===0?'#fafaf8':'#fff'}}>
                  <td style={S.td}>
                    {editId===item.id ? (
                      <input style={{...S.input,margin:0}} value={editName}
                        onChange={e=>setEditName(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Enter')handleEdit(item.id);if(e.key==='Escape')setEditId(null);}}
                        autoFocus />
                    ) : <span style={{fontSize:13,fontWeight:500}}>{item.name}</span>}
                  </td>
                  {showProvince && (
                    <td style={S.td}>
                      {editId===item.id ? (
                        <ProvinceSelect value={editProvince} onChange={setEditProvince} />
                      ) : (
                        <span style={{fontSize:12,color: item.province?'#333':'#ccc'}}>
                          {item.province || '—'}
                        </span>
                      )}
                    </td>
                  )}
                  <td style={{...S.td, textAlign:'center', color:'#888', fontSize:12}}>
                    {tab==='folder' ? (item.doc_count||0) : '—'}
                  </td>
                  <td style={S.td}>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {editId===item.id ? (
                        <>
                          <button style={S.btnSave} onClick={()=>handleEdit(item.id)}>✓ Lưu</button>
                          <button style={S.btnCancel} onClick={()=>setEditId(null)}>✕</button>
                        </>
                      ) : (
                        <>
                          <button style={S.btnEdit} onClick={()=>{setEditId(item.id);setEditName(item.name);setEditProvince(item.province||'');}}>✏️ Sửa</button>
                          <button style={S.btnDel} onClick={()=>handleDelete(item.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const S = {
  page:{ padding:'28px 32px', flex:1, overflowY:'auto', fontFamily:'"Segoe UI",-apple-system,sans-serif' },
  header:{ marginBottom:20 },
  title:{ fontSize:20, fontWeight:700, color:'#1a1a1a', margin:0 },
  sub:{ fontSize:13, color:'#888', margin:'4px 0 0' },
  tabs:{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  tab:{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0de', background:'#fff', fontSize:13, cursor:'pointer', color:'#555' },
  tabActive:{ background:'#1a1a1a', color:'#fff', border:'1px solid #1a1a1a', fontWeight:500 },
  tabBadge:{ background:'rgba(255,255,255,0.25)', borderRadius:10, padding:'1px 7px', fontSize:11 },
  card:{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e6', overflow:'hidden' },
  addRow:{ display:'flex', gap:10, padding:'16px 20px', borderBottom:'1px solid #f0f0ee', alignItems:'center', flexWrap:'wrap' },
  filterBar:{ display:'flex', gap:10, padding:'12px 20px', borderBottom:'1px solid #f0f0ee', alignItems:'center', background:'#fafaf8', flexWrap:'wrap' },
  searchWrap:{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #e0e0de', borderRadius:8, padding:'7px 12px', flex:1, minWidth:180 },
  searchInput:{ border:'none', outline:'none', fontSize:13, width:'100%', background:'transparent' },
  clearBtn:{ background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:11, padding:'0 2px' },
  countBadge:{ fontSize:12, color:'#999', whiteSpace:'nowrap' },
  input:{ padding:'9px 12px', border:'1px solid #e0e0de', borderRadius:8, fontSize:13, outline:'none' },
  btnAdd:{ padding:'9px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' },
  note:{ padding:'10px 20px', background:'#f0f9ff', borderBottom:'1px solid #e0f2fe', fontSize:12, color:'#0369a1' },
  table:{ width:'100%', borderCollapse:'collapse' },
  thead:{ background:'#f5f5f3' },
  th:{ padding:'10px 16px', fontSize:11, fontWeight:600, color:'#888', textAlign:'left', letterSpacing:'0.04em', borderBottom:'1px solid #eee' },
  td:{ padding:'10px 16px', borderTop:'1px solid #f0f0ee', verticalAlign:'middle' },
  btnSave:{ padding:'5px 12px', fontSize:12, borderRadius:6, border:'1px solid #86efac', background:'#f0fdf4', color:'#166534', cursor:'pointer' },
  btnCancel:{ padding:'5px 10px', fontSize:12, borderRadius:6, border:'1px solid #e0e0de', background:'#fff', color:'#888', cursor:'pointer' },
  btnEdit:{ padding:'5px 10px', fontSize:12, borderRadius:6, border:'1px solid #e0e0de', background:'#fff', cursor:'pointer' },
  btnDel:{ padding:'5px 8px', fontSize:12, borderRadius:6, border:'1px solid #fcc', background:'#fff0f0', color:'#c00', cursor:'pointer' },
  empty:{ padding:'32px 20px', textAlign:'center', color:'#aaa', fontSize:13 },
  error:{ background:'#fff0f0', border:'1px solid #fcc', borderRadius:8, padding:'10px 16px', fontSize:13, color:'#c00', marginBottom:16 },
};
