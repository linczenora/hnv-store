import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TOUR_KEY = 'hnvstore_tour_done_v3';

// Mỗi step có thể kèm route để navigate trước khi hiển thị
const STEPS = [
  {
    title: '👋 Chào mừng đến với HNV-AI.Store!',
    content: 'Hệ thống quản lý tài liệu thông minh với AI. Khám phá các tính năng chính trong vài phút!',
    target: null,
    route: '/',
  },
  {
    title: '⊞ Tổng quan',
    content: 'Trang chủ hiển thị thống kê nhanh: tổng tài liệu, người dùng, lượt tải và biểu đồ hoạt động.',
    target: '[data-tour="nav-home"]',
    side: 'right',
    route: '/',
  },
  {
    title: '✨ Tìm kiếm thông minh AI',
    content: 'Gõ câu hỏi tự nhiên như "hợp đồng lao động nhân sự" — AI hiểu ngữ cảnh và tìm đúng tài liệu cho bạn.',
    target: '[data-tour="ai-search"]',
    side: 'bottom',
    route: '/',
  },
  {
    title: '📄 Quản lý Tài liệu',
    content: 'Tải lên, phân loại theo thư mục, phân quyền truy cập. Tìm kiếm nâng cao theo tỉnh/thành, chủ đầu tư, loại dự án.',
    target: '[data-tour="nav-documents"]',
    side: 'right',
    route: '/',
  },
  {
    title: '🤖 Phân tích AI',
    content: 'Tóm tắt, phân tích chi tiết, trích điểm quan trọng từ PDF, Word, Excel chỉ với 1 click. Powered by Gemini AI.',
    target: '[data-tour="nav-analyze"]',
    side: 'right',
    route: '/',
  },
  {
    title: '📊 Thống kê báo cáo',
    content: 'Biểu đồ hoạt động xem/tải/tải xuống, tài liệu phổ biến nhất và thống kê theo từng thư mục.',
    target: '[data-tour="nav-report"]',
    side: 'right',
    route: '/',
  },
  {
    title: '🛠️ Quản trị hệ thống',
    content: 'Quản lý người dùng, danh mục động (chủ đầu tư, phân loại dự án, thư mục) và xem nhật ký hoạt động.',
    target: '[data-tour="nav-admin"]',
    side: 'right',
    route: '/',
  },
  {
    title: '🎉 Bạn đã sẵn sàng!',
    content: 'Nắm xong các tính năng chính rồi. Nhấn "Xem hướng dẫn" ở góc phải để xem lại bất cứ lúc nào!',
    target: null,
    route: '/',
  },
];

function useRect(selector) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!selector) { setRect(null); return; }
    const update = () => {
      const el = document.querySelector(selector);
      if (el) setRect(el.getBoundingClientRect());
      else setRect(null);
    };
    update();
    const t = setInterval(update, 100);
    return () => clearInterval(t);
  }, [selector]);
  return rect;
}

// SVG overlay với lỗ khoét spotlight
function Overlay({ rect }) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const pad = 8;

  if (!rect) {
    // Toàn màn hình tối
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: 'rgba(10,22,40,0.72)',
        pointerEvents: 'none',
      }} />
    );
  }

  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  const r = 10;

  // SVG với clip-path khoét lỗ
  return (
    <svg
      style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }}
      width={W} height={H}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width={W} height={H} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
        </mask>
      </defs>
      <rect
        width={W} height={H}
        fill="rgba(10,22,40,0.72)"
        mask="url(#spotlight-mask)"
      />
      {/* Viền xanh quanh element */}
      <rect
        x={x} y={y} width={w} height={h} rx={r} ry={r}
        fill="none"
        stroke="rgba(56,139,255,0.8)"
        strokeWidth="2"
      />
    </svg>
  );
}

function Tooltip({ step, index, total, rect, onNext, onPrev, onSkip }) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const TW = 320;
  const pad = 8;

  let style = { position: 'fixed', zIndex: 9999, width: TW };

  if (!rect) {
    style.top = '50%';
    style.left = '50%';
    style.transform = 'translate(-50%,-50%)';
  } else {
    let top, left;
    if (step.side === 'right') {
      top = rect.top + rect.height / 2 - 100;
      left = rect.right + pad + 12;
      if (left + TW > W - 12) left = rect.left - TW - 12;
    } else if (step.side === 'bottom') {
      top = rect.bottom + pad + 12;
      left = rect.left + rect.width / 2 - TW / 2;
    } else {
      top = rect.bottom + 12;
      left = rect.left;
    }
    top = Math.max(12, Math.min(top, H - 200));
    left = Math.max(12, Math.min(left, W - TW - 12));
    style.top = top;
    style.left = left;
  }

  return (
    <div style={{ ...S.tooltip, ...style }}>
      <div style={S.counter}>{index + 1} / {total}</div>

      <div style={S.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ ...S.dot, ...(i === index ? S.dotActive : i < index ? S.dotDone : {}) }} />
        ))}
      </div>

      <div style={S.title}>{step.title}</div>
      <div style={S.content}>{step.content}</div>

      <div style={S.footer}>
        <button style={S.btnSkip} onClick={onSkip}>Bỏ qua</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {index > 0 && <button style={S.btnBack} onClick={onPrev}>← Quay lại</button>}
          <button style={S.btnNext} onClick={onNext}>
            {index === total - 1 ? 'Hoàn thành ✓' : 'Tiếp tục →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppTour({ run: runProp, autoStart, onClose }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (runProp) { setIndex(0); setActive(true); return; }
    if (autoStart && !localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => { setIndex(0); setActive(true); }, 700);
      return () => clearTimeout(t);
    }
  }, [runProp, autoStart]);

  // Navigate khi đổi step
  useEffect(() => {
    if (!active) return;
    const step = STEPS[index];
    setReady(false);
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      setTimeout(() => setReady(true), 300);
    } else {
      setTimeout(() => setReady(true), 50);
    }
  }, [index, active]);

  const finish = useCallback(() => {
    setActive(false);
    navigate('/');
    localStorage.setItem(TOUR_KEY, '1');
    onClose?.();
  }, [navigate, onClose]);

  const step = active ? STEPS[index] : null;
  const rect = useRect(active && ready ? step?.target : null);

  if (!active || !ready) return null;

  return (
    <>
      <Overlay rect={step.target ? rect : null} />
      <Tooltip
        step={step}
        index={index}
        total={STEPS.length}
        rect={step.target ? rect : null}
        onNext={() => index < STEPS.length - 1 ? setIndex(i => i + 1) : finish()}
        onPrev={() => setIndex(i => i - 1)}
        onSkip={finish}
      />
    </>
  );
}

const S = {
  tooltip: {
    background: '#fff', borderRadius: 14,
    padding: '18px 20px 16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    fontFamily: '"Segoe UI",-apple-system,sans-serif',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  counter: { position: 'absolute', top: 16, right: 18, fontSize: 11, color: '#aaa' },
  dots: { display: 'flex', gap: 5, marginBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#e2e8f0', transition: 'all .25s' },
  dotActive: { background: '#1a6fff', width: 20, borderRadius: 3 },
  dotDone: { background: '#93c5fd' },
  title: { fontSize: 15, fontWeight: 700, color: '#0a1628', marginBottom: 8 },
  content: { fontSize: 13, lineHeight: 1.75, color: '#475569', marginBottom: 18 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  btnNext: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg,#1a6fff,#0050cc)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(26,111,255,0.35)',
  },
  btnBack: { padding: '8px 12px', background: 'none', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 13, color: '#555', cursor: 'pointer' },
  btnSkip: { background: 'none', border: 'none', fontSize: 12, color: '#bbb', cursor: 'pointer' },
};
