import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { docsAPI, downloadBlob } from '../utils/api';

const VIEWABLE = {
  pdf:  'pdf',
  png:  'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  txt:  'text',  md: 'text', csv: 'text',
  docx: 'office', doc: 'office',
  xlsx: 'office', xls: 'office',
  pptx: 'office', ppt: 'office',
};

const FILE_ICONS = {
  pdf:  { bg: '#fff0ec', color: '#b84020' },
  docx: { bg: '#eff6ff', color: '#1d5fa5' }, doc: { bg: '#eff6ff', color: '#1d5fa5' },
  xlsx: { bg: '#f0fdf4', color: '#166534' }, xls: { bg: '#f0fdf4', color: '#166534' },
  pptx: { bg: '#fffbeb', color: '#92400e' }, ppt: { bg: '#fffbeb', color: '#92400e' },
};

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function ViewerContent({ doc, onClose }) {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [viewInfo, setViewInfo]     = useState(null);
  const [textContent, setTextContent] = useState('');

  const ft       = doc.file_type?.toLowerCase();
  const viewType = VIEWABLE[ft] || null;
  const fi       = FILE_ICONS[ft] || { bg: '#f5f5f5', color: '#555' };
  const BACKEND  = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Đóng bằng Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!viewType) { setLoading(false); return; }

    docsAPI.viewToken(doc.id)
      .then(async ({ data }) => {
        // Đổi relative path thành absolute URL trỏ thẳng backend
        const absoluteUrl = `${BACKEND}${data.view_url}`;
        setViewInfo({ ...data, view_url: absoluteUrl });
        if (viewType === 'text') {
          try {
            const r = await fetch(absoluteUrl);
            const text = await r.text();
            setTextContent(text);
          } catch {
            setTextContent('Không thể tải nội dung file.');
          }
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err?.response?.data?.error || 'Không thể tải file để xem.');
        setLoading(false);
      });
  }, [doc.id, viewType]);

  const handleDownload = async () => {
    try {
      const { data } = await docsAPI.download(doc.id);
      downloadBlob(data, doc.file_name);
    } catch {}
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div style={S.overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={{ ...S.typeTag, background: fi.bg, color: fi.color }}>
              {ft?.toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={S.docTitle}>{doc.title}</div>
              <div style={S.docMeta}>{doc.file_name} · {formatBytes(doc.file_size)} · {doc.current_version}</div>
            </div>
          </div>
          <div style={S.headerRight}>
            <button style={S.btnOutline} onClick={handleDownload}>⬇ Tải xuống</button>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* Loading */}
          {loading && (
            <div style={S.center}>
              <div style={S.spinner} />
              <div style={S.hint}>Đang tải file...</div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={S.center}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
              <div style={S.hint}>{error}</div>
              <button style={S.btnPrimary} onClick={handleDownload}>Tải xuống thay thế</button>
            </div>
          )}

          {/* Không hỗ trợ */}
          {!loading && !error && !viewType && (
            <div style={S.center}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#333' }}>
                Định dạng <strong>.{ft}</strong> chưa hỗ trợ xem trực tiếp
              </div>
              <div style={S.hint}>Hỗ trợ: PDF · Word · Excel · PowerPoint · Ảnh · TXT</div>
              <button style={{ ...S.btnPrimary, marginTop: 20 }} onClick={handleDownload}>
                ⬇ Tải xuống để xem
              </button>
            </div>
          )}

          {/* PDF — iframe */}
          {!loading && !error && viewType === 'pdf' && viewInfo && (
            <iframe
              key={viewInfo.view_url}
              src={viewInfo.view_url}
              style={S.iframe}
              title={doc.title}
            />
          )}

          {/* Ảnh */}
          {!loading && !error && viewType === 'image' && viewInfo && (
            <div style={S.imageWrap}>
              <img
                src={viewInfo.view_url}
                alt={doc.title}
                style={S.image}
                onError={() => setError('Không thể hiển thị ảnh.')}
              />
            </div>
          )}

          {/* Text */}
          {!loading && !error && viewType === 'text' && (
            <div style={S.textWrap}>
              <pre style={S.pre}>{textContent || 'File trống.'}</pre>
            </div>
          )}

          {/* Office */}
          {!loading && !error && viewType === 'office' && viewInfo && (
            isLocalhost ? (
              <div style={S.center}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>
                  {ft?.includes('xl') ? '📊' : ft?.includes('pp') ? '📊' : '📝'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#333', marginBottom: 8 }}>
                  Xem Office trực tiếp
                </div>
                <div style={{ ...S.hint, maxWidth: 380, textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
                  Microsoft Office Online cần URL công khai.<br />
                  Khi deploy lên server thật sẽ hoạt động tự động.
                </div>
                <button style={S.btnPrimary} onClick={handleDownload}>⬇ Tải xuống để xem</button>
              </div>
            ) : (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewInfo.view_url)}`}
                style={S.iframe}
                title={doc.title}
                frameBorder="0"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Render qua Portal để thoát khỏi mọi stacking context của Layout
export default function ViewerModal({ doc, onClose }) {
  return ReactDOM.createPortal(
    <ViewerContent doc={doc} onClose={onClose} />,
    document.body
  );
}

// Spinner CSS
if (!document.getElementById('viewer-spin-style')) {
  const s = document.createElement('style');
  s.id = 'viewer-spin-style';
  s.textContent = `@keyframes _vmspin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

const S = {
  // Portal overlay — fixed, phủ toàn màn hình, z cao nhất
  overlay: {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 12,
    width: '100%', maxWidth: 980, height: '90vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 18px', borderBottom: '1px solid #f0f0ee', flexShrink: 0,
    background: '#fff',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 },
  typeTag: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, flexShrink: 0 },
  docTitle: { fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 520 },
  docMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  btnOutline: { padding: '7px 14px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#bbb', padding: '2px 6px', lineHeight: 1 },
  body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fafaf8' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  spinner: { width: 34, height: 34, borderRadius: '50%', border: '3px solid #eee', borderTopColor: '#1a1a1a', animation: '_vmspin 0.75s linear infinite', marginBottom: 14 },
  hint: { fontSize: 13, color: '#999', marginBottom: 16 },
  errorText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  iframe: { flex: 1, width: '100%', height: '100%', border: 'none', background: '#fff' },
  imageWrap: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f5f3' },
  image: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
  textWrap: { flex: 1, overflow: 'auto', padding: '20px 28px', background: '#fff' },
  pre: { margin: 0, fontFamily: 'Consolas,"Courier New",monospace', fontSize: 13, lineHeight: 1.8, color: '#2a2a2a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  btnPrimary: { padding: '10px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
};
