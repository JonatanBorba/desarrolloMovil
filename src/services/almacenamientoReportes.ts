import AsyncStorage from "@react-native-async-storage/async-storage";

import { obtenerBaseDatos } from "@/services/baseDatos";
import type { Reporte } from "@/tipos/reporte";

const CLAVE_REPORTES = "@reporte_ciudadano/reportes";
const MIGRACION_REPORTES = "asyncstorage_reportes_sqlite_v1";

let promesaMigracion: Promise<void> | null = null;

/**
 * Migra los reportes existentes desde AsyncStorage a SQLite.
 * No elimina los datos originales, para permitir una recuperación.
 */
async function migrarReportesAnteriores(): Promise<void> {
  if (!promesaMigracion) {
    promesaMigracion = (async () => {
      const db = await obtenerBaseDatos();

      const migracion = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM migraciones WHERE id = ?",
        MIGRACION_REPORTES,
      );

      if (migracion) return;

      const datosAnteriores = await AsyncStorage.getItem(CLAVE_REPORTES);

      let reportesAnteriores: Reporte[] = [];

      if (datosAnteriores) {
        const datosParseados: unknown = JSON.parse(datosAnteriores);

        if (!Array.isArray(datosParseados)) {
          throw new Error(
            "Los reportes anteriores tienen un formato inválido.",
          );
        }

        reportesAnteriores = datosParseados as Reporte[];
      }

      await db.withTransactionAsync(async () => {
        for (let indice = 0; indice < reportesAnteriores.length; indice++) {
          const reporte = reportesAnteriores[indice];

          if (!reporte || typeof reporte.id !== "string") {
            continue;
          }

          await db.runAsync(
            `INSERT OR IGNORE INTO reportes (id, datos, orden)
             VALUES (?, ?, ?)`,
            reporte.id,
            JSON.stringify(reporte),
            reportesAnteriores.length - indice,
          );
        }

        await db.runAsync(
          `INSERT INTO migraciones (id, completada_en)
           VALUES (?, ?)`,
          MIGRACION_REPORTES,
          new Date().toISOString(),
        );
      });
    })().catch((error) => {
      promesaMigracion = null;
      throw error;
    });
  }

  return promesaMigracion;
}

/**
 * Obtiene todos los reportes guardados en el dispositivo.
 */
export async function obtenerReportes(): Promise<Reporte[]> {
  await migrarReportesAnteriores();

  const db = await obtenerBaseDatos();

  const filas = await db.getAllAsync<{ datos: string }>(
    "SELECT datos FROM reportes ORDER BY orden DESC",
  );

  return filas.map((fila) => JSON.parse(fila.datos) as Reporte);
}

/**
 * Guarda un reporte nuevo o actualiza uno que ya existe.
 */
export async function guardarReporte(reporte: Reporte): Promise<void> {
  await migrarReportesAnteriores();

  const db = await obtenerBaseDatos();

  const existente = await db.getFirstAsync<{ orden: number }>(
    "SELECT orden FROM reportes WHERE id = ?",
    reporte.id,
  );

  if (existente) {
    await db.runAsync(
      "UPDATE reportes SET datos = ? WHERE id = ?",
      JSON.stringify(reporte),
      reporte.id,
    );
    return;
  }

  const resultado = await db.getFirstAsync<{ maximo: number }>(
    "SELECT COALESCE(MAX(orden), 0) AS maximo FROM reportes",
  );

  const nuevoOrden = (resultado?.maximo ?? 0) + 1;

  await db.runAsync(
    `INSERT INTO reportes (id, datos, orden)
     VALUES (?, ?, ?)`,
    reporte.id,
    JSON.stringify(reporte),
    nuevoOrden,
  );
}

/**
 * Busca un reporte por su identificador.
 */
export async function obtenerReportePorId(
  id: string,
): Promise<Reporte | null> {
  await migrarReportesAnteriores();

  const db = await obtenerBaseDatos();

  const fila = await db.getFirstAsync<{ datos: string }>(
    "SELECT datos FROM reportes WHERE id = ?",
    id,
  );

  return fila ? (JSON.parse(fila.datos) as Reporte) : null;
}

/**
 * Elimina un reporte guardado por su identificador.
 */
export async function eliminarReporte(id: string): Promise<void> {
  await migrarReportesAnteriores();

  const db = await obtenerBaseDatos();

  await db.runAsync("DELETE FROM reportes WHERE id = ?", id);
}