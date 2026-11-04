import type { EstadoReporte } from '@/tipos/reporte';

/** Etiqueta legible de cada estado, una sola fuente de verdad. */
export function nombreEstado(estado: EstadoReporte): string {
  switch (estado) {
    case 'RECIBIDO':
      return 'Recibido';
    case 'EN_REVISION':
      return 'En revisión';
    case 'ASIGNADO_CUADRILLA':
      return 'Asignado a cuadrilla';
    case 'RESUELTO':
      return 'Resuelto';
    case 'RECHAZADO':
      return 'Rechazado';
    default:
      return estado;
  }
}

/** Color por estado: se usa en chips, marcadores del mapa y línea de tiempo. */
export function colorEstado(estado: EstadoReporte): string {
  switch (estado) {
    case 'RECIBIDO':
      return '#0288D1';
    case 'EN_REVISION':
      return '#F9A825';
    case 'ASIGNADO_CUADRILLA':
      return '#7B1FA2';
    case 'RESUELTO':
      return '#2E7D32';
    case 'RECHAZADO':
      return '#C62828';
    default:
      return '#616161';
  }
}

/** Todos los estados, en el orden en que avanza un reclamo. */
export const ESTADOS_ORDENADOS: EstadoReporte[] = [
  'RECIBIDO',
  'EN_REVISION',
  'ASIGNADO_CUADRILLA',
  'RESUELTO',
  'RECHAZADO',
];
