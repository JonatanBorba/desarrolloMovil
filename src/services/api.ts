import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const hostDesdeExpo = Constants.expoConfig?.hostUri?.split(":")[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${hostDesdeExpo ?? "localhost"}:3000`;

export const TOKEN_KEY = "sessionToken";
export const ROLE_KEY = "sessionRole";
export const USER_KEY = "sessionUser";

async function leerItemSeguro(clave: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }
  return SecureStore.getItemAsync(clave);
}

async function escribirItemSeguro(clave: string, valor: string): Promise<void> {
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
  constructor(detalle?: string) {
    super(
      "No se pudo conectar con el servidor. Revisá tu conexión." +
        (detalle ? ` (${detalle})` : ""),
    );
    this.name = "ErrorDeRed";
  }
}

export interface OpcionesPeticion {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;

  conSesion?: boolean;

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
    throw new ErrorDeRed(`${API_URL}${ruta}`);
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

export async function apiUno<T>(
  ruta: string,
  opciones?: OpcionesPeticion,
): Promise<T> {
  const sobre = await pedir<SobreUno<T>>(ruta, opciones);
  return sobre.datos;
}

export async function apiLista<T>(
  ruta: string,
  opciones?: OpcionesPeticion,
): Promise<T[]> {
  const sobre = await pedir<SobreLista<T>>(ruta, opciones);
  return sobre.datos;
}

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

export async function subirArchivo(uriLocal: string): Promise<string> {
  const token = await leerItemSeguro(TOKEN_KEY);
  const mime = mimeDe(uriLocal);

  // uploadAsync envía el archivo como multipart desde el sistema de
  // archivos nativo: el FormData de fetch no acepta partes {uri} en esta
  // versión ("Unsupported FormDataPart implementation").
  let respuesta: { status: number; body: string };
  try {
    respuesta = await FileSystem.uploadAsync(`${API_URL}/archivos`, uriLocal, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "archivo",
      mimeType: mime,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) {
    throw new ErrorDeRed(
      `${API_URL}/archivos → ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const json = respuesta.body ? JSON.parse(respuesta.body) : null;

  if (respuesta.status < 200 || respuesta.status >= 300) {
    const error = (json as SobreError | null)?.error;
    throw new ErrorApi(
      error?.codigo ?? "ERROR_DESCONOCIDO",
      error?.mensaje ?? "No se pudo subir el archivo.",
    );
  }

  const sobre = json as SobreUno<ArchivoSubido>;

  return sobre.datos.url.startsWith("http")
    ? sobre.datos.url
    : `${API_URL}${sobre.datos.url}`;
}

export { escribirItemSeguro, leerItemSeguro };
