import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RendidorPage from './pages/RendidorPage';
import MisRendicionesPage from './pages/MisRendicionesPage';
import AutorizadorPage from './pages/AutorizadorPage';
import PagosPage from './pages/PagosPage';
import ReportesPage from './pages/ReportesPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function DefaultRedirect() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol === 'naiffa') return <Navigate to="/autorizador" replace />;
  if (usuario.rol === 'secretaria') return <Navigate to="/pagos" replace />;
  return <Navigate to="/nueva-rendicion" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DefaultRedirect />} />
          <Route
            path="/nueva-rendicion"
            element={
              <ProtectedRoute roles={['rendidor', 'admin']}>
                <RendidorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-rendiciones"
            element={
              <ProtectedRoute roles={['rendidor', 'admin']}>
                <MisRendicionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/autorizador"
            element={
              <ProtectedRoute roles={['naiffa', 'admin']}>
                <AutorizadorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pagos"
            element={
              <ProtectedRoute roles={['secretaria', 'admin']}>
                <PagosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute roles={['naiffa', 'secretaria', 'admin']}>
                <ReportesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
