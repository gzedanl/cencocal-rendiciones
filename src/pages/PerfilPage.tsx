import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BANCOS = [
  'Banco de Chile', 'BancoEstado', 'Santander', 'BCI', 'Itaú',
  'Scotiabank', 'BBVA', 'Falabella', 'Ripley', 'Security',
  'Consorcio', 'BICE', 'Internacional', 'Coopeuch',
];

export default function PerfilPage() {
  const { usuario, login } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [rut, setRut] = useState(usuario?.rut || '');
  const [banco, setBanco] = useState(usuario?.banco || '');
  const [numeroCuenta, setNumeroCuenta] = useState(usuario?.numeroCuenta || '');
  const [tipoCuenta, setTipoCuenta] = useState(usuario?.tipoCuenta || '');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passwordNueva && passwordNueva !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setGuardando(true);
    try {
      const body: any = { nombre, rut, banco, numeroCuenta, tipoCuenta };
      if (passwordNueva) body.passwordNueva = passwordNueva;

      await api.put(`/usuarios/${usuario!.id}`, body);
      setExito('Perfil actualizado correctamente');
      setPasswordNueva('');
      setPasswordConfirm('');
      setTimeout(() => setExito(''), 4000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error guardando perfil');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi Perfil</h1>

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          ✅ {exito}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleGuardar} className="space-y-6">
        {/* Datos personales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Datos Personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={usuario?.email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
              <input
                type="text"
                value={rut}
                onChange={e => setRut(e.target.value)}
                placeholder="12.345.678-9"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <input
                type="text"
                value={usuario?.rol}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 capitalize"
              />
            </div>
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-1 pb-2 border-b">Cuenta de Abono</h2>
          <p className="text-sm text-gray-500 mb-4">Estos datos se usarán para depositar el pago de tus rendiciones.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <select
                value={banco}
                onChange={e => setBanco(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar banco...</option>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
              <select
                value={tipoCuenta}
                onChange={e => setTipoCuenta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar tipo...</option>
                <option value="corriente">Cuenta Corriente</option>
                <option value="ahorro">Cuenta de Ahorro</option>
                <option value="vista">Cuenta Vista / RUT</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de cuenta</label>
              <input
                type="text"
                value={numeroCuenta}
                onChange={e => setNumeroCuenta(e.target.value)}
                placeholder="00123456789"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {banco && numeroCuenta && tipoCuenta && rut && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              ✅ Cuenta configurada — los pagos se depositarán en {banco} · {tipoCuenta} · {numeroCuenta}
            </div>
          )}
          {(!banco || !numeroCuenta || !tipoCuenta || !rut) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              ⚠️ Completa todos los datos bancarios para que la secretaria pueda procesar tus pagos.
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Cambiar Contraseña</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={passwordNueva}
                onChange={e => setPasswordNueva(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="Repetir nueva contraseña"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="bg-blue-700 text-white px-8 py-2.5 rounded-lg hover:bg-blue-800 transition font-medium disabled:opacity-60"
          >
            {guardando ? '⟳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
