import React, { useEffect, useState } from 'react';
import api from '../services/api';

const formatMonto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

interface Resumen {
  total: number;
  montoTotal: number;
  porEstado: { enviada: number; aprobada: number; rechazada: number; pagada: number };
  tiempoPromedioHoras: number;
  topRendidores: { nombre: string; zona: string; monto: number; boletas: number }[];
}

export default function ReportesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    const res = await api.get(`/reportes/mes?year=${year}&month=${month}`);
    setResumen(res.data);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [year, month]);

  const exportarExcel = async () => {
    const res = await api.get(`/reportes/exportar-excel?year=${year}&month=${month}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rendiciones_${year}_${month + 1}.xlsx`;
    a.click();
  };

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <div className="flex gap-2 items-center">
          <select
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportarExcel}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition"
          >
            📥 Exportar Excel
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-16 text-gray-500">Cargando reporte...</div>
      ) : !resumen || resumen.total === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <p>No hay datos para {meses[month]} {year}.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-gray-500 text-sm">Total Rendiciones</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{resumen.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-gray-500 text-sm">Monto Total</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{formatMonto(resumen.montoTotal)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-gray-500 text-sm">Tasa Aprobación</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {resumen.total > 0 ? Math.round(((resumen.porEstado.aprobada + resumen.porEstado.pagada) / resumen.total) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-gray-500 text-sm">Tiempo Prom. Aprobación</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{resumen.tiempoPromedioHoras}h</p>
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">Distribución por Estado</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pendientes', count: resumen.porEstado.enviada, color: 'bg-yellow-100 text-yellow-800' },
                { label: 'Aprobadas', count: resumen.porEstado.aprobada, color: 'bg-green-100 text-green-800' },
                { label: 'Rechazadas', count: resumen.porEstado.rechazada, color: 'bg-red-100 text-red-800' },
                { label: 'Pagadas', count: resumen.porEstado.pagada, color: 'bg-blue-100 text-blue-800' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`rounded-lg p-4 text-center ${color}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm font-medium mt-1">{label}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {resumen.total > 0 ? Math.round((count / resumen.total) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top rendidores */}
          {resumen.topRendidores.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">Top Rendidores — {meses[month]} {year}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-2 text-gray-500 font-medium">#</th>
                    <th className="pb-2 text-gray-500 font-medium">Nombre</th>
                    <th className="pb-2 text-gray-500 font-medium">Zona</th>
                    <th className="pb-2 text-gray-500 font-medium text-center">Boletas</th>
                    <th className="pb-2 text-gray-500 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.topRendidores.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-3 font-medium text-gray-800">{r.nombre}</td>
                      <td className="py-3 text-gray-500">{r.zona}</td>
                      <td className="py-3 text-center text-gray-500">{r.boletas}</td>
                      <td className="py-3 text-right font-semibold text-blue-700">{formatMonto(r.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
