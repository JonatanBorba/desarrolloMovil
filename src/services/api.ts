import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";

import * as ImageManipulator from "expo-image-manipulator";
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
  constructor() {
    super("No se pudo conectar con el servidor. Revisá tu conexión.");
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
    } catch (error) {
    console.error("FALLÓ LA PETICIÓN A LA API:", ruta, error);
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
  const MAX_BYTES = 5 * 1024 * 1024;

  let uriParaSubir = uriLocal;
  let extension = extensionDe(uriLocal);

  const extensionOriginal = extension.toLowerCase();
  const esImagen = ["jpg", "jpeg", "png", "webp"].includes(
    extensionOriginal,
  );

  const archivoOriginal = new File(uriLocal);

  // Comprimir solamente imágenes que superen los 5 MB.
  if (esImagen && archivoOriginal.size > MAX_BYTES) {
    console.log(
      "Comprimiendo imagen:",
      (archivoOriginal.size / 1024 / 1024).toFixed(2),
      "MB",
    );

    const intentos = [
      { width: 1600, compress: 0.7 },
      { width: 1200, compress: 0.55 },
      { width: 900, compress: 0.4 },
      { width: 700, compress: 0.3 },
    ];

    let comprimidaCorrectamente = false;

    for (const intento of intentos) {
      const resultado = await ImageManipulator.manipulateAsync(
        uriLocal,
        [{ resize: { width: intento.width } }],
        {
          compress: intento.compress,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const archivoComprimido = new File(resultado.uri);

      console.log(
        "Resultado de compresión:",
        (archivoComprimido.size / 1024 / 1024).toFixed(2),
        "MB",
      );

      if (archivoComprimido.size <= MAX_BYTES) {
        uriParaSubir = resultado.uri;
        extension = "jpg";
        comprimidaCorrectamente = true;
        break;
      }
    }

    if (!comprimidaCorrectamente) {
      throw new ErrorApi(
        "ARCHIVO_DEMASIADO_GRANDE",
        "No se pudo reducir la foto a menos de 5 MB. Probá con otra fotografía.",
      );
    }
  }

  const archivo = new File(uriParaSubir);
  const datos = new FormData();

  datos.append("archivo", archivo, `subida.${extension}`);

  let respuesta: Response;

  try {
    respuesta = await expoFetch(`${API_URL}/archivos`, {
      method: "POST",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      body: datos,
    });
  } catch (error) {
    console.error("FALLÓ LA SUBIDA DEL ARCHIVO:", uriParaSubir, error);
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

  return sobre.datos.url.startsWith("http")
    ? sobre.datos.url
    : `${API_URL}${sobre.datos.url}`;
}



export { escribirItemSeguro, leerItemSeguro };
