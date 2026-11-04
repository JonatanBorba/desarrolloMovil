import type { EstadoReporte } from "@/tipos/reporte";

export function nombreEstado(estado: EstadoReporte): string {
  switch (estado) {
    case "RECIBIDO":
      return "Recibido";
    case "EN_REVISION":
      return "En revisión";
    case "ASIGNADO_CUADRILLA":
      return "Asignado a cuadrilla";
    case "RESUELTO":
      return "Resuelto";
    case "RECHAZADO":
      return "Rechazado";
    default:
      return estado;
  }
}

export function colorEstado(estado: EstadoReporte): string {
  switch (estado) {
    case "RECIBIDO":
      return "#0288D1";
    case "EN_REVISION":
      return "#F9A825";
    case "ASIGNADO_CUADRILLA":
      return "#7B1FA2";
    case "RESUELTO":
      return "#2E7D32";
    case "RECHAZADO":
      return "#C62828";
    default:
      return "#616161";
  }
}

export const ESTADOS_ORDENADOS: EstadoReporte[] = [
  "RECIBIDO",
  "EN_REVISION",
  "ASIGNADO_CUADRILLA",
  "RESUELTO",
  "RECHAZADO",
];
