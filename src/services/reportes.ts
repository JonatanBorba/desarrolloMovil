
import {
  guardarIdsAdheridos,
  obtenerIdsAdheridos,
} from "@/services/preferencias";

import {
  reportesPublicosMock,
  tiposDeReporteMock,
} from "@/mocks/reportesPublicos";

import {
  eliminarReporte,
  guardarReporte,
  obtenerReportePorId,
  obtenerReportes,
} from "@/services/almacenamientoReportes";

import {
  apiLista,
  apiUno,
  ErrorDeRed,
  subirArchivo,
} from "@/services/api";

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

// ---------------------------------------------------------------------------
// Traducción de estados y reportes
// ---------------------------------------------------------------------------

const ESTADO_DESDE_API: Record<EstadoReporteApi, EstadoReporte> = {
  recibido: "RECIBIDO",
  en_revision: "EN_REVISION",
  asignado: "ASIGNADO_CUADRILLA",
  resuelto: "RESUELTO",
  rechazado: "RECHAZADO",
};

const ESTADO_HACIA_API: Record<EstadoReporte, EstadoReporteApi> = {
  RECIBIDO: "recibido",
  EN_REVISION: "en_revision",
  ASIGNADO_CUADRILLA: "asignado",
  RESUELTO: "resuelto",
  RECHAZADO: "rechazado",
};

function traducirEstado(estado: EstadoReporteApi): EstadoReporte {
  return ESTADO_DESDE_API[estado];
}

function traducirCambio(cambio: CambioDeEstadoApi): CambioEstadoReporte {
  return {
    id: cambio.id,
    fecha: cambio.fechaHora,
    estado: traducirEstado(cambio.estado),
    comentario: cambio.comentario,
  };
}

type CatalogoTipos = Map<string, string>;

function traducirReporte(
  api: ReporteApi,
  catalogo: CatalogoTipos,
  cambios: CambioEstadoReporte[],
  yaMeSumé: boolean,
): Reporte {
  const fotosProblema = api.fotos.filter(
    (f) => f.momento === "problema",
  );

  const fotoArreglo =
    api.fotos.find((f) => f.momento === "arreglo") ?? null;

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

// ---------------------------------------------------------------------------
// Catálogo de tipos de reporte
// ---------------------------------------------------------------------------

let catalogoTipos: CatalogoTipos | null = null;
let tiposApiCache: TipoDeReporte[] | null = null;

export async function obtenerTiposDeReporte(): Promise<TipoDeReporte[]> {
  try {
    const tipos = await apiLista<TipoDeReporteApi>(
      "/tipos-de-reporte",
      {
        conSesion: false,
        params: { porPagina: 50 },
      },
    );

    tiposApiCache = tipos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      icono: t.icono,
      color: t.color,
      areaResponsable: t.areaResponsable,
    }));

    catalogoTipos = new Map(
      tipos.map((t) => [t.id, t.nombre]),
    );

    return tiposApiCache;
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      const tiposLocales =
        tiposApiCache?.length
          ? tiposApiCache
          : tiposDeReporteMock;

      tiposApiCache = tiposLocales;

      catalogoTipos = new Map(
        tiposLocales.map((tipo) => [tipo.id, tipo.nombre]),
      );

      console.warn(
        "API no disponible. Se utiliza el catálogo local de problemas.",
      );

      return tiposLocales;
    }

    throw error;
  }
}

async function cargarCatalogo(): Promise<CatalogoTipos> {
  if (catalogoTipos) return catalogoTipos;

  await obtenerTiposDeReporte();

  return catalogoTipos ?? new Map();
}

/** Ignora tildes, mayúsculas y espacios sobrantes al comparar nombres. */
function normalizarNombre(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function tipoIdDesdeNombre(
  nombre: string,
): Promise<string | null> {
  const tipos = await obtenerTiposDeReporte();
  const buscado = normalizarNombre(nombre);

  const encontrado = tipos.find(
    (t) => normalizarNombre(t.nombre) === buscado,
  );

  if (!encontrado) {
    console.warn(
      "Tipo no encontrado. Guardado en el reporte:",
      JSON.stringify(nombre),
      "| Catálogo:",
      tipos.map((t) => t.nombre),
    );
  }

  return encontrado?.id ?? null;
}

// ---------------------------------------------------------------------------
// Mis reportes
// ---------------------------------------------------------------------------

export async function obtenerMisReportes(): Promise<Reporte[]> {
  const locales = await obtenerReportes();

  try {
    const catalogo = await cargarCatalogo();

    const propios = await apiLista<ReporteApi>(
      "/yo/reportes",
      {
        params: { porPagina: 100 },
      },
    );

    const mios = propios.map((api) => {
      const remoto = traducirReporte(
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
      );

      const local = locales.find((r) => r.id === api.id);

      const direccionRemota = remoto.direccionDescripcion?.trim();
      const direccionLocal = local?.direccionDescripcion?.trim();

      const direccionRemotaPendiente =
        !direccionRemota ||
        direccionRemota.toLowerCase() ===
          "dirección pendiente de identificar";

      const direccionLocalValida =
        !!direccionLocal &&
        direccionLocal.toLowerCase() !==
          "dirección pendiente de identificar";

      return {
        ...remoto,
        direccionDescripcion:
          direccionRemotaPendiente && direccionLocalValida
            ? direccionLocal
            : remoto.direccionDescripcion,
      };
    });

    const idsSincronizados = new Set(
      mios.map((r) => r.id),
    );

    // Conservamos los reportes locales que todavía no llegaron al servidor.
    const pendientes = locales.filter(
      (r) => !r.sincronizado && !idsSincronizados.has(r.id),
    );

    // Actualizamos los registros confirmados por el servidor
    // sin perder archivos ni información local.
    for (const local of locales) {
      if (idsSincronizados.has(local.id) && !local.sincronizado) {
        const remoto = mios.find((r) => r.id === local.id);

        if (remoto) {
          await guardarReporte({
            ...local,
            ...remoto,

            fotoPrincipalUrlLocal:
              local.fotoPrincipalUrlLocal,

            fotoSecundariaUrlLocal:
              local.fotoSecundariaUrlLocal,

            descripcionAudioUrlLocal:
              local.descripcionAudioUrlLocal,

            fotoArregloUrlLocal:
              local.fotoArregloUrlLocal,

            direccionDescripcion:
              remoto.direccionDescripcion,

            sincronizado: true,
          });
        }
      }
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
// Bandeja y funciones del operador
// ---------------------------------------------------------------------------

export async function obtenerBandejaOperador(): Promise<Reporte[]> {
  const catalogo = await cargarCatalogo();

  const reportes = await apiLista<ReporteApi>(
    "/bandeja",
    {
      params: { porPagina: 100 },
    },
  );

  return reportes.map((api) =>
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
}

async function traducirReporteOperador(
  api: ReporteApi,
): Promise<Reporte> {
  const [catalogo, cambiosApi] = await Promise.all([
    cargarCatalogo(),
    apiLista<CambioDeEstadoApi>(
      `/reportes/${api.id}/cambios`,
      {
        params: { porPagina: 100 },
      },
    ),
  ]);

  return traducirReporte(
    api,
    catalogo,
    cambiosApi.map(traducirCambio),
    false,
  );
}

export async function obtenerReporteOperadorPorId(
  id: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(`/reportes/${id}`);

  return traducirReporteOperador(api);
}

export async function actualizarEstadoReporteOperador(
  id: string,
  estado: EstadoReporte,
  comentario: string,
): Promise<Reporte> {
  const api = await apiUno<ReporteApi>(
    `/reportes/${id}/estado`,
    {
      method: "PATCH",
      body: {
        estado: ESTADO_HACIA_API[estado],
        comentario: comentario.trim() || null,
      },
    },
  );

  return traducirReporteOperador(api);
}

// ---------------------------------------------------------------------------
// Reportes públicos (mapa de la ciudad)
// ---------------------------------------------------------------------------

export async function obtenerReportesPublicos(): Promise<Reporte[]> {
  const [locales, adheridos] = await Promise.all([
    obtenerReportes(),
    obtenerIdsAdheridos(),
  ]);

  try {
    const catalogo = await cargarCatalogo();

    const publicos = await apiLista<ReporteApi>(
      "/reportes",
      {
        conSesion: false,
        params: {
          porPagina: 100,
          estado: "recibido,en_revision,asignado,resuelto",
        },
      },
    );

    const mapeados = publicos.map((api) =>
      traducirReporte(
        api,
        catalogo,
        [],
        adheridos.includes(api.id),
      ),
    );

    const pendientes = locales
      .filter((r) => !r.sincronizado)
      .map((r) => ({ ...r, yaMeSumé: false }));

    return [...mapeados, ...pendientes];
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      const publicos: Reporte[] = reportesPublicosMock.map(
        (reporte) => ({
          ...reporte,
          yaMeSumé: adheridos.includes(reporte.id),
          vecinosSumados:
            reporte.vecinosSumados +
            (adheridos.includes(reporte.id) ? 1 : 0),
        }),
      );

      const propiosPublicos = locales
        .filter((reporte) => reporte.esPublico)
        .map((reporte) => ({
          ...reporte,
          yaMeSumé: false,
        }));

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

  const api = await apiUno<ReporteApi>(
    `/reportes/${id}`,
    {
      conSesion: false,
    },
  ).catch(() => null);

  if (!api) return null;

  const [catalogo, cambiosApi, adheridos] = await Promise.all([
    cargarCatalogo(),

    apiLista<CambioDeEstadoApi>(
      `/reportes/${id}/cambios`,
      {
        conSesion: false,
        params: { porPagina: 100 },
      },
    ).catch(() => [] as CambioDeEstadoApi[]),

    obtenerIdsAdheridos(),
  ]);

  return traducirReporte(
    api,
    catalogo,
    cambiosApi.map(traducirCambio),
    adheridos.includes(api.id),
  );
}

export async function sumarseAReporte(
  id: string,
): Promise<Reporte | null> {
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

  const api = await apiUno<ReporteApi>(
    `/reportes/${id}/adhesiones`,
    {
      method: "POST",
    },
  ).catch(() => null);

  if (!api) return null;

  if (!adheridos.includes(id)) {
    adheridos.push(id);
    await guardarIdsAdheridos(adheridos);
  }

  const catalogo = await cargarCatalogo();

  return traducirReporte(api, catalogo, [], true);
}

// ---------------------------------------------------------------------------
// Creación y sincronización de reportes
// ---------------------------------------------------------------------------

interface CuerpoCrearReporte {
  id?: string;
  tipoId: string;
  descripcion: string | null;
  audioUrl: string | null;
  fotos: { id?: string; url: string }[];
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  direccion: string;
  creadoEn: string;
}

/**
 * Sube los archivos pendientes y guarda cada URL remota en SQLite
 * inmediatamente después de recibirla.
 */
async function subirFotosPendientes(
  reporte: Reporte,
): Promise<{
  urlPrincipal: string | null;
  urlSecundaria: string | null;
  urlAudio: string | null;
}> {
  let progreso: Reporte = { ...reporte };

  if (
    !progreso.fotoPrincipalUrlRemota &&
    progreso.fotoPrincipalUrlLocal
  ) {
    const url = await subirArchivo(
      progreso.fotoPrincipalUrlLocal,
    );

    progreso = {
      ...progreso,
      fotoPrincipalUrlRemota: url,
    };

    await guardarReporte(progreso);
  }

  if (
    !progreso.fotoSecundariaUrlRemota &&
    progreso.fotoSecundariaUrlLocal
  ) {
    const url = await subirArchivo(
      progreso.fotoSecundariaUrlLocal,
    );

    progreso = {
      ...progreso,
      fotoSecundariaUrlRemota: url,
    };

    await guardarReporte(progreso);
  }

  if (
    !progreso.descripcionAudioUrlRemota &&
    progreso.descripcionAudioUrlLocal
  ) {
    const url = await subirArchivo(
      progreso.descripcionAudioUrlLocal,
    );

    progreso = {
      ...progreso,
      descripcionAudioUrlRemota: url,
    };

    await guardarReporte(progreso);
  }

  return {
    urlPrincipal: progreso.fotoPrincipalUrlRemota,
    urlSecundaria: progreso.fotoSecundariaUrlRemota,
    urlAudio: progreso.descripcionAudioUrlRemota,
  };
}

/** Deja el reporte en la cola local para subirlo más tarde. */
async function dejarPendiente(
  reporte: Reporte,
): Promise<Reporte> {
  const pendiente: Reporte = {
    ...reporte,
    sincronizado: false,
    esPublico: false,
  };

  await guardarReporte(pendiente);

  return pendiente;
}

export async function enviarReporte(
  reporte: Reporte,
): Promise<Reporte> {
  try {
    // Si no hay conexión, se utiliza el catálogo local.
    const tipos = await obtenerTiposDeReporte();

    if (tipos.length === 0) {
      return await dejarPendiente(reporte);
    }

    const tipoId = await tipoIdDesdeNombre(reporte.tipo);

    if (!tipoId) {
      throw new Error(
        "No se pudo identificar el tipo de problema.",
      );
    }

    const {
      urlPrincipal,
      urlSecundaria,
      urlAudio,
    } = await subirFotosPendientes(reporte);

    const fotos = [urlPrincipal, urlSecundaria]
      .filter((url): url is string => url !== null)
      .map((url) => ({ url }));

    console.log("COORDENADAS QUE SE ENVÍAN A LA API:", {
      id: reporte.id,
      latitud: reporte.latitud,
      longitud: reporte.longitud,
      direccion: reporte.direccionDescripcion,
    });

    const cuerpo: CuerpoCrearReporte = {
      id: reporte.id.startsWith("rep-")
        ? reporte.id
        : undefined,

      tipoId,
      descripcion: reporte.descripcionTexto,
      audioUrl: urlAudio,
      fotos,

      coordenadas: {
        latitud: reporte.latitud,
        longitud: reporte.longitud,
      },

      direccion: reporte.direccionDescripcion,
      creadoEn:
        reporte.cambios[0]?.fecha ??
        new Date().toISOString(),
    };

    const api = await apiUno<ReporteApi>(
      "/reportes",
      {
        method: "POST",
        body: cuerpo,
      },
    );

    const catalogo = await cargarCatalogo();

    const sincronizado = traducirReporte(
      api,
      catalogo,
      reporte.cambios,
      false,
    );

    const direccionRemota =
      sincronizado.direccionDescripcion?.trim();

    const direccionLocal =
      reporte.direccionDescripcion?.trim();

    const direccionRemotaPendiente =
      !direccionRemota ||
      direccionRemota.toLowerCase() ===
        "dirección pendiente de identificar";

    const direccionLocalValida =
      !!direccionLocal &&
      direccionLocal.toLowerCase() !==
        "dirección pendiente de identificar";

    // Combinamos los datos del servidor con los archivos originales.
    const reporteFinal: Reporte = {
      ...reporte,
      ...sincronizado,

      fotoPrincipalUrlLocal:
        reporte.fotoPrincipalUrlLocal,

      fotoSecundariaUrlLocal:
        reporte.fotoSecundariaUrlLocal,

      descripcionAudioUrlLocal:
        reporte.descripcionAudioUrlLocal,

      fotoArregloUrlLocal:
        reporte.fotoArregloUrlLocal,

      fotoPrincipalUrlRemota:
        sincronizado.fotoPrincipalUrlRemota ??
        reporte.fotoPrincipalUrlRemota,

      fotoSecundariaUrlRemota:
        sincronizado.fotoSecundariaUrlRemota ??
        reporte.fotoSecundariaUrlRemota,

      descripcionAudioUrlRemota:
        sincronizado.descripcionAudioUrlRemota ??
        reporte.descripcionAudioUrlRemota,

      direccionDescripcion:
        direccionRemotaPendiente && direccionLocalValida
          ? direccionLocal
          : sincronizado.direccionDescripcion,

      sincronizado: true,
    };

    // Si la API cambió el identificador, eliminamos el registro anterior.
    if (api.id !== reporte.id) {
      await eliminarReporte(reporte.id);
    }

    await guardarReporte(reporteFinal);

    return reporteFinal;
  } catch (error) {
    if (error instanceof ErrorDeRed) {
      // Recuperamos el progreso de los archivos que ya se subieron.
      const guardado = await obtenerReportePorId(
        reporte.id,
      );

      return dejarPendiente(guardado ?? reporte);
    }

    throw error;
  }
}

/**
 * Intenta sincronizar todos los reportes que todavía están pendientes.
 */
export async function sincronizarPendientes(): Promise<void> {
  const locales = await obtenerReportes();

  const pendientes = locales.filter(
    (r) => !r.sincronizado,
  );

  for (const reporte of pendientes) {
    try {
      console.log(
        "Iniciando sincronización del reporte:",
        reporte.id,
      );

      const resultado = await enviarReporte(reporte);

      console.log("COORDENADAS DEL REPORTE:", {
        id: reporte.id,
        latitud: reporte.latitud,
        longitud: reporte.longitud,
      });

      if (resultado.sincronizado) {
        console.log(
          "Reporte sincronizado correctamente:",
          reporte.id,
        );
      } else {
        console.warn(
          "El reporte continúa pendiente:",
          reporte.id,
        );
      }
    } catch (error) {
      console.error(
        "ERROR AL SINCRONIZAR EL REPORTE:",
        reporte.id,
        error,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Ubicación y reportes cercanos
// ---------------------------------------------------------------------------

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaEnMetros(
  latitudA: number,
  longitudA: number,
  latitudB: number,
  longitudB: number,
): number {
  const radioTierra = 6371000;

  const aRadianes = (grados: number) =>
    (grados * Math.PI) / 180;

  const deltaLat = aRadianes(
    latitudB - latitudA,
  );

  const deltaLon = aRadianes(
    longitudB - longitudA,
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(aRadianes(latitudA)) *
      Math.cos(aRadianes(latitudB)) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    radioTierra *
    Math.asin(Math.sqrt(a))
  );
}

/** Reportes públicos abiertos a menos de `radioMetros` del punto dado. */
export async function obtenerReportesCercanos(
  latitud: number,
  longitud: number,
  radioMetros = 50,
): Promise<Reporte[]> {
  try {
    const catalogo = await cargarCatalogo();

    const cercanos = await apiLista<ReporteApi>(
      "/reportes/cercanos",
      {
        conSesion: false,
        params: {
          latitud,
          longitud,
          radioMetros,
        },
      },
    );

    return cercanos.map((api) =>
      traducirReporte(
        api,
        catalogo,
        [],
        false,
      ),
    );
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
        .filter(
          (item) => item.distancia <= radioMetros,
        )
        .sort(
          (a, b) => a.distancia - b.distancia,
        )
        .map((item) => item.reporte);
    }

    throw error;
  }
}
