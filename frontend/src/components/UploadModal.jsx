import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { docsAPI, foldersAPI, catalogsAPI } from '../utils/api';
import ProvinceSelect, { PROVINCES } from './ProvinceSelect';

const ACCEPT = {
  'application/pdf':[],'application/msword':[],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':[],
  'application/vnd.ms-excel':[],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':[],
  'application/vnd.ms-powerpoint':[],'application/vnd.openxmlformats-officedocument.presentationml.presentation':[],
  'text/plain':[],'image/png':[],'image/jpeg':[],
};

function fmtBytes(b){ return b<1024*1024?(b/1024).toFixed(0)+' KB':(b/1024/1024).toFixed(1)+' MB'; }


const EMPTY_FORM = { title:'', description:'', folder_id:'', access_level:'internal', version:'v1.0',
  period_type:'', period_from:'', period_to:'', province:'', investor_id:'', partner_id:'', project_type:'' };

export default function UploadModal({ folders, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [investors, setInvestors] = useState([]);
  const [partners, setPartners] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [error, setError] = useState('');
  const dupRef = useRef(null);

  useEffect(() => {
    catalogsAPI.list('investor').then(r=>setInvestors(r.data)).catch(()=>{});
    catalogsAPI.list('partner').then(r=>setPartners(r.data)).catch(()=>{});
  }, []);

  const onDrop = useCallback((accepted) => {
    if (!accepted[0]) return;
    const f = accepted[0];
    setFile(f);
    setForm(prev=>({ ...prev, title: prev.title || f.name.replace(/\.[^/.]+$/,'') }));
    setDupWarning(null); setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple:false, accept:ACCEPT });

  const triggerDupCheck = useCallback((title, folder_id) => {
    clearTimeout(dupRef.current);
    if (!title.trim()){ setDupWarning(null); return; }
    setCheckingDup(true);
    dupRef.current = setTimeout(async()=>{
      try{ const {data}=await docsAPI.checkDuplicate(title.trim(),folder_id||undefined); setDupWarning(data.duplicate?{message:data.matches[0]}:null); }catch{}
      setCheckingDup(false);
    }, 500);
  }, []);

  const set = (key, val) => {
    const next = { ...form, [key]:val };
    setForm(next);
    if (key==='title'||key==='folder_id') triggerDupCheck(next.title, next.folder_id);
    setError('');
  };

  const doUpload = async (force=false) => {
    if (!file) return setError('Vui lòng chọn file');
    if (!form.title.trim()) return setError('Vui lòng nhập tên tài liệu');
    setError(''); setUploading(true); setProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', form.title.trim());
    if (form.description) fd.append('description', form.description);
    if (form.folder_id)   fd.append('folder_id', form.folder_id);
    fd.append('access_level', form.access_level);
    fd.append('version', form.version);
    if (form.period_type)  fd.append('period_type',  form.period_type);
    if (form.period_from)  fd.append('period_from',  form.period_from);
    if (form.period_to)    fd.append('period_to',    form.period_to);
    if (form.province)     fd.append('province',     form.province);
    if (form.investor_id)  fd.append('investor_id',  form.investor_id);
    if (form.partner_id)   fd.append('partner_id',   form.partner_id);
    if (form.project_type) fd.append('project_type', form.project_type);
    if (force) fd.append('force','true');
    try{ await docsAPI.upload(fd, setProgress); onSuccess(); }
    catch(err){
      const body=err.response?.data;
      if (body?.error==='duplicate') setDupWarning({ fromServer:true, serverMsg:body.message, existing:body.existing });
      else setError(body?.error||'Tải lên thất bại');
    } finally { setUploading(false); setProgress(0); }
  };

  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <h2 style={S.title}>Tải tài liệu lên</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Drop zone */}
        <div {...getRootProps()} style={{...S.dropzone,...(isDragActive?S.dropActive:{}),...(file?S.dropFilled:{})}}>
          <input {...getInputProps()} />
          {file?(
            <div style={S.fileRow}>
              <span style={{fontSize:26}}>📄</span>
              <div style={{flex:1}}><div style={S.fileName}>{file.name}</div><div style={S.fileSize}>{fmtBytes(file.size)}</div></div>
              <button style={S.removeBtn} onClick={e=>{e.stopPropagation();setFile(null);setDupWarning(null);}}>✕</button>
            </div>
          ):(
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:30,marginBottom:8}}>📂</div>
              <div style={S.dropText}>{isDragActive?'Thả file vào đây':'Kéo thả hoặc nhấn để chọn'}</div>
              <div style={S.dropSub}>PDF, Word, Excel, PowerPoint · tối đa 50 MB</div>
            </div>
          )}
        </div>

        <div style={S.fields}>
          {/* Tên tài liệu */}
          <div style={S.field}>
            <label style={S.label}>Tên tài liệu <span style={{color:'#e00'}}>*</span>
              {checkingDup&&<span style={{fontSize:11,color:'#aaa',fontWeight:400}}> · Đang kiểm tra...</span>}
            </label>
            <input style={{...S.input,...(dupWarning&&!dupWarning.fromServer?{borderColor:'#f59e0b',background:'#fffbeb'}:{})}}
              value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Nhập tên tài liệu" />
            {dupWarning&&!dupWarning.fromServer&&(
              <div style={S.warnBox}><span>⚠️</span>
                <div><div style={{fontSize:12,color:'#92400e'}}>Đã có tài liệu <strong>"{dupWarning.message.title}"</strong>{dupWarning.message.folder_name?` trong thư mục "${dupWarning.message.folder_name}"`:''}</div>
                <div style={{fontSize:11,color:'#b45309',marginTop:2}}>Bạn vẫn có thể tải lên — hệ thống sẽ lưu riêng biệt.</div></div>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div style={S.field}>
            <label style={S.label}>Mô tả</label>
            <input style={S.input} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Ghi chú ngắn (tuỳ chọn)" />
          </div>

          {/* Thư mục + Quyền + Phiên bản */}
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Thư mục</label>
              <select style={S.select} value={form.folder_id} onChange={e=>set('folder_id',e.target.value)}>
                <option value="">Chưa phân loại</option>
                {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Quyền truy cập</label>
              <select style={S.select} value={form.access_level} onChange={e=>set('access_level',e.target.value)}>
                <option value="public">🌐 Công khai</option>
                <option value="internal">🏢 Nội bộ</option>
                <option value="private">🔒 Riêng tư</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Phiên bản</label>
              <input style={S.input} value={form.version} onChange={e=>set('version',e.target.value)} placeholder="v1.0" />
            </div>
          </div>

          <div style={S.divider}><span style={S.dividerLabel}>Thông tin bổ sung</span></div>

          {/* Thời gian */}
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Loại thời gian</label>
              <select style={S.select} value={form.period_type} onChange={e=>set('period_type',e.target.value)}>
                <option value="">— Không chọn —</option>
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
                <option value="custom">Tùy chọn</option>
              </select>
            </div>
            {(form.period_type==='custom'||form.period_type==='week')&&(
              <div style={S.field}>
                <label style={S.label}>Từ ngày</label>
                <input type="date" style={S.input} value={form.period_from} onChange={e=>set('period_from',e.target.value)} />
              </div>
            )}
            {(form.period_type==='custom'||form.period_type==='week')&&(
              <div style={S.field}>
                <label style={S.label}>Đến ngày</label>
                <input type="date" style={S.input} value={form.period_to} onChange={e=>set('period_to',e.target.value)} />
              </div>
            )}
            {form.period_type==='month'&&(
              <div style={S.field}>
                <label style={S.label}>Tháng/Năm</label>
                <input type="month" style={S.input} value={form.period_from} onChange={e=>set('period_from',e.target.value)} />
              </div>
            )}
            {form.period_type==='year'&&(
              <div style={S.field}>
                <label style={S.label}>Năm</label>
                <input type="number" style={S.input} value={form.period_from} onChange={e=>set('period_from',e.target.value)} placeholder="2025" min="2000" max="2099" />
              </div>
            )}
          </div>

          {/* Tỉnh + Chủ đầu tư + Đối tác + Loại dự án */}
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Tỉnh / Thành phố</label>
              <ProvinceSelect value={form.province} onChange={v=>set('province',v)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Chủ đầu tư / Khách hàng</label>
              <select style={S.select} value={form.investor_id} onChange={e=>set('investor_id',e.target.value)}>
                <option value="">— Không chọn —</option>
                {investors.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Phân loại dự án</label>
              <select style={S.select} value={form.project_type} onChange={e=>set('project_type',e.target.value)}>
                <option value="">— Không chọn —</option>
                <option value="company">🏭 Dự án của công ty</option>
                <option value="partner">🤝 Dự án của đối tác</option>
              </select>
            </div>
            {form.project_type==='partner'&&(
              <div style={S.field}>
                <label style={S.label}>Phân loại đối tác</label>
                <select style={S.select} value={form.partner_id} onChange={e=>set('partner_id',e.target.value)}>
                  <option value="">— Không chọn —</option>
                  {partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {uploading&&(
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'0 24px 12px'}}>
            <div style={{flex:1,height:6,background:'#f0f0ee',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',background:'#1a1a1a',borderRadius:3,width:`${progress}%`,transition:'width .25s'}} />
            </div>
            <span style={{fontSize:12,color:'#666',minWidth:36}}>{progress}%</span>
          </div>
        )}
        {error&&<div style={S.errorBox}>{error}</div>}
        {dupWarning?.fromServer&&(
          <div style={S.confirmBox}>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#92400e',marginBottom:4}}><span>⚠️</span><span>{dupWarning.serverMsg}</span></div>
            <div style={{fontSize:12,color:'#b45309',marginBottom:12}}>Vẫn tải lên như tài liệu riêng, hay huỷ để đổi tên?</div>
            <div style={{display:'flex',gap:8}}>
              <button style={S.btnSecondary} onClick={()=>setDupWarning(null)}>Huỷ, đổi tên</button>
              <button style={S.btnWarn} onClick={()=>{setDupWarning(null);doUpload(true);}}>Vẫn tải lên</button>
            </div>
          </div>
        )}
        {!dupWarning?.fromServer&&(
          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={onClose} disabled={uploading}>Huỷ</button>
            <button style={{...S.btnPrimary,...(!file||uploading?{opacity:.5,cursor:'not-allowed'}:{})}} onClick={()=>doUpload(false)} disabled={!file||uploading}>
              {uploading?'Đang tải lên...':'Tải lên'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20},
  modal:{background:'#fff',borderRadius:12,width:'100%',maxWidth:620,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.14)'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 0'},
  title:{fontSize:16,fontWeight:600,margin:0},
  closeBtn:{background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#888',padding:4},
  dropzone:{margin:'16px 24px',border:'2px dashed #ddd',borderRadius:10,padding:24,cursor:'pointer',transition:'all .15s'},
  dropActive:{border:'2px dashed #333',background:'#fafafa'},
  dropFilled:{border:'2px solid #e0e0de',background:'#fafaf8'},
  dropText:{fontSize:14,fontWeight:500,color:'#333',marginBottom:4},
  dropSub:{fontSize:12,color:'#aaa'},
  fileRow:{display:'flex',alignItems:'center',gap:12},
  fileName:{fontSize:13,fontWeight:500,color:'#1a1a1a'},
  fileSize:{fontSize:11,color:'#888',marginTop:2},
  removeBtn:{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:14,marginLeft:'auto'},
  fields:{padding:'0 24px'},
  field:{display:'flex',flexDirection:'column',gap:5,marginBottom:14,flex:1},
  row:{display:'flex',gap:12,flexWrap:'wrap'},
  label:{fontSize:12,fontWeight:500,color:'#555'},
  input:{padding:'9px 11px',border:'1px solid #e0e0de',borderRadius:8,fontSize:13,outline:'none',transition:'border-color .15s'},
  select:{padding:'9px 11px',border:'1px solid #e0e0de',borderRadius:8,fontSize:13,outline:'none',background:'#fff'},
  divider:{display:'flex',alignItems:'center',gap:8,margin:'4px 0 14px'},
  dividerLabel:{fontSize:11,color:'#bbb',fontWeight:600,letterSpacing:'0.04em',background:'#fff',padding:'0 4px',whiteSpace:'nowrap'},
  warnBox:{display:'flex',gap:8,alignItems:'flex-start',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px',marginTop:6},
  errorBox:{margin:'0 24px 12px',padding:'10px 12px',background:'#fff0f0',border:'1px solid #fcc',borderRadius:8,fontSize:13,color:'#c00'},
  confirmBox:{margin:'0 24px 12px',padding:'14px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10},
  footer:{display:'flex',justifyContent:'flex-end',gap:8,padding:'12px 24px 20px'},
  btnSecondary:{padding:'9px 20px',border:'1px solid #e0e0de',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer'},
  btnPrimary:{padding:'9px 20px',background:'#1a1a1a',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
  btnWarn:{padding:'9px 20px',background:'#d97706',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
};
