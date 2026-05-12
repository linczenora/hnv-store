import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import ActivityPage from './pages/ActivityPage';
import UsersPage from './pages/UsersPage';
import ReportPage from './pages/ReportPage';
import AnalyzePage from './pages/AnalyzePage';
import CatalogsPage from './pages/CatalogsPage';

// ── Error Boundary: bắt crash component, hiện lỗi thay vì màn trắng ──
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#c00', marginBottom: 12 }}>Có lỗi xảy ra</h2>
          <pre style={{ background: '#fff0f0', padding: 16, borderRadius: 8, fontSize: 13, color: '#c00', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #ccc' }}
            onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
          >
            ← Quay về trang chủ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Guards ──────────────────────────────────────────────────────────────
const Loading = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#888', fontFamily: 'sans-serif' }}>
    Đang tải...
  </div>
);

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// ── Routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>
      } />

      <Route path="/documents" element={
        <PrivateRoute><Layout><DocumentsPage /></Layout></PrivateRoute>
      } />

      <Route path="/activity" element={
        <AdminRoute><Layout><ActivityPage /></Layout></AdminRoute>
      } />

      <Route path="/users" element={
        <AdminRoute><Layout><UsersPage /></Layout></AdminRoute>
      } />

      <Route path="/report" element={
        <AdminRoute><Layout><ReportPage /></Layout></AdminRoute>
      } />

      <Route path="/analyze" element={
        <PrivateRoute><Layout><AnalyzePage /></Layout></PrivateRoute>
      } />

      <Route path="/admin/catalogs" element={
        <AdminRoute><Layout><CatalogsPage /></Layout></AdminRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
