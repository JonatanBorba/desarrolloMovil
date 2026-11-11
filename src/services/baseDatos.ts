import * as SQLite from "expo-sqlite";

let promesaBaseDatos: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre la base de datos local y prepara sus tablas.
 * La misma conexión se reutiliza durante toda la ejecución de la app.
 */
export async function obtenerBaseDatos(): Promise<SQLite.SQLiteDatabase> {
  if (!promesaBaseDatos) {
    promesaBaseDatos = (async () => {
      const db = await SQLite.openDatabaseAsync("reporte-ciudadano.db");

      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS reportes (
          id TEXT PRIMARY KEY NOT NULL,
          datos TEXT NOT NULL,
          orden INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS indice_reportes_orden
        ON reportes (orden DESC);

        CREATE TABLE IF NOT EXISTS borradores (
          id TEXT PRIMARY KEY NOT NULL,
          datos TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS migraciones (
          id TEXT PRIMARY KEY NOT NULL,
          completada_en TEXT NOT NULL
        );
      `);

      return db;
    })().catch((error) => {
      promesaBaseDatos = null;
      throw error;
    });
  }

  return promesaBaseDatos;
}