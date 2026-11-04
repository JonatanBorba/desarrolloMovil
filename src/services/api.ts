import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Capa HTTP de la app contra la API de la cátedra.
 *
 * URL base: en Expo Go, `hostUri` trae la IP de la PC que sirve el bundle
 * (la misma donde corre `pnpm dev`), así no hay que hardcodear la IP.
 * Sobreescribible con EXPO_PUBLIC_API_URL si hiciera falta.
 */
const hostDesdeExpo = Constants.expoConfig?.hostUri?.split(":")[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${hostDesdeExpo ?? "localhost"}:3000`;

// Mismas claves que usa services/auth.ts para persistir la sesión.
export const TOKEN_KEY = "sessionToken";
export const ROLE_KEY = "sessionRole";
export const USER_KEY = "sessionUser";

async function leerItemSeguro(clave: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }
  return SecureStore.getItemAsync(clave);
}

async function escribirItemSeguro(
  clave: string,
  valor: string,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await SecureStore.setItemAsync(clave, valor);
}

export async function borrarItemSeguro(clave: string): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await SecureStore.deleteItemAsync(clave);
}

// ---------------------------------------------------------------------------
// Sobre de respuesta de la API: { datos, meta } | { error: { codigo, mensaje } }
// ---------------------------------------------------------------------------

interface SobreLista<T> {
  datos: T[];
  meta: { total: number; pagina: number; porPagina: number };
}

interface SobreUno<T> {
  datos: T;
  meta: null;
}

interface SobreError {
  error: { codigo: string; mensaje: string };
}

/** Error con el código y mensaje que manda la API. */
export class ErrorApi extends Error {
  codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
  }
}

/** Error de red: la API no respondió (servidor apagado, sin señal, otra red). */
export class ErrorDeRed extends Error {
  constructor() {
    super("No se pudo conectar con el servidor. Revisá tu conexión.");
    this.name = "ErrorDeRed";
  }
}

export interface OpcionesPeticion {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** true si el endpoint necesita el token (🔒). Default: true. */
  conSesion?: boolean;
  /** Parámetros de query (?tipoId=...&estado=...). Se omiten los undefined. */
  params?: Record<string, string | number | undefined>;
}

async function pedir<T>(
  ruta: string,
  opciones: OpcionesPeticion = {},
): Promise<T> {
  const { method = "GET", body, conSesion = true, params } = opciones;

  const query = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (conSesion) {
    const token = await leerItemSeguro(TOKEN_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}${query}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorDeRed();
  }

  const texto = await respuesta.text();
  const json = texto ? JSON.parse(texto) : null;

  if (!respuesta.ok) {
    const error = (json as SobreError | null)?.error;
    throw new ErrorApi(
      error?.codigo ?? "ERROR_DESCONOCIDO",
      error?.mensaje ?? "Ocurrió un error inesperado.",
    );
  }

  return json as T;
}

/** GET/POST/… que devuelve un recurso único ({ datos, meta: null }). */
export async function apiUno<T>(
  ruta: string,
  opciones?: OpcionesPeticion,
): Promise<T> {
  const sobre = await pedir<SobreUno<T>>(ruta, opciones);
  return sobre.datos;
}

/** GET que devuelve una lista paginada ({ datos: [...], meta }). */
export async function apiLista<T>(
  ruta: string,
  opciones?: OpcionesPeticion,
): Promise<T[]> {
  const sobre = await pedir<SobreLista<T>>(ruta, opciones);
  return sobre.datos;
}

// ---------------------------------------------------------------------------
// Archivos (fotos y audios)
// ---------------------------------------------------------------------------

interface ArchivoSubido {
  url: string;
  tipo: "imagen" | "audio" | "video";
  bytes: number;
}

function extensionDe(uri: string): string {
  const limpio = uri.split("?")[0];
  return limpio.split(".").pop()?.toLowerCase() ?? "jpg";
}

function mimeDe(uri: string): string {
  switch (extensionDe(uri)) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "mp3":
      return "audio/mpeg";
    case "mp4":
      return "video/mp4";
    default:
      return "image/jpeg";
  }
}

/**
 * Sube un archivo local (file://) a POST /archivos y devuelve la URL
 * que hay que mandar en el recurso (fotos, audioUrl).
 */
export async function subirArchivo(uriLocal: string): Promise<string> {
  const token = await leerItemSeguro(TOKEN_KEY);
  const mime = mimeDe(uriLocal);

  const datos = new FormData();
  // React Native: el "archivo" viaja como objeto { uri, name, type }.
  datos.append("archivo", {
    uri: uriLocal,
    name: `subida.${extensionDe(uriLocal)}`,
    type: mime,
  } as unknown as Blob);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/archivos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: datos,
    });
  } catch {
    throw new ErrorDeRed();
  }

  const json = await respuesta.json();

  if (!respuesta.ok) {
    const error = (json as SobreError | null)?.error;
    throw new ErrorApi(
      error?.codigo ?? "ERROR_DESCONOCIDO",
      error?.mensaje ?? "No se pudo subir el archivo.",
    );
  }

  const sobre = json as SobreUno<ArchivoSubido>;
  // La API devuelve una URL relativa o absoluta; la normalizamos a absoluta.
  return sobre.datos.url.startsWith("http")
    ? sobre.datos.url
    : `${API_URL}${sobre.datos.url}`;
}

export { leerItemSeguro, escribirItemSeguro };
