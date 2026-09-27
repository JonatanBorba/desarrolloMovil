export type EstadoReporte =
  | 'RECIBIDO'
  | 'EN_REVISION'
  | 'ASIGNADO_CUADRILLA'
  | 'RESUELTO'
  | 'RECHAZADO';

export interface CambioEstadoReporte {
  id: string;
  fecha: string; // ISO 8601 con zona
  estado: EstadoReporte;
  comentario: string | null;
}

export interface Zona {
  id: string;
  nombre: string;
}

export interface Cuadrilla {
  id: string;
  nombre: string;
  zonaId: string;
}

export interface Reporte {
  id: string;
  codigoSeguimiento: string;
  tipo: string; // bache, luminaria, etc.
  descripcionTexto: string | null;
  descripcionAudioUrlLocal: string | null;
  descripcionAudioUrlRemota: string | null;
  latitud: number;
  longitud: number;
  direccionDescripcion: string;
  fotoPrincipalUrlLocal: string | null;
  fotoPrincipalUrlRemota: string | null;
  fotoSecundariaUrlLocal: string | null;
  fotoSecundariaUrlRemota: string | null;
  estadoActual: EstadoReporte;
  cambios: CambioEstadoReporte[];
  esPublico: boolean;
  creadorId: string;
  zonaId: string;
  vecinosSumados: number;
}
