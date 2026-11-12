import { apiLista, apiUno, subirArchivo } from "@/services/api";
import { getStoredSession } from "@/services/auth";
import {
  cargarCatalogo,
  traducirCambio,
  traducirReporte,
} from "@/services/reportes";
import type {
  CambioDeEstadoApi,
  CuadrillaApi,
  EstadoReporteApi,
  ReporteApi,
} from "@/tipos/api";
import type { Reporte } from "@/tipos/reporte";

export interface FiltrosBandeja {
  estado?: EstadoReporteApi;
  tipoId?: string;
  zonaId?: string;
}

async function traerCambios(reporteId: string) {
  const cambios = await apiLista<CambioDeEstadoApi>(
    `/reportes/${reporteId}/cambios`,
    { conSesion: false, params: { porPagina: 50 } },
  );
  return cambios.map(traducirCambio);
}

async function traducirCompleto(api: ReporteApi): Promise<Reporte> {
  const catalogo = await cargarCatalogo();
  const cambios = await traerCambios(api.id);
  return traducirReporte(api, catalogo, cambios, false);
}

export async function zonaDelOperador(): Promise<string | null> {
  const sesion = await getStoredSession();
  return sesion?.usuario?.zonaId ?? null;
}

export async function obtenerBandeja(
  filtros: FiltrosBandeja = {},
): Promise<Reporte[]> {
  const reportes = await apiLista<ReporteApi>("/bandeja", {
    params: {
      estado: filtros.estado,
      tipoId: filtros.tipoId,
      zonaId: filtros.zonaId ?? "todas",
      porPagina: 50,
    },
  });

  const catalogo = await cargarCatalogo();
  return reportes.map((api) => traducirReporte(api, catalogo, [], false));
}

export async function obtenerReporteOperador(id: string): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(`/reportes/${id}`, {
    conSesion: false,
  });
  return traducirCompleto(api);
}

export async function obtenerReportePorCodigo(
  codigo: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(
    `/reportes/codigo/${encodeURIComponent(codigo)}`,
    { conSesion: false },
  );
  return traducirCompleto(api);
}

export async function cambiarEstadoReporte(
  id: string,
  estado: EstadoReporteApi,
  comentario?: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(`/reportes/${id}/estado`, {
    method: "PATCH",
    body: { estado, comentario: comentario || undefined },
  });
  return traducirCompleto(api);
}

export async function obtenerCuadrillas(
  zonaId: string,
): Promise<CuadrillaApi[]> {
  return apiLista<CuadrillaApi>("/cuadrillas", {
    params: { zonaId, activa: "true", porPagina: 50 },
  });
}

export async function asignarCuadrilla(
  id: string,
  cuadrillaId: string,
  comentario?: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(`/reportes/${id}/cuadrilla`, {
    method: "PATCH",
    body: { cuadrillaId, comentario: comentario || undefined },
  });
  return traducirCompleto(api);
}

export async function marcarDuplicado(
  id: string,
  originalId: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(`/reportes/${id}/duplicado`, {
    method: "POST",
    body: { originalId },
  });
  return traducirCompleto(api);
}

export async function agregarFotoArreglo(
  id: string,
  uriLocal: string,
): Promise<Reporte> {
  const url = await subirArchivo(uriLocal);
  const api = await apiUno<ReporteApi>(`/reportes/${id}/fotos`, {
    method: "POST",
    body: { url },
  });
  return traducirCompleto(api);
}
