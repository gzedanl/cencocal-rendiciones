import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Rendicion, ESTADO_LABELS, ESTADO_COLORS } from '../types';

const formatMonto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

export default function AutorizadorPage() {
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalRendicion, setModalRendicion] = useState<Rendicion | null>(null);
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('enviada');
  const [filtroZona, setFiltroZona] = useState('');
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    const params: any = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroZona) params.zona = filtroZona;
    const res = await api.get('/rendiciones', { params });
    setRendiciones(res.data);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado, filtroZona]);

  const aprobar = async () => {
    if (!modalRendicion) return;
    setProcesando(true);
    try {
      await api.patch(`/rendiciones/${modalRendicion.id}/aprobar`, {
        comentario,
        firmaDigital: 'naiffa_firma_electronica_' + Date.now(),
      });
      setMensajeExito(`Rendición de ${modalRendicion.nombreRendidor} aprobada. Se notificó a secretaria@cencocal.cl`);
      setModalRendicion(null);
      setComentario('');
      cargar();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error aprobando rendición');
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    if (!modalRendicion || !comentario.trim()) {
      alert('Por favor escribe un comentario indicando el motivo del rechazo.');
      return;
    }
    setProcesando(true);
    try {
      await api.patch(`/rendiciones/${modalRendicion.id}/rechazar`, { comentario });
      setModalRendicion(null);
      setComentario('');
      cargar();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error rechazando rendición');
    } finally {
      setProcesando(false);
    }
  };

  const pendientes = rendiciones.filter(r => r.estado === 'enviada').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Autorización</h1>
        {pendientes > 0 && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-yellow-600 text-lg">⏳</span>
            <p className="text-yellow-800 font-medium">Tienes <strong>{pendientes}</strong> rendición(es) esperando aprobación</p>
          </div>
        )}
      </div>

      {mensajeExito && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>✅ {mensajeExito}</span>
          <button onClick={() => setMensajeExito('')} className="text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="enviada">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="pagada">Pagadas</option>
        </select>
        <input
          type="text"
          value={filtroZona}
          onChange={e => setFiltroZona(e.target.value)}
          placeholder="Filtrar por zona..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={cargar} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-200 transition">
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : rendiciones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">✅</div>
          <p>No hay rendiciones con ese filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rendiciones.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-800 text-lg">{r.nombreRendidor}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[r.estado]}`}>
                      {ESTADO_LABELS[r.estado]}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                    <span>🏢 {r.empresa}</span>
                    <span>📍 {r.zona}</span>
                    <span>📅 {new Date(r.fechaPeriodoDesde).toLocaleDateString('es-CL')} — {new Date(r.fechaPeriodoHasta).toLocaleDateString('es-CL')}</span>
                    <span>🧾 {r.boletas.length} boleta(s)</span>
                    <span>Enviada: {new Date(r.fechaEnvio).toLocaleString('es-CL')}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-blue-700">{formatMonto(r.montoTotal)}</p>
                  {r.estado === 'enviada' && (
                    <button
                      onClick={() => { setModalRendicion(r); setComentario(''); }}
                      className="mt-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
                    >
                      Revisar y Autorizar
                    </button>
                  )}
                  {r.estado !== 'enviada' && (
                    <button
                      onClick={() => { setModalRendicion(r); setComentario(''); }}
                      className="mt-2 text-blue-600 text-sm hover:underline"
                    >
                      Ver detalle
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal revisión */}
      {modalRendicion && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">Revisar Rendición</h2>
                <p className="text-sm text-gray-500">{modalRendicion.nombreRendidor} · {modalRendicion.zona}</p>
              </div>
              <button onClick={() => setModalRendicion(null)} className="text-gray-400 hover:text-gray-700 text-2xl">✕</button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm bg-gray-50 rounded-lg p-4">
                <div><span className="text-gray-500">Rendidor:</span> <strong>{modalRendicion.nombreRendidor}</strong></div>
                <div><span className="text-gray-500">Zona:</span> <strong>{modalRendicion.zona}</strong></div>
                <div><span className="text-gray-500">Período:</span> <strong>{new Date(modalRendicion.fechaPeriodoDesde).toLocaleDateString('es-CL')} — {new Date(modalRendicion.fechaPeriodoHasta).toLocaleDateString('es-CL')}</strong></div>
                <div><span className="text-gray-500">Total:</span> <strong className="text-blue-700 text-lg">{formatMonto(modalRendicion.montoTotal)}</strong></div>
              </div>

              <h3 className="font-semibold text-gray-700 mb-3">Boletas ({modalRendicion.boletas.length})</h3>
              <table className="w-full text-sm border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border border-gray-200">N° Boleta</th>
                    <th className="text-left p-2 border border-gray-200">Detalle</th>
                    <th className="text-left p-2 border border-gray-200">Proveedor</th>
                    <th className="text-left p-2 border border-gray-200">Fecha</th>
                    <th className="text-right p-2 border border-gray-200">Monto</th>
                    <th className="text-center p-2 border border-gray-200">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {modalRendicion.boletas.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-2 border border-gray-200">{b.numeroBoleta}</td>
                      <td className="p-2 border border-gray-200">{b.detalleGasto}</td>
                      <td className="p-2 border border-gray-200 text-gray-500">{b.proveedor || '—'}</td>
                      <td className="p-2 border border-gray-200">{new Date(b.fechaBoleta).toLocaleDateString('es-CL')}</td>
                      <td className="p-2 border border-gray-200 text-right font-medium">{formatMonto(Number(b.monto))}</td>
                      <td className="p-2 border border-gray-200 text-center">
                        {b.fotoUrl ? (
                          <button
                            onClick={() => setFotoAmpliada(`${process.env.REACT_APP_API_URL?.replace('/api', '') || ''}${b.fotoUrl}`)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Ver foto
                          </button>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="p-2 font-bold text-right border border-gray-200">TOTAL:</td>
                    <td className="p-2 font-bold text-right text-blue-700 border border-gray-200">{formatMonto(modalRendicion.montoTotal)}</td>
                    <td className="border border-gray-200"></td>
                  </tr>
                </tfoot>
              </table>

              {modalRendicion.estado === 'enviada' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comentario (opcional)</label>
                    <textarea
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Observaciones para el rendidor o secretaria..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
                    🔏 Al aprobar, se registrará tu firma digital automáticamente con timestamp.
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={rechazar}
                      disabled={procesando}
                      className="px-5 py-2.5 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition font-medium disabled:opacity-60"
                    >
                      ✗ Rechazar
                    </button>
                    <button
                      onClick={aprobar}
                      disabled={procesando}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60"
                    >
                      {procesando ? '⟳ Procesando...' : '✓ Aprobar Rendición'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-3xl max-h-full">
            <img src={fotoAmpliada} alt="boleta ampliada" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <button className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
