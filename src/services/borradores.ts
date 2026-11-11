
import { obtenerBaseDatos } from "@/services/baseDatos";

export interface BorradorReporte {
  tipoProblema: string;
  descripcion: string;
  foto: string | null;
  fotoSecundaria: string | null;
  audioUri: string | null;
  coordenadas: {
    latitude: number;
    longitude: number;
  } | null;
  direccion: string;
}

/**
 * Guarda o actualiza el borrador del formulario de nuevo reporte.
 */
export async function guardarBorrador(
  borrador: BorradorReporte,
): Promise<void> {
  const db = await obtenerBaseDatos();

  await db.runAsync(
    `INSERT INTO borradores (id, datos, actualizado_en)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       datos = excluded.datos,
       actualizado_en = excluded.actualizado_en`,
    "nuevo-reporte",
    JSON.stringify(borrador),
    new Date().toISOString(),
  );
}

/**
 * Recupera el borrador guardado en el dispositivo.
 */
export async function obtenerBorrador(): Promise<BorradorReporte | null> {
  const db = await obtenerBaseDatos();

  const fila = await db.getFirstAsync<{ datos: string }>(
    "SELECT datos FROM borradores WHERE id = ?",
    "nuevo-reporte",
  );

  if (!fila) return null;

  try {
    return JSON.parse(fila.datos) as BorradorReporte;
  } catch {
    return null;
  }
}

/**
 * Elimina el borrador después de guardar el reporte.
 */
export async function eliminarBorrador(): Promise<void> {
  const db = await obtenerBaseDatos();

  await db.runAsync(
    "DELETE FROM borradores WHERE id = ?",
    "nuevo-reporte",
  );
}
