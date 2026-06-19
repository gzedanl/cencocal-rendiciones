import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Boleta, ZONAS, EMPRESAS_GRUPO } from '../types';
import api from '../services/api';
import { createWorker } from 'tesseract.js';

const formatMonto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

interface BoletaForm extends Boleta {
  fotoFile?: File;
  fotoPreview?: string;
  procesandoOcr?: boolean;
}

export default function RendidorPage() {
  const { usuario } = useAuth();
  const empresasDisponibles = usuario?.empresas?.length ? usuario.empresas : ['Cencocal S.A.'];
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [zona, setZona] = useState('');
  const [empresa, setEmpresa] = useState(empresasDisponibles[0]);

  // Actualiza empresa cuando carga el usuario con sus empresas reales
  useEffect(() => {
    if (empresasDisponibles.length > 0) {
      setEmpresa(prev => empresasDisponibles.includes(prev) ? prev : empresasDisponibles[0]);
    }
  }, [usuario?.empresas]);
  const [boletas, setBoletas] = useState<BoletaForm[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const procesarOCR = async (file: File, index: number) => {
    setBoletas(prev => prev.map((b, i) => i === index ? { ...b, procesandoOcr: true } : b));
    try {
      const worker = await createWorker('spa+eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Extraer datos del texto OCR
      const montoMatch = text.match(/\$?\s*([\d.,]+)/);
      const fechaMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      const boletaMatch = text.match(/(?:boleta|folio|n[úu]mero|n°)[:\s]*(\d+)/i);

      setBoletas(prev => prev.map((b, i) => i === index ? {
        ...b,
        procesandoOcr: false,
        monto: montoMatch ? parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.')) : b.monto,
        fechaBoleta: fechaMatch ? fechaMatch[1] : b.fechaBoleta,
        numeroBoleta: boletaMatch ? boletaMatch[1] : b.numeroBoleta,
        ocrData: { textoExtraido: text.slice(0, 500) },
      } : b));
    } catch {
      setBoletas(prev => prev.map((b, i) => i === index ? { ...b, procesandoOcr: false } : b));
    }
  };

  const agregarArchivos = useCallback((files: FileList | File[]) => {
    const nuevas: BoletaForm[] = Array.from(files).slice(0, 10 - boletas.length).map(file => {
      const preview = URL.createObjectURL(file);
      return {
        numeroBoleta: '',
        monto: 0,
        detalleGasto: '',
        fechaBoleta: new Date().toISOString().slice(0, 10),
        proveedor: '',
        fotoFile: file,
        fotoPreview: preview,
        procesandoOcr: false,
      };
    });

    setBoletas(prev => {
      const updated = [...prev, ...nuevas];
      // Iniciar OCR para cada nueva boleta con imagen
      nuevas.forEach((b, i) => {
        if (b.fotoFile && b.fotoFile.type.startsWith('image/')) {
          setTimeout(() => procesarOCR(b.fotoFile!, prev.length + i), 100);
        }
      });
      return updated;
    });
  }, [boletas.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) agregarArchivos(e.dataTransfer.files);
  };

  const actualizarBoleta = (index: number, campo: keyof BoletaForm, valor: any) => {
    setBoletas(prev => prev.map((b, i) => i === index ? { ...b, [campo]: valor } : b));
  };

  const eliminarBoleta = (index: number) => {
    setBoletas(prev => prev.filter((_, i) => i !== index));
  };

  const total = boletas.reduce((s, b) => s + (Number(b.monto) || 0), 0);

  const validar = () => {
    if (!nombre.trim()) return 'El nombre es requerido';
    if (!periodoDesde || !periodoHasta) return 'El período es requerido';
    if (!zona) return 'La zona es requerida';
    if (boletas.length === 0) return 'Debes agregar al menos una boleta';
    if (boletas.some(b => !b.detalleGasto.trim())) return 'Todos los gastos necesitan un detalle';
    if (boletas.some(b => Number(b.monto) <= 0)) return 'Todos los montos deben ser mayores a 0';
    if (total <= 0) return 'El monto total debe ser mayor a 0';
    return null;
  };

  const handleEnviar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setError('');
    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('periodoDesde', periodoDesde);
      formData.append('periodoHasta', periodoHasta);
      formData.append('zona', zona);
      formData.append('empresa', empresa);

      const boletasData = boletas.map((b, i) => ({
        numeroBoleta: b.numeroBoleta || `BOL-${i + 1}`,
        monto: b.monto,
        detalleGasto: b.detalleGasto,
        fechaBoleta: b.fechaBoleta,
        proveedor: b.proveedor,
        ocrData: b.ocrData,
        fotoIndex: i,
      }));
      formData.append('boletas', JSON.stringify(boletasData));

      boletas.forEach(b => {
        if (b.fotoFile) formData.append('fotos', b.fotoFile);
      });

      await api.post('/rendiciones', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(true);
      setNombre(usuario?.nombre || '');
      setPeriodoDesde('');
      setPeriodoHasta('');
      setZona('');
      setEmpresa(empresasDisponibles[0]);
      setBoletas([]);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error enviando rendición');
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Rendición Enviada</h2>
          <p className="text-gray-600 mb-2">Tu rendición fue enviada exitosamente.</p>
          <p className="text-sm text-gray-500 mb-6">Se notificó automáticamente a <strong>naiffa.chahuan@cencocal.cl</strong> para su revisión.</p>
          <button
            onClick={() => setExito(false)}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition"
          >
            Nueva Rendición
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Rendición de Gastos</h1>
        <p className="text-gray-500 text-sm mt-1">Completa el formulario y sube las fotos de tus boletas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Datos del Rendidor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre Apellido"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona / Centro de Distribución *</label>
            <select
              value={zona}
              onChange={e => setZona(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar zona...</option>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className={empresasDisponibles.length === 1 ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
            {empresasDisponibles.length === 1 ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 text-sm">
                {empresasDisponibles[0]}
              </div>
            ) : (
              <select
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {empresasDisponibles.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período desde *</label>
            <input
              type="date"
              value={periodoDesde}
              onChange={e => setPeriodoDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período hasta *</label>
            <input
              type="date"
              value={periodoHasta}
              onChange={e => setPeriodoHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Zona de carga de archivos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Boletas y Comprobantes</h2>

        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-4xl mb-2">📷</div>
          <p className="text-gray-600 font-medium">Arrastra fotos aquí o haz clic para seleccionar</p>
          <p className="text-gray-400 text-sm mt-1">JPG, PNG, PDF · Máx 50MB por archivo · Hasta 10 archivos</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={e => e.target.files && agregarArchivos(e.target.files)}
          />
        </div>

        {boletas.length > 0 && (
          <div className="mt-6 space-y-4">
            {boletas.map((boleta, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Preview foto */}
                  {boleta.fotoPreview && (
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white">
                      {boleta.fotoFile?.type === 'application/pdf' ? (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-red-50">📄</div>
                      ) : (
                        <img src={boleta.fotoPreview} alt="boleta" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">N° Boleta</label>
                      <input
                        type="text"
                        value={boleta.numeroBoleta}
                        onChange={e => actualizarBoleta(i, 'numeroBoleta', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="001234"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Monto ($) {boleta.procesandoOcr && <span className="text-blue-500">⟳ OCR...</span>}
                      </label>
                      <input
                        type="number"
                        value={boleta.monto || ''}
                        onChange={e => actualizarBoleta(i, 'monto', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Boleta</label>
                      <input
                        type="date"
                        value={boleta.fechaBoleta}
                        onChange={e => actualizarBoleta(i, 'fechaBoleta', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Detalle del Gasto *</label>
                      <input
                        type="text"
                        value={boleta.detalleGasto}
                        onChange={e => actualizarBoleta(i, 'detalleGasto', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="Ej: Taxi a reunión con cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
                      <input
                        type="text"
                        value={boleta.proveedor || ''}
                        onChange={e => actualizarBoleta(i, 'proveedor', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="Taxi San Cristóbal"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarBoleta(i)}
                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                    title="Eliminar boleta"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-gray-600 font-medium">{boletas.length} boleta(s)</span>
              <div className="text-right">
                <span className="text-gray-500 text-sm">Total a rendir:</span>
                <p className="text-2xl font-bold text-blue-700">{formatMonto(total)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => { setNombre(usuario?.nombre || ''); setPeriodoDesde(''); setPeriodoHasta(''); setZona(''); setBoletas([]); setError(''); }}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          Limpiar
        </button>
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="px-6 py-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium disabled:opacity-60 flex items-center gap-2"
        >
          {enviando ? '⟳ Enviando...' : '📨 Enviar a Revisar'}
        </button>
      </div>
    </div>
  );
}
