import { openDatabaseSync } from "expo-sqlite";

import type { Reporte } from "@/tipos/reporte";

/**
 * Persistencia local de reportes con expo-sqlite (punto 7): la app abre y
 * muestra los datos guardados aunque no haya conexión.
 */
const db = openDatabaseSync("reporte-ciudadano.db");

db.execSync(`
  CREATE TABLE IF NOT EXISTS reportes (
    id TEXT PRIMARY KEY NOT NULL,
    datos TEXT NOT NULL
  );
`);

function parsearFila(datos: string): Reporte | null {
  try {
    return JSON.parse(datos) as Reporte;
  } catch {
    return null;
  }
}

/**
 * Obtiene todos los reportes guardados en el dispositivo, del más nuevo
 * al más viejo (los que se actualizan conservan su posición).
 */
export async function obtenerReportes(): Promise<Reporte[]> {
  try {
    const filas = db.getAllSync<{ datos: string }>(
      "SELECT datos FROM reportes ORDER BY rowid DESC",
    );
    return filas
      .map((fila) => parsearFila(fila.datos))
      .filter((reporte): reporte is Reporte => reporte !== null);
  } catch (error) {
    console.error("Error al leer los reportes guardados:", error);
    throw new Error("No se pudieron leer los reportes guardados.");
  }
}

/**
 * Guarda un reporte nuevo o actualiza uno que ya existe.
 */
export async function guardarReporte(reporte: Reporte): Promise<void> {
  const existe = db.getFirstSync<{ id: string }>(
    "SELECT id FROM reportes WHERE id = ?",
    reporte.id,
  );

  if (existe) {
    db.runSync(
      "UPDATE reportes SET datos = ? WHERE id = ?",
      JSON.stringify(reporte),
      reporte.id,
    );
  } else {
    db.runSync(
      "INSERT INTO reportes (id, datos) VALUES (?, ?)",
      reporte.id,
      JSON.stringify(reporte),
    );
  }
}

/**
 * Busca un reporte por su identificador.
 */
export async function obtenerReportePorId(id: string): Promise<Reporte | null> {
  const fila = db.getFirstSync<{ datos: string }>(
    "SELECT datos FROM reportes WHERE id = ?",
    id,
  );
  return fila ? parsearFila(fila.datos) : null;
}

/**
 * Elimina un reporte guardado por su identificador.
 */
export async function eliminarReporte(id: string): Promise<void> {
  db.runSync("DELETE FROM reportes WHERE id = ?", id);
}
