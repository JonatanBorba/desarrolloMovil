import AsyncStorage from "@react-native-async-storage/async-storage";
import Storage from "expo-sqlite/kv-store";

const CLAVE_ADHESIONES = "@reporte_ciudadano/adhesiones";
const CLAVE_MIGRACION = "@reporte_ciudadano/migracion_adhesiones_v1";

let promesaMigracion: Promise<void> | null = null;

/**
 * Migra las adhesiones anteriores desde AsyncStorage.
 * Conserva los datos originales y no sobrescribe valores nuevos.
 */
async function migrarAdhesiones(): Promise<void> {
  if (!promesaMigracion) {
    promesaMigracion = (async () => {
      const migracionRealizada = await Storage.getItem(CLAVE_MIGRACION);

      if (migracionRealizada === "true") return;

      const actuales = await Storage.getItem(CLAVE_ADHESIONES);

      if (actuales === null) {
        const anteriores = await AsyncStorage.getItem(CLAVE_ADHESIONES);

        if (anteriores) {
          try {
            const datos: unknown = JSON.parse(anteriores);

            if (
              Array.isArray(datos) &&
              datos.every((id) => typeof id === "string")
            ) {
              await Storage.setItem(
                CLAVE_ADHESIONES,
                JSON.stringify(datos),
              );
            }
          } catch (error) {
            console.warn("No se pudieron migrar las adhesiones:", error);
          }
        }
      }

      await Storage.setItem(CLAVE_MIGRACION, "true");
    })().catch((error) => {
      promesaMigracion = null;
      throw error;
    });
  }

  return promesaMigracion;
}

/**
 * Obtiene los identificadores de reportes a los que se adhirió el vecino.
 */
export async function obtenerIdsAdheridos(): Promise<string[]> {
  await migrarAdhesiones();

  const datos = await Storage.getItem(CLAVE_ADHESIONES);

  if (!datos) return [];

  try {
    const resultado: unknown = JSON.parse(datos);

    if (
      Array.isArray(resultado) &&
      resultado.every((id) => typeof id === "string")
    ) {
      return resultado;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Guarda los identificadores de adhesiones.
 */
export async function guardarIdsAdheridos(
  ids: string[],
): Promise<void> {
  await migrarAdhesiones();

  await Storage.setItem(CLAVE_ADHESIONES, JSON.stringify(ids));
}