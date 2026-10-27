
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Reporte } from '@/tipos/reporte';

const CLAVE_REPORTES = '@reporte_ciudadano/reportes';

/**
 * Obtiene todos los reportes guardados en el dispositivo.
 */
export async function obtenerReportes(): Promise<Reporte[]> {
  const datos = await AsyncStorage.getItem(CLAVE_REPORTES);

  if (!datos) {
    return [];
  }

  try {
    const reportes: Reporte[] = JSON.parse(datos);
    return reportes;
  } catch (error) {
    console.error('Error al leer los reportes guardados:', error);
    throw new Error('No se pudieron leer los reportes guardados.');
  }
}

/**
 * Guarda un reporte nuevo o actualiza uno que ya existe.
 */
export async function guardarReporte(reporte: Reporte): Promise<void> {
  const reportes = await obtenerReportes();

  const indice = reportes.findIndex(
    (item) => item.id === reporte.id
  );

  if (indice >= 0) {
    reportes[indice] = reporte;
  } else {
    reportes.unshift(reporte);
  }

  await AsyncStorage.setItem(
    CLAVE_REPORTES,
    JSON.stringify(reportes)
  );
}

/**
 * Busca un reporte por su identificador.
 */
export async function obtenerReportePorId(
  id: string
): Promise<Reporte | null> {
  const reportes = await obtenerReportes();

  return reportes.find((reporte) => reporte.id === id) ?? null;
}

/**
 * Elimina un reporte guardado por su identificador.
 */
export async function eliminarReporte(id: string): Promise<void> {
  const reportes = await obtenerReportes();

  const reportesActualizados = reportes.filter(
    (reporte) => reporte.id !== id
  );

  await AsyncStorage.setItem(
    CLAVE_REPORTES,
    JSON.stringify(reportesActualizados)
  );
}
