import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Rendicion, ESTADO_LABELS, ESTADO_COLORS } from '../types';

const formatMonto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

export default function MisRendicionesPage() {
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<Rendicion | null>(null);

  useEffect(() => {
    api.get('/rendiciones').then(r => {
      setRendiciones(r.data);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  if (cargando) return <div className="text-center py-16 text-gray-500">Cargando rendiciones...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mis Rendiciones</h1>

      {rendiciones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <p>No tienes rendiciones aún. Crea tu primera rendición.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rendiciones.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-800">{r.zona}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[r.estado]}`}>
                      {ESTADO_LABELS[r.estado]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(r.fechaPeriodoDesde).toLocaleDateString('es-CL')} — {new Date(r.fechaPeriodoHasta).toLocaleDateString('es-CL')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Enviada: {new Date(r.fechaEnvio).toLocaleString('es-CL')}</p>
                  {r.comentarioAutoriza && (
                    <p className="text-sm text-orange-700 bg-orange-50 rounded px-2 py-1 mt-2">
                      Comentario: {r.comentarioAutoriza}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-xl font-bold text-blue-700">{formatMonto(r.montoTotal)}</p>
                  <p className="text-xs text-gray-400">{r.boletas.length} boleta(s)</p>
                  <button
                    onClick={() => setSeleccionada(r)}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      {seleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">Detalle de Rendición</h2>
              <button onClick={() => setSeleccionada(null)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-gray-500">Zona:</span> <strong>{seleccionada.zona}</strong></div>
                <div><span className="text-gray-500">Estado:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[seleccionada.estado]}`}>{ESTADO_LABELS[seleccionada.estado]}</span></div>
                <div><span className="text-gray-500">Período:</span> <strong>{new Date(seleccionada.fechaPeriodoDesde).toLocaleDateString('es-CL')} — {new Date(seleccionada.fechaPeriodoHasta).toLocaleDateString('es-CL')}</strong></div>
                <div><span className="text-gray-500">Total:</span> <strong className="text-blue-700">{formatMonto(seleccionada.montoTotal)}</strong></div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border border-gray-200">N° Boleta</th>
                    <th className="text-left p-2 border border-gray-200">Detalle</th>
                    <th className="text-left p-2 border border-gray-200">Fecha</th>
                    <th className="text-right p-2 border border-gray-200">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {seleccionada.boletas.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-2 border border-gray-200">{b.numeroBoleta}</td>
                      <td className="p-2 border border-gray-200">{b.detalleGasto}</td>
                      <td className="p-2 border border-gray-200">{new Date(b.fechaBoleta).toLocaleDateString('es-CL')}</td>
                      <td className="p-2 border border-gray-200 text-right font-medium">{formatMonto(Number(b.monto))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={3} className="p-2 font-bold text-right border border-gray-200">Total:</td>
                    <td className="p-2 font-bold text-right text-blue-700 border border-gray-200">{formatMonto(seleccionada.montoTotal)}</td>
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
