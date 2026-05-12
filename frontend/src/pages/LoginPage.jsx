import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Logo Hinova as inline SVG-based image (base64 từ file PNG upload)
const LOGO_URL = '/logo_hinova.png';

const CUBES = [
  { size: 60, x: 8,  y: 12, delay: 0,    dur: 6 },
  { size: 40, x: 85, y: 8,  delay: 1.5,  dur: 7 },
  { size: 80, x: 75, y: 65, delay: 0.8,  dur: 8 },
  { size: 30, x: 15, y: 70, delay: 2,    dur: 5 },
  { size: 50, x: 50, y: 5,  delay: 0.3,  dur: 9 },
  { size: 35, x: 92, y: 40, delay: 1.2,  dur: 6.5 },
  { size: 25, x: 3,  y: 45, delay: 2.5,  dur: 7.5 },
];

function Cube({ size, x, y, delay, dur }) {
  const s = size;
  const h = s * 0.5;
  const w = s;
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`, top: `${y}%`,
      width: s, height: s * 1.15,
      animation: `floatCube ${dur}s ease-in-out ${delay}s infinite alternate`,
      transformStyle: 'preserve-3d',
    }}>
      {/* Top face */}
      <div style={{
        position:'absolute', width: w, height: h,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)',
        border: '1px solid rgba(255,255,255,0.25)',
        transform: `rotateX(55deg) translateY(-${h*0.5}px)`,
        transformOrigin: 'bottom center',
        backdropFilter: 'blur(2px)',
      }} />
      {/* Front face */}
      <div style={{
        position:'absolute', bottom: 0, width: w, height: s * 0.7,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,160,255,0.08) 100%)',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(2px)',
      }} />
      {/* Right face */}
      <div style={{
        position:'absolute', bottom: 0, right: -w*0.25, width: w*0.5, height: s * 0.7,
        background: 'linear-gradient(180deg, rgba(0,80,200,0.15) 0%, rgba(0,40,120,0.1) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        transform: 'skewY(-45deg)',
        transformOrigin: 'left top',
      }} />
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      setTimeout(() => navigate('/'), 50);
    } catch (err) {
      setError(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes floatCube {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          100% { transform: translateY(-28px) rotate(8deg); opacity: 1; }
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(24px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(56,139,255,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(56,139,255,0); }
        }
        .login-input:focus {
          border-color: rgba(255,255,255,0.6) !important;
          background: rgba(255,255,255,0.18) !important;
          outline: none;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(56,139,255,0.5) !important;
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* Animated gradient background */}
      <div style={S.bg} />

      {/* Floating 3D cubes */}
      <div style={S.cubeLayer}>
        {CUBES.map((c, i) => <Cube key={i} {...c} />)}
      </div>

      {/* Glow orbs */}
      <div style={{ ...S.orb, width:400, height:400, left:'-5%', top:'-10%', background:'radial-gradient(circle, rgba(56,139,255,0.25) 0%, transparent 70%)' }} />
      <div style={{ ...S.orb, width:300, height:300, right:'-5%', bottom:'10%', background:'radial-gradient(circle, rgba(0,200,150,0.2) 0%, transparent 70%)' }} />

      {/* Login card */}
      <div style={{ ...S.card, opacity: mounted?1:0, transform: mounted?'translateY(0)':'translateY(32px)', transition:'all 0.6s cubic-bezier(.22,1,.36,1)' }}>

        {/* Logo */}
        <div style={S.logoWrap}>
          <img
            src="/logo_hinova.png"
            alt="Hinova"
            style={S.logoImg}
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
          <div style={{ ...S.logoFallback, display:'none' }}>
            <span style={{ fontSize:36 }}>🗄️</span>
          </div>
          <div style={S.brandWrap}>
            <div style={S.brandName}>HNV-AI.Store</div>
            <div style={S.brandSub}>Hệ thống quản lý tài liệu thông minh</div>
          </div>
        </div>

        <div style={S.divider} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input
              className="login-input"
              style={S.input}
              type="email"
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
              placeholder="email@company.com"
              required autoFocus
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Mật khẩu</label>
            <input
              className="login-input"
              style={S.input}
              type="password"
              value={form.password}
              onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={S.error}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className="login-btn"
            style={{ ...S.btn, ...(loading ? S.btnLoading : {}) }}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                <span style={S.spinner} /> Đang đăng nhập...
              </span>
            ) : 'Đăng nhập →'}
          </button>
        </form>

        <p style={S.hint}>admin@company.com · Admin@123</p>

        {/* Footer */}
        <div style={S.footer}>© 2026 Hinova JSC · Step to Success</div>
      </div>
    </div>
  );
}

const S = {
  page:{
    minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    position:'relative', overflow:'hidden', padding:20,
    fontFamily:'"Segoe UI",-apple-system,BlinkMacSystemFont,sans-serif',
  },
  bg:{
    position:'fixed', inset:0, zIndex:0,
    background:'linear-gradient(135deg, #0a1628 0%, #0d2545 30%, #0a3060 60%, #051535 100%)',
    backgroundSize:'400% 400%',
    animation:'gradShift 12s ease infinite',
  },
  cubeLayer:{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none' },
  orb:{ position:'fixed', zIndex:1, pointerEvents:'none', borderRadius:'50%', filter:'blur(40px)' },
  card:{
    position:'relative', zIndex:10,
    width:'100%', maxWidth:420,
    background:'rgba(255,255,255,0.08)',
    backdropFilter:'blur(24px)',
    WebkitBackdropFilter:'blur(24px)',
    border:'1px solid rgba(255,255,255,0.18)',
    borderRadius:20,
    padding:'36px 36px 28px',
    boxShadow:'0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  logoWrap:{ display:'flex', alignItems:'center', gap:14, marginBottom:24 },
  logoImg:{ width:56, height:56, objectFit:'contain', filter:'drop-shadow(0 2px 8px rgba(56,139,255,0.4))' },
  logoFallback:{ width:56, height:56, alignItems:'center', justifyContent:'center' },
  brandWrap:{ flex:1 },
  brandName:{ fontSize:20, fontWeight:700, color:'#fff', letterSpacing:'-0.3px', lineHeight:1.2 },
  brandSub:{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:3, lineHeight:1.4 },
  divider:{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', marginBottom:24 },
  form:{ display:'flex', flexDirection:'column', gap:16 },
  field:{ display:'flex', flexDirection:'column', gap:7 },
  label:{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)', letterSpacing:'0.05em', textTransform:'uppercase' },
  input:{
    padding:'12px 14px',
    background:'rgba(255,255,255,0.1)',
    border:'1px solid rgba(255,255,255,0.2)',
    borderRadius:10, fontSize:14, color:'#fff',
    transition:'all .2s',
    WebkitTextFillColor:'#fff',
  },
  error:{
    padding:'10px 14px',
    background:'rgba(255,60,60,0.15)',
    border:'1px solid rgba(255,100,100,0.3)',
    borderRadius:8, fontSize:13, color:'#ffaaaa',
    display:'flex', alignItems:'center', gap:8,
  },
  btn:{
    padding:'13px',
    background:'linear-gradient(135deg, #1a6fff 0%, #0050cc 100%)',
    color:'#fff', border:'none', borderRadius:10,
    fontSize:15, fontWeight:600, cursor:'pointer',
    marginTop:4, letterSpacing:'0.02em',
    transition:'all .2s',
    boxShadow:'0 4px 20px rgba(56,139,255,0.35)',
    animation:'pulse 2.5s ease-in-out infinite',
  },
  btnLoading:{ opacity:0.7, cursor:'not-allowed', animation:'none' },
  spinner:{
    display:'inline-block', width:14, height:14,
    border:'2px solid rgba(255,255,255,0.3)',
    borderTopColor:'#fff', borderRadius:'50%',
    animation:'spin 0.7s linear infinite',
  },
  hint:{ marginTop:20, fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center' },
  footer:{ marginTop:16, fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center' },
};
