import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useIsAdmin } from '../context/AuthContext';

const ADMIN_SUBS = [
  { to: '/users',          label: 'Người dùng',   icon: '👥' },
  { to: '/admin/catalogs', label: 'Danh mục động', icon: '⚙️' },
  { to: '/activity',       label: 'Nhật ký',       icon: '📋' },
];

// Bottom nav items (mobile) — max 5
const BOTTOM_NAV = [
  { to: '/',         label: 'Tổng quan',  icon: '⊞',  exact: true },
  { to: '/documents',label: 'Tài liệu',   icon: '📄' },
  { to: '/analyze',  label: 'Phân tích',  icon: '🤖' },
  { to: '/report',   label: 'Thống kê',   icon: '📊' },
  { to: '/__menu',   label: 'Thêm',       icon: '☰',  isMenu: true },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const isAdmin   = useIsAdmin();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMobile  = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen,  setAdminOpen]  = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const isAdminActive = ADMIN_SUBS.some(s => location.pathname === s.to || location.pathname.startsWith(s.to + '/'));

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ──────
  const SidebarContent = () => (
    <>
      <div style={S.logo}>
        <span style={S.logoIcon}>🗄️</span>
        <div>
          <div style={S.logoName}>HNV-Store</div>
          <div style={S.logoSub}>Quản lý tài liệu</div>
        </div>
        {isMobile && (
          <button style={S.drawerClose} onClick={() => setDrawerOpen(false)}>✕</button>
        )}
      </div>

      <nav style={S.nav}>
        <div style={S.navLabel}>ĐIỀU HƯỚNG</div>
        {[
          { to:'/', label:'Tổng quan', icon:'⊞', exact:true, tour:'nav-home' },
          { to:'/documents', label:'Tài liệu', icon:'📄', tour:'nav-documents' },
          { to:'/analyze',   label:'Phân tích AI', icon:'🤖', tour:'nav-analyze' },
          { to:'/report',    label:'Thống kê báo cáo', icon:'📊', tour:'nav-report' },
        ].map(({ to, label, icon, exact, tour }) => (
          <NavLink key={to} to={to} end={exact} data-tour={tour}
            style={({ isActive }) => ({ ...S.navItem, ...(isActive ? S.navActive : {}) })}>
            <span style={S.navIcon}>{icon}</span> {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <button data-tour="nav-admin" style={{ ...S.navItem, ...S.navBtn, ...(isAdminActive ? S.navActive : {}) }}
              onClick={() => setAdminOpen(o => !o)}>
              <span style={S.navIcon}>🛠️</span>
              <span style={{ flex:1, textAlign:'left' }}>Quản trị</span>
              <span style={{ fontSize:10, color:'#aaa', display:'inline-block', transform: adminOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform .2s' }}>▼</span>
            </button>
            {adminOpen && (
              <div style={S.subMenu}>
                {ADMIN_SUBS.map(({ to, label, icon }) => (
                  <NavLink key={to} to={to}
                    style={({ isActive }) => ({ ...S.navItem, ...S.subItem, ...(isActive ? S.navActive : {}) })}>
                    <span style={S.navIcon}>{icon}</span> {label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      <div style={S.bottom}>
        <div style={S.userSection}>
          <div style={S.userRow}>
            <div style={{ ...S.avatar, background: roleColor(user?.role) }}>
              {user?.avatar_initials || user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={S.userInfo}>
              <div style={S.userName}>{user?.name}</div>
              <div style={S.userRole}>{ROLE_LABELS[user?.role]}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout} title="Đăng xuất">⎋</button>
        </div>
        <div style={S.copyright}>© Hinova 2026</div>
      </div>
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={S.mobileRoot}>
        {/* Drawer overlay */}
        {drawerOpen && (
          <div style={S.overlay} onClick={() => setDrawerOpen(false)} />
        )}

        {/* Slide-in drawer */}
        <aside style={{ ...S.drawer, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div style={S.mobileMain}>
          {/* Mobile top bar */}
          <div style={S.topBar}>
            <button style={S.hamburger} onClick={() => setDrawerOpen(true)}>☰</button>
            <div style={S.topBarTitle}>
              <span style={{ fontSize:16 }}>🗄️</span>
              <span style={S.logoName}>HNV-Store</span>
            </div>
            <div style={{ ...S.avatar, background: roleColor(user?.role), width:32, height:32, flexShrink:0 }}>
              {user?.avatar_initials || user?.name?.[0]?.toUpperCase()}
            </div>
          </div>

          {/* Page content */}
          <div style={S.mobileContent}>
            {children}
          </div>

          {/* Bottom navigation */}
          <nav style={S.bottomNav}>
            {BOTTOM_NAV.map(({ to, label, icon, exact, isMenu }) => {
              if (isMenu) {
                return (
                  <button key="menu" style={S.bottomItem} onClick={() => setDrawerOpen(true)}>
                    <span style={S.bottomIcon}>{icon}</span>
                    <span style={S.bottomLabel}>{label}</span>
                  </button>
                );
              }
              return (
                <NavLink key={to} to={to} end={exact}
                  style={({ isActive }) => ({ ...S.bottomItem, ...(isActive ? S.bottomActive : {}) })}>
                  <span style={S.bottomIcon}>{icon}</span>
                  <span style={S.bottomLabel}>{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <aside style={S.sidebar}>
        <SidebarContent />
      </aside>
      <main style={S.main}>{children}</main>
    </div>
  );
}

const ROLE_LABELS = { admin:'Quản trị viên', editor:'Biên tập viên', viewer:'Người xem' };
function roleColor(r){ return r==='admin'?'#dbeafe':r==='editor'?'#dcfce7':'#fef9c3'; }

const FONT = '"Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';

const S = {
  // ── Desktop ──
  root:{ display:'flex', height:'100vh', background:'#f5f5f3', fontFamily:FONT },
  sidebar:{ width:'220px', background:'#fff', borderRight:'1px solid #e8e8e6', display:'flex', flexDirection:'column', flexShrink:0 },
  main:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 },

  // ── Mobile root ──
  mobileRoot:{ display:'flex', flexDirection:'column', height:'100vh', background:'#f5f5f3', fontFamily:FONT, position:'relative', overflow:'hidden' },

  // Overlay
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 },

  // Drawer
  drawer:{ position:'fixed', top:0, left:0, bottom:0, width:'280px', background:'#fff', zIndex:300, display:'flex', flexDirection:'column', transition:'transform .25s cubic-bezier(.4,0,.2,1)', boxShadow:'4px 0 20px rgba(0,0,0,0.15)' },
  drawerClose:{ marginLeft:'auto', background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#aaa', padding:'4px 8px' },

  // Top bar
  topBar:{ display:'flex', alignItems:'center', gap:12, padding:'0 16px', height:56, background:'#fff', borderBottom:'1px solid #f0f0ee', flexShrink:0 },
  hamburger:{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#555', padding:'4px 8px', marginLeft:-8 },
  topBarTitle:{ display:'flex', alignItems:'center', gap:8, flex:1 },

  // Mobile content area
  mobileMain:{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' },
  mobileContent:{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' },

  // Bottom nav
  bottomNav:{ display:'flex', background:'#fff', borderTop:'1px solid #f0f0ee', flexShrink:0, paddingBottom:'env(safe-area-inset-bottom)' },
  bottomItem:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 4px', textDecoration:'none', color:'#888', background:'none', border:'none', cursor:'pointer', gap:2, minHeight:52 },
  bottomActive:{ color:'#1a1a1a' },
  bottomIcon:{ fontSize:20, lineHeight:1 },
  bottomLabel:{ fontSize:10, fontWeight:500, lineHeight:1 },

  // Shared nav styles
  logo:{ display:'flex', alignItems:'center', gap:'10px', padding:'20px 16px 16px', borderBottom:'1px solid #f0f0ee' },
  logoIcon:{ fontSize:'22px' },
  logoName:{ fontSize:'15px', fontWeight:'700', color:'#1a1a1a', lineHeight:1.2 },
  logoSub:{ fontSize:'11px', color:'#999', marginTop:'1px' },
  nav:{ flex:1, padding:'12px 8px', overflowY:'auto' },
  navLabel:{ fontSize:'10px', color:'#bbb', fontWeight:'600', letterSpacing:'0.06em', padding:'4px 10px 8px' },
  navItem:{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 12px', borderRadius:'8px', textDecoration:'none', fontSize:'14px', color:'#555', marginBottom:'2px', transition:'background 0.12s' },
  navBtn:{ background:'none', border:'none', cursor:'pointer', width:'100%' },
  navActive:{ background:'#f5f5f3', color:'#1a1a1a', fontWeight:'500' },
  navIcon:{ fontSize:'16px', width:'22px', textAlign:'center', flexShrink:0 },
  subMenu:{ marginLeft:8 },
  subItem:{ fontSize:'13px', padding:'8px 12px' },
  bottom:{ borderTop:'1px solid #f0f0ee' },
  userSection:{ padding:'12px 14px', display:'flex', alignItems:'center', gap:'8px' },
  userRow:{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0 },
  avatar:{ width:'30px', height:'30px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'600', flexShrink:0, color:'#333' },
  userInfo:{ flex:1, minWidth:0 },
  userName:{ fontSize:'12px', fontWeight:'500', color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  userRole:{ fontSize:'10px', color:'#999' },
  logoutBtn:{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#aaa', padding:'4px', flexShrink:0 },
  copyright:{ fontSize:'10px', color:'#ccc', textAlign:'center', padding:'4px 0 10px' },
};
