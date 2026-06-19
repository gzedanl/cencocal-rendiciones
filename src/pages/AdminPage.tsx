import React, { useEffect, useState } from 'react';
import api from '../services/api';

const BANCOS = [
  'Banco de Chile', 'BancoEstado', 'Santander', 'BCI', 'Itaú',
  'Scotiabank', 'BBVA', 'Falabella', 'Ripley', 'Security',
  'Consorcio', 'BICE', 'Internacional', 'Coopeuch',
];

interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  rut?: string;
  banco?: string;
  numeroCuenta?: string;
  tipoCuenta?: string;
  createdAt: string;
}

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  naiffa: 'bg-blue-100 text-blue-800',
  secretaria: 'bg-green-100 text-green-800',
  rendidor: 'bg-gray-100 text-gray-700',
};

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  naiffa: 'Autorizador',
  secretaria: 'Secretaria',
  rendidor: 'Rendidor',
};

const EMPRESAS = ['Cencocal S.A.', 'Inmobiliaria Cordillera S.A.'];
const emptyForm = { nombre: '', email: '', password: '', rol: 'rendidor', rut: '', banco: '', numeroCuenta: '', tipoCuenta: '', empresas: ['Cencocal S.A.'] };

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = async () => {
    setCargando(true);
    const res = await api.get('/usuarios');
    setUsuarios(res.data);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(emptyForm);
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (u: UsuarioAdmin) => {
    setEditando(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, rut: u.rut || '', banco: u.banco || '', numeroCuenta: u.numeroCuenta || '', tipoCuenta: u.tipoCuenta || '', empresas: (u as any).empresas || ['Cencocal S.A.'] });
    setError('');
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, { ...form, passwordNueva: form.password || undefined });
        setExito(`Usuario ${form.nombre} actualizado.`);
      } else {
        if (!form.password) { setError('La contraseña es requerida'); setGuardando(false); return; }
        await api.post('/usuarios', form);
        setExito(`Usuario ${form.nombre} creado exitosamente.`);
      }
      setModalAbierto(false);
      cargar();
      setTimeout(() => setExito(''), 4000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error guardando usuario');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (u: UsuarioAdmin) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      cargar();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error eliminando usuario');
    }
  };

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Administración de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition font-medium flex items-center gap-2"
        >
          + Nuevo Usuario
        </button>
      </div>

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex justify-between">
          <span>✅ {exito}</span>
          <button onClick={() => setExito('')}>✕</button>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-16 text-gray-500">Cargando usuarios...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Usuario</th>
                <th className="text-left p-4 font-medium text-gray-600">Rol</th>
                <th className="text-left p-4 font-medium text-gray-600">RUT</th>
                <th className="text-left p-4 font-medium text-gray-600">Cuenta de Abono</th>
                <th className="text-left p-4 font-medium text-gray-600">Creado</th>
                <th className="text-center p-4 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-800">{u.nombre}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROL_COLORS[u.rol] || 'bg-gray-100'}`}>
                      {ROL_LABELS[u.rol] || u.rol}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{u.rut || <span className="text-red-400">Sin RUT</span>}</td>
                  <td className="p-4">
                    {u.banco && u.numeroCuenta ? (
                      <div className="text-xs">
                        <p className="font-medium text-gray-700">{u.banco}</p>
                        <p className="text-gray-400">{u.tipoCuenta} · {u.numeroCuenta}</p>
                      </div>
                    ) : (
                      <span className="text-yellow-600 text-xs">⚠️ Sin cuenta</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar usuario */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="font-bold text-lg">{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
                  <input type="text" value={form.nombre} onChange={e => f('nombre', e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => f('email', e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{editando ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                  <input type="password" value={form.password} onChange={e => f('password', e.target.value)}
                    placeholder={editando ? 'Dejar vacío para no cambiar' : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
                  <select value={form.rol} onChange={e => f('rol', e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="rendidor">Rendidor</option>
                    <option value="naiffa">Autorizador (Naiffa)</option>
                    <option value="secretaria">Secretaria</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Empresas Habilitadas</p>
                <div className="flex gap-4 flex-wrap">
                  {EMPRESAS.map(emp => (
                    <label key={emp} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.empresas.includes(emp)}
                        onChange={e => {
                          const nuevas = e.target.checked
                            ? [...form.empresas, emp]
                            : form.empresas.filter(x => x !== emp);
                          if (nuevas.length === 0) return; // al menos una
                          setForm(prev => ({ ...prev, empresas: nuevas }));
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      {emp}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cuenta de Abono (para rendidores)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">RUT</label>
                    <input type="text" value={form.rut} onChange={e => f('rut', e.target.value)} placeholder="12.345.678-9"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cuenta</label>
                    <select value={form.tipoCuenta} onChange={e => f('tipoCuenta', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Seleccionar...</option>
                      <option value="corriente">Corriente</option>
                      <option value="ahorro">Ahorro</option>
                      <option value="vista">Vista / RUT</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                    <select value={form.banco} onChange={e => f('banco', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Seleccionar banco...</option>
                      {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número de Cuenta</label>
                    <input type="text" value={form.numeroCuenta} onChange={e => f('numeroCuenta', e.target.value)}
                      placeholder="00123456789"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium text-sm disabled:opacity-60">
                  {guardando ? '⟳ Guardando...' : editando ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
