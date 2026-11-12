import { File } from "expo-file-system";
import AsyncStorage from "expo-sqlite/kv-store";

import { reportesPublicosMock } from "@/mocks/reportesPublicos";
import {
  eliminarReporte,
  guardarReporte,
  obtenerReportePorId,
  obtenerReportes,
} from "@/services/almacenamientoReportes";
import {
  apiLista,
  apiUno,
  ErrorApi,
  ErrorDeRed,
  subirArchivo,
} from "@/services/api";
import {
  notificarCambioDeEstado,
  notificarVecinoSumado,
} from "@/services/notificaciones";
import type {
  CambioDeEstadoApi,
  EstadoReporteApi,
  ReporteApi,
  TipoDeReporteApi,
} from "@/tipos/api";
import type {
  CambioEstadoReporte,
  EstadoReporte,
  Reporte,
  TipoDeReporte,
} from "@/tipos/reporte";

const CLAVE_ADHESIONES = "@reporte_ciudadano/adhesiones";

const ESTADO_DESDE_API: Record<EstadoReporteApi, EstadoReporte> = {
  recibido: "RECIBIDO",
  en_revision: "EN_REVISION",
  asignado: "ASIGNADO_CUADRILLA",
  resuelto: "RESUELTO",
  rechazado: "RECHAZADO",
};

export const ESTADO_HACIA_API: Record<EstadoReporte, EstadoReporteApi> = {
  RECIBIDO: "recibido",
  EN_REVISION: "en_revision",
  ASIGNADO_CUADRILLA: "asignado",
  RESUELTO: "resuelto",
  RECHAZADO: "rechazado",
};

function traducirEstado(estado: EstadoReporteApi): EstadoReporte {
  return ESTADO_DESDE_API[estado];
}

export function traducirCambio(cambio: CambioDeEstadoApi): CambioEstadoReporte {
  return {
    id: cambio.id,
    fecha: cambio.fechaHora,
    estado: traducirEstado(cambio.estado),
    comentario: cambio.comentario,
  };
}

type CatalogoTipos = Map<string, string>;

export function traducirReporte(
  api: ReporteApi,
  catalogo: CatalogoTipos,
  cambios: CambioEstadoReporte[],
  yaMeSumé: boolean,
): Reporte {
  const fotosProblema = api.fotos.filter((f) => f.momento === "problema");
  const fotoArreglo = api.fotos.find((f) => f.momento === "arreglo") ?? null;

  return {
    id: api.id,
    codigoSeguimiento: api.codigo,
    tipo: catalogo.get(api.tipoId) ?? api.tipoId,
    descripcionTexto: api.descripcion,
    descripcionAudioUrlLocal: null,
    descripcionAudioUrlRemota: api.audioUrl,
    latitud: api.coordenadas.latitud,
    longitud: api.coordenadas.longitud,
    direccionDescripcion: api.direccion,
    fotoPrincipalUrlLocal: null,
    fotoPrincipalUrlRemota: fotosProblema[0]?.url ?? null,
    fotoSecundariaUrlLocal: null,
    fotoSecundariaUrlRemota: fotosProblema[1]?.url ?? null,
    estadoActual: traducirEstado(api.estado),
    cambios,
    esPublico: true,
    creadorId: api.autorId,
    zonaId: api.zonaId,
    vecinosSumados: api.adhesiones,
    yaMeSumé,
    fotoArregloUrlLocal: null,
    fotoArregloUrlRemota: fotoArreglo?.url ?? null,
    sincronizado: api.sincronizado,
    duplicadoDe: api.duplicadoDe,
  };
}

let catalogoTipos: CatalogoTipos | null = null;
let tiposApiCache: TipoDeReporte[] | null = null;

export async function obtenerTiposDeReporte(): Promise<TipoDeReporte[]> {
  try {
    const tipos = await apiLista<TipoDeReporteApi>("/tipos-de-reporte", {
      conSesion: false,
      params: { porPagina: 50 },
    });

    tiposApiCache = tipos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      icono: t.icono,
      color: t.color,
      areaResponsable: t.areaResponsable,
    }));
    catalogoTipos = new Map(tipos.map((t) => [t.id, t.nombre]));

    return tiposApiCache;
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      // Sin API: catálogo vacío deja el filtro en "Todos".
      return tiposApiCache ?? [];
    }
    throw error;
  }
}

export async function cargarCatalogo(): Promise<CatalogoTipos> {
  if (catalogoTipos) return catalogoTipos;
  await obtenerTiposDeReporte();
  return catalogoTipos ?? new Map();
}

export async function tipoIdDesdeNombre(
  nombre: string,
): Promise<string | null> {
  const tipos = await obtenerTiposDeReporte();
  return tipos.find((t) => t.nombre === nombre)?.id ?? null;
}

export async function obtenerMisReportes(): Promise<Reporte[]> {
  const locales = await obtenerReportes();
  const pendientes = locales.filter((r) => !r.sincronizado);

  try {
    const catalogo = await cargarCatalogo();
    const propios = await apiLista<ReporteApi>("/yo/reportes", {
      params: { porPagina: 100 },
    });

    const mios = propios.map((api) =>
      traducirReporte(
        api,
        catalogo,
        [
          {
            id: `cam-${api.id}-0`,
            fecha: api.creadoEn,
            estado: traducirEstado(api.estado),
            comentario: null,
          },
        ],
        false,
      ),
    );

    // Punto 5: comparar contra la copia local para avisar al vecino si
    // cambió el estado o si se sumaron vecinos a un reporte suyo.
    const localesPorId = new Map(locales.map((r) => [r.id, r]));
    for (const remoto of mios) {
      const previo = localesPorId.get(remoto.id);
      if (previo && previo.sincronizado) {
        if (previo.estadoActual !== remoto.estadoActual) {
          await notificarCambioDeEstado(remoto.tipo, remoto.estadoActual);
        }
        if (remoto.vecinosSumados > previo.vecinosSumados) {
          await notificarVecinoSumado(remoto.tipo, remoto.vecinosSumados);
        }
      }

      // Guardamos la versión fresca para no repetir el aviso en el
      // próximo refresh.
      await guardarReporte(remoto);
    }

    return [...pendientes, ...mios];
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      return [...locales].sort((a, b) => {
        const fechaA = a.cambios[0]?.fecha ?? "";
        const fechaB = b.cambios[0]?.fecha ?? "";
        return fechaB.localeCompare(fechaA);
      });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reportes públicos (mapa de la ciudad)
// ---------------------------------------------------------------------------

async function obtenerIdsAdheridos(): Promise<string[]> {
  const datos = await AsyncStorage.getItem(CLAVE_ADHESIONES);
  if (!datos) return [];
  try {
    return JSON.parse(datos) as string[];
  } catch {
    return [];
  }
}

export async function obtenerReportesPublicos(): Promise<Reporte[]> {
  const [locales, adheridos] = await Promise.all([
    obtenerReportes(),
    obtenerIdsAdheridos(),
  ]);

  try {
    const catalogo = await cargarCatalogo();
    const publicos = await apiLista<ReporteApi>("/reportes", {
      conSesion: false,
      params: {
        porPagina: 100,
        estado: "recibido,en_revision,asignado,resuelto",
      },
    });

    const mapeados = publicos.map((api) =>
      traducirReporte(api, catalogo, [], adheridos.includes(api.id)),
    );

    const pendientes = locales
      .filter((r) => !r.sincronizado)
      .map((r) => ({ ...r, yaMeSumé: false }));

    return [...mapeados, ...pendientes];
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      const publicos: Reporte[] = reportesPublicosMock.map((reporte) => ({
        ...reporte,
        yaMeSumé: adheridos.includes(reporte.id),
        vecinosSumados:
          reporte.vecinosSumados + (adheridos.includes(reporte.id) ? 1 : 0),
      }));

      const propiosPublicos = locales
        .filter((reporte) => reporte.esPublico)
        .map((reporte) => ({ ...reporte, yaMeSumé: false }));

      return [...publicos, ...propiosPublicos];
    }
    throw error;
  }
}

export async function obtenerReportePorIdConPublicos(
  id: string,
): Promise<Reporte | null> {
  const propio = await obtenerReportePorId(id);
  if (propio) return propio;

  const api = await apiUno<ReporteApi>(`/reportes/${id}`, {
    conSesion: false,
  }).catch(() => null);
  if (!api) return null;

  const [catalogo, cambiosApi, adheridos] = await Promise.all([
    cargarCatalogo(),
    apiLista<CambioDeEstadoApi>(`/reportes/${id}/cambios`, {
      conSesion: false,
      params: { porPagina: 100 },
    }).catch(() => [] as CambioDeEstadoApi[]),
    obtenerIdsAdheridos(),
  ]);

  return traducirReporte(
    api,
    catalogo,
    cambiosApi.map(traducirCambio),
    adheridos.includes(api.id),
  );
}

export async function sumarseAReporte(id: string): Promise<Reporte | null> {
  const adheridos = await obtenerIdsAdheridos();

  const propio = await obtenerReportePorId(id);
  if (propio) {
    if (!propio.yaMeSumé) {
      const actualizado: Reporte = {
        ...propio,
        yaMeSumé: true,
        vecinosSumados: propio.vecinosSumados + 1,
      };
      await guardarReporte(actualizado);
      return actualizado;
    }
    return propio;
  }

  const api = await apiUno<ReporteApi>(`/reportes/${id}/adhesiones`, {
    method: "POST",
  }).catch(() => null);
  if (!api) return null;

  if (!adheridos.includes(id)) {
    adheridos.push(id);
    await AsyncStorage.setItem(CLAVE_ADHESIONES, JSON.stringify(adheridos));
  }

  const catalogo = await cargarCatalogo();
  return traducirReporte(api, catalogo, [], true);
}

interface CuerpoCrearReporte {
  id?: string;
  tipoId: string;
  descripcion: string | null;
  audioUrl: string | null;
  fotos: { id?: string; url: string }[];
  coordenadas: { latitud: number; longitud: number };
  direccion: string;
  creadoEn: string;
}

/**
 * Sube las fotos pendientes (uris locales) a /archivos y devuelve las
 * URLs remotas para mandar en el reporte.
 */
async function subirFotosPendientes(reporte: Reporte): Promise<{
  urlPrincipal: string | null;
  urlSecundaria: string | null;
  urlAudio: string | null;
}> {
  const subir = async (local: string | null, remota: string | null) => {
    if (remota) return remota;
    if (!local) return null;

    if (!new File(local).exists) {
      throw new Error(`El archivo local ya no existe en el teléfono: ${local}`);
    }

    return subirArchivo(local);
  };

  return {
    urlPrincipal: await subir(
      reporte.fotoPrincipalUrlLocal,
      reporte.fotoPrincipalUrlRemota,
    ),
    urlSecundaria: await subir(
      reporte.fotoSecundariaUrlLocal,
      reporte.fotoSecundariaUrlRemota,
    ),
    urlAudio: await subir(
      reporte.descripcionAudioUrlLocal,
      reporte.descripcionAudioUrlRemota,
    ),
  };
}

export async function enviarReporte(reporte: Reporte): Promise<Reporte> {
  const tipoId = await tipoIdDesdeNombre(reporte.tipo);

  try {
    if (!tipoId) {
      throw new Error("No se pudo identificar el tipo de problema.");
    }

    const { urlPrincipal, urlSecundaria, urlAudio } =
      await subirFotosPendientes(reporte);

    const fotos = [urlPrincipal, urlSecundaria]
      .filter((url): url is string => url !== null)
      .map((url) => ({ url }));

    const cuerpo: CuerpoCrearReporte = {
      id: reporte.id.startsWith("rep-") ? reporte.id : undefined,
      tipoId,
      descripcion: reporte.descripcionTexto,
      audioUrl: urlAudio,
      fotos,
      coordenadas: { latitud: reporte.latitud, longitud: reporte.longitud },
      direccion: reporte.direccionDescripcion,
      creadoEn: reporte.cambios[0]?.fecha ?? new Date().toISOString(),
    };

    const api = await apiUno<ReporteApi>("/reportes", {
      method: "POST",
      body: cuerpo,
    });

    const catalogo = await cargarCatalogo();
    const sincronizado = traducirReporte(api, catalogo, reporte.cambios, false);

    // Si venía de la cola local con otro id, limpiamos y guardamos la
    // versión que devolvió la API.
    if (api.id !== reporte.id) {
      await eliminarReporte(reporte.id);
    }
    await guardarReporte({ ...sincronizado, sincronizado: true });

    return { ...sincronizado, sincronizado: true };
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      // Sin conexión: queda en la cola local y se sube solo después.
      console.warn(
        `[sync] Error de red al subir ${reporte.id}:`,
        error.message,
      );

      const pendiente: Reporte = {
        ...reporte,
        sincronizado: false,
        esPublico: false,
      };
      await guardarReporte(pendiente);
      return pendiente;
    }
    throw error;
  }
}

export async function sincronizarPendientes(): Promise<void> {
  const locales = await obtenerReportes();
  const pendientes = locales.filter((r) => !r.sincronizado);

  for (const reporte of pendientes) {
    try {
      await enviarReporte(reporte);
    } catch (error) {
      // Si falla uno seguimos con los demás: queda pendiente.
      console.warn(
        `[sync] No se pudo subir el reporte ${reporte.id}:`,
        error instanceof ErrorApi ? `${error.codigo}: ${error.message}` : error,
      );
    }
  }
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaEnMetros(
  latitudA: number,
  longitudA: number,
  latitudB: number,
  longitudB: number,
): number {
  const radioTierra = 6371000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;

  const deltaLat = aRadianes(latitudB - latitudA);
  const deltaLon = aRadianes(longitudB - longitudA);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(aRadianes(latitudA)) *
      Math.cos(aRadianes(latitudB)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * radioTierra * Math.asin(Math.sqrt(a));
}

/** Reportes públicos abiertos a menos de `radioMetros` del punto dado. */
export async function obtenerReportesCercanos(
  latitud: number,
  longitud: number,
  radioMetros = 50,
): Promise<Reporte[]> {
  try {
    const catalogo = await cargarCatalogo();
    const cercanos = await apiLista<ReporteApi>("/reportes/cercanos", {
      conSesion: false,
      params: { latitud, longitud, radioMetros },
    });

    return cercanos.map((api) => traducirReporte(api, catalogo, [], false));
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      const publicos = await obtenerReportesPublicos();
      return publicos
        .map((reporte) => ({
          reporte,
          distancia: distanciaEnMetros(
            latitud,
            longitud,
            reporte.latitud,
            reporte.longitud,
          ),
        }))
        .filter((item) => item.distancia <= radioMetros)
        .sort((a, b) => a.distancia - b.distancia)
        .map((item) => item.reporte);
    }
    throw error;
  }
}
