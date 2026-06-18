import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Rendicion } from '../types';

const formatMonto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

export default function PagosPage() {
  const [listasParaPagar, setListasParaPagar] = useState<Rendicion[]>([]);
  const [pagadas, setPagadas] = useState<Rendicion[]>([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [exito, setExito] = useState('');
  const [modalDetalle, setModalDetalle] = useState<Rendicion | null>(null);

  const cargar = async () => {
    setCargando(true);
    const res = await api.get('/pagos/resumen');
    setListasParaPagar(res.data.listasParaPagar);
    setPagadas(res.data.pagadas);
    setTotalPendiente(res.data.totalPendiente);
    setTotalPagado(res.data.totalPagado);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const marcarPagado = async (id: string, nombre: string) => {
    setProcesando(id);
    try {
      await api.patch(`/pagos/${id}/pagar`, {});
      setExito(`Pago de ${nombre} marcado como completado.`);
      cargar();
      setTimeout(() => setExito(''), 5000);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error procesando pago');
    } finally {
      setProcesando(null);
    }
  };

  const exportarNomina = async () => {
    const res = await api.get('/pagos/exportar-nomina', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_pagos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
  };

  const generarRemesa = async () => {
    const res = await api.get('/pagos/remesa-bancaria', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remesa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Procesar Pagos</h1>
      </div>

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex justify-between">
          <span>✅ {exito}</span>
          <button onClick={() => setExito('')}>✕</button>
        </div>
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-yellow-700 text-sm font-medium">Listo para Pagar</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{formatMonto(totalPendiente)}</p>
          <p className="text-yellow-600 text-xs mt-1">{listasParaPagar.length} rendición(es)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-green-700 text-sm font-medium">Ya Pagado</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{formatMonto(totalPagado)}</p>
          <p className="text-green-600 text-xs mt-1">{pagadas.length} rendición(es)</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-blue-700 text-sm font-medium">Total General</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{formatMonto(totalPendiente + totalPagado)}</p>
          <p className="text-blue-600 text-xs mt-1">{listasParaPagar.length + pagadas.length} rendición(es)</p>
        </div>
      </div>

      {/* Acciones masivas */}
      {listasParaPagar.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex gap-3 flex-wrap">
          <button
            onClick={exportarNomina}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition flex items-center gap-2"
          >
            📥 Exportar Nómina (Excel)
          </button>
          <button
            onClick={generarRemesa}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition flex items-center gap-2"
          >
            📄 Generar Remesa Bancaria
          </button>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : (
        <>
          <h2 className="font-semibold text-gray-700 mb-3">
            Pendientes de Pago ({listasParaPagar.length})
            {listasParaPagar.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">— Total: {formatMonto(totalPendiente)}</span>}
          </h2>

          {listasParaPagar.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500 mb-6">
              <div className="text-4xl mb-2">✅</div>
              <p>No hay rendiciones pendientes de pago.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {listasParaPagar.map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-yellow-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{r.nombreRendidor}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 flex-wrap mt-1">
                        <span>📍 {r.zona}</span>
                        <span>📅 Aprobada: {r.fechaAprobacion ? new Date(r.fechaAprobacion).toLocaleDateString('es-CL') : '—'}</span>
                        <span>🧾 {r.boletas.length} boleta(s)</span>
                      </div>
                      {r.rutRendidor && (
                        <p className="text-xs text-gray-400 mt-1">RUT: {r.rutRendidor}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-green-700">{formatMonto(r.montoTotal)}</p>
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={() => setModalDetalle(r)}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() => marcarPagado(r.id, r.nombreRendidor)}
                          disabled={procesando === r.id}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-60"
                        >
                          {procesando === r.id ? '⟳' : '✓ Marcar Pagado'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagadas.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-700 mb-3">Historial de Pagos ({pagadas.length})</h2>
              <div className="space-y-2">
                {pagadas.map(r => (
                  <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-800">{r.nombreRendidor}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="text-sm text-gray-500">{r.zona}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="text-xs text-gray-400">Pagado: {r.fechaPago ? new Date(r.fechaPago).toLocaleDateString('es-CL') : '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">{formatMonto(r.montoTotal)}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">PAGADO</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal detalle */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between">
              <h2 className="font-bold text-lg">Detalle — {modalDetalle.nombreRendidor}</h2>
              <button onClick={() => setModalDetalle(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border border-gray-200">N° Boleta</th>
                    <th className="text-left p-2 border border-gray-200">Detalle</th>
                    <th className="text-right p-2 border border-gray-200">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {modalDetalle.boletas.map(b => (
                    <tr key={b.id}>
                      <td className="p-2 border border-gray-200">{b.numeroBoleta}</td>
                      <td className="p-2 border border-gray-200">{b.detalleGasto}</td>
                      <td className="p-2 border border-gray-200 text-right">{formatMonto(Number(b.monto))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className="p-2 text-right border border-gray-200">TOTAL:</td>
                    <td className="p-2 text-right text-blue-700 border border-gray-200">{formatMonto(modalDetalle.montoTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
