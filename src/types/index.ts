export type Rol = 'rendidor' | 'naiffa' | 'secretaria' | 'admin';
export type EstadoRendicion = 'enviada' | 'aprobada' | 'rechazada' | 'pagada';
export type TipoCuenta = 'corriente' | 'ahorro' | 'vista';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  rut?: string;
  banco?: string;
  numeroCuenta?: string;
  tipoCuenta?: TipoCuenta;
  empresas?: string[];
}

export const EMPRESAS_GRUPO = ['Cencocal S.A.', 'Inmobiliaria Cordillera S.A.'] as const;

export interface Boleta {
  id?: string;
  numeroBoleta: string;
  monto: number;
  detalleGasto: string;
  fechaBoleta: string;
  proveedor?: string;
  fotoUrl?: string;
  ocrData?: any;
  // Solo frontend (antes de guardar)
  fotoFile?: File;
  fotoPreview?: string;
  fotoIndex?: number;
}

export interface Rendicion {
  id: string;
  nombreRendidor: string;
  rutRendidor?: string;
  emailRendidor?: string;
  fechaPeriodoDesde: string;
  fechaPeriodoHasta: string;
  zona: string;
  empresa: string;
  estado: EstadoRendicion;
  montoTotal: number;
  fechaEnvio: string;
  fechaAprobacion?: string;
  fechaPago?: string;
  comentarioAutoriza?: string;
  firmaDigitalRendidor?: string;
  firmaDigitalNaiffa?: string;
  boletas: Boleta[];
}

export const ZONAS = [
  'Casa Matriz',
  'Villa Alemana',
  'Ecommerce',
  'Illapel',
  'Calera Centro',
  'Femacal',
  'Copiapó',
  'Coquimbo',
  'Nogales',
  'Calera de Tango',
] as const;

export const ESTADO_LABELS: Record<EstadoRendicion, string> = {
  enviada: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  pagada: 'Pagada',
};

export const ESTADO_COLORS: Record<EstadoRendicion, string> = {
  enviada: 'bg-yellow-100 text-yellow-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  pagada: 'bg-blue-100 text-blue-800',
};
