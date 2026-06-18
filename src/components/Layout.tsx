import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Nueva Rendición', icon: '📄', roles: ['rendidor', 'admin'] },
  { path: '/mis-rendiciones', label: 'Mis Rendiciones', icon: '📋', roles: ['rendidor', 'admin'] },
  { path: '/autorizador', label: 'Autorización', icon: '✅', roles: ['naiffa', 'admin'] },
  { path: '/pagos', label: 'Pagos', icon: '💰', roles: ['secretaria', 'admin'] },
  { path: '/reportes', label: 'Reportes', icon: '📊', roles: ['naiffa', 'secretaria', 'admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navFiltrado = navItems.filter(n => usuario && n.roles.includes(usuario.rol));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <h1 className="font-bold text-lg leading-none">Cencocal</h1>
              <p className="text-blue-300 text-xs">Rendición de Gastos</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{usuario?.nombre}</p>
              <p className="text-blue-300 text-xs capitalize">{usuario?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-900 px-3 py-1.5 rounded text-sm transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navFiltrado.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  location.pathname === item.path
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-blue-700 hover:border-blue-300'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
