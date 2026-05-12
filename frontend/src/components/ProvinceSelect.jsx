import React, { useState, useEffect, useRef } from 'react';

export const PROVINCES = [
  'Tuyên Quang','Cao Bằng','Lai Châu','Lào Cai','Thái Nguyên','Điện Biên',
  'Lạng Sơn','Sơn La','Phú Thọ','Bắc Ninh','Quảng Ninh','TP. Hà Nội',
  'TP. Hải Phòng','Hưng Yên','Ninh Bình','Thanh Hóa','Nghệ An','Hà Tĩnh',
  'Quảng Trị','TP. Huế','TP. Đà Nẵng','Quảng Ngãi','Gia Lai','Đắk Lắk',
  'Khánh Hoà','Lâm Đồng','TP. Đồng Nai','Tây Ninh','TP. Hồ Chí Minh',
  'Đồng Tháp','An Giang','Vĩnh Long','TP. Cần Thơ','Cà Mau',
];

export default function ProvinceSelect({ value, onChange, placeholder='— Tỉnh/TP —', style={} }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query.trim()
    ? PROVINCES.filter(p => p.toLowerCase().includes(query.toLowerCase()))
    : PROVINCES;

  return (
    <div ref={ref} style={{ position:'relative', ...style }}>
      <div style={S.trigger} onClick={() => { setOpen(o => !o); setQuery(''); }}>
        <span style={{ flex:1, color: value?'#1a1a1a':'#aaa', fontSize:13 }}>{value || placeholder}</span>
        <span style={{ color:'#aaa', fontSize:10 }}>▼</span>
      </div>
      {open && (
        <div style={S.dropdown}>
          <div style={S.searchRow}>
            <input style={S.searchInput} autoFocus placeholder="Gõ để tìm nhanh..."
              value={query} onChange={e=>setQuery(e.target.value)} onClick={e=>e.stopPropagation()} />
          </div>
          <div style={S.list}>
            <div style={S.option} onClick={()=>{onChange('');setOpen(false);}}>
              <span style={{color:'#aaa'}}>— Không chọn —</span>
            </div>
            {filtered.length === 0
              ? <div style={{padding:'10px 12px',color:'#aaa',fontSize:12}}>Không tìm thấy</div>
              : filtered.map(p => (
                <div key={p}
                  style={{...S.option,...(value===p?S.optionActive:{})}}
                  onClick={()=>{onChange(p);setOpen(false);setQuery('');}}>
                  {p}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  trigger:{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', border:'1px solid #e0e0de', borderRadius:8, cursor:'pointer', background:'#fff', userSelect:'none', minHeight:38 },
  dropdown:{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #ddd', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', zIndex:9999, overflow:'hidden' },
  searchRow:{ padding:'8px 10px', borderBottom:'1px solid #f0f0ee' },
  searchInput:{ width:'100%', padding:'7px 10px', border:'1px solid #e0e0de', borderRadius:6, fontSize:13, outline:'none', boxSizing:'border-box' },
  list:{ maxHeight:220, overflowY:'auto' },
  option:{ padding:'8px 12px', cursor:'pointer', fontSize:13, color:'#333' },
  optionActive:{ background:'#eff6ff', color:'#1d5fa5', fontWeight:500 },
};
