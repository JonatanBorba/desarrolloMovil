export type EstadoReporteApi =
  | "recibido"
  | "en_revision"
  | "asignado"
  | "resuelto"
  | "rechazado";

export interface FotoApi {
  id: string;
  url: string;
  momento: "problema" | "arreglo";
}

export interface ReporteApi {
  id: string;
  codigo: string;
  tipoId: string;
  descripcion: string | null;
  audioUrl: string | null;
  fotos: FotoApi[];
  coordenadas: { latitud: number; longitud: number };
  direccion: string;
  zonaId: string;
  estado: EstadoReporteApi;
  autorId: string;
  cuadrillaId: string | null;
  duplicadoDe: string | null;
  adhesiones: number;
  creadoEn: string;
  sincronizado: boolean;
}

export interface CambioDeEstadoApi {
  id: string;
  reporteId: string;
  estado: EstadoReporteApi;
  comentario: string | null;
  operadorId: string | null;
  fechaHora: string;
}

export interface TipoDeReporteApi {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  areaResponsable: string;
}

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: "vecino" | "operador";
  zonaId: string | null;
  avisosActivos: boolean;
  creadoEn: string;
}

export interface SesionApi {
  token: string;
  usuario: UsuarioApi;
}
