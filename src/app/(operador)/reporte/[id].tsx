import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { nombreEstado } from "@/constants/estados";
import { ErrorApi } from "@/services/api";
import {
  agregarFotoArreglo,
  asignarCuadrilla,
  cambiarEstadoReporte,
  marcarDuplicado,
  obtenerCuadrillas,
  obtenerReporteOperador,
  obtenerReportePorCodigo,
} from "@/services/operador";
import { ESTADO_HACIA_API } from "@/services/reportes";
import type { CuadrillaApi } from "@/tipos/api";
import type { EstadoReporte, Reporte } from "@/tipos/reporte";

// Máquina de estados del PRD (D3): "asignado" no está acá porque
// sólo se alcanza asignando una cuadrilla.
const TRANSICIONES: Record<EstadoReporte, EstadoReporte[]> = {
  RECIBIDO: ["EN_REVISION", "RECHAZADO"],
  EN_REVISION: ["RECHAZADO"],
  ASIGNADO_CUADRILLA: ["RESUELTO", "EN_REVISION", "RECHAZADO"],
  RESUELTO: [],
  RECHAZADO: [],
};

export default function DetalleOperadorReporteScreen() {
  const parametros = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [comentario, setComentario] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [cuadrillas, setCuadrillas] = useState<CuadrillaApi[] | null>(null);
  const [codigoOriginal, setCodigoOriginal] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarReporte() {
      try {
        if (!id) {
          setReporte(null);
          return;
        }

        const resultado = await obtenerReporteOperador(id);

        if (activo) {
          setReporte(resultado);
        }
      } catch (error) {
        console.error("Error al cargar el reporte del operador:", error);

        if (activo) {
          setMensaje("No se pudo cargar el reporte.");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarReporte();

    return () => {
      activo = false;
    };
  }, [id]);

  function mensajeDeError(error: unknown, fallback: string): string {
    if (error instanceof ErrorApi) return error.message;
    console.error(fallback, error);
    return fallback;
  }

  async function cambiarEstado(nuevoEstado: EstadoReporte) {
    if (!reporte || guardando) return;

    if (nuevoEstado === "RECHAZADO" && !comentario.trim()) {
      setMensaje("Para rechazar tenés que escribir el motivo.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const actualizado = await cambiarEstadoReporte(
        reporte.id,
        ESTADO_HACIA_API[nuevoEstado],
        comentario.trim() || undefined,
      );
      setReporte(actualizado);
      setComentario("");
      setMensaje("Estado actualizado en el servidor.");
    } catch (error) {
      setMensaje(
        mensajeDeError(
          error,
          "No se pudo guardar el cambio. Volvé a intentarlo.",
        ),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cargarCuadrillas() {
    if (!reporte) return;

    setGuardando(true);
    setMensaje("");

    try {
      setCuadrillas(await obtenerCuadrillas(reporte.zonaId));
    } catch (error) {
      setMensaje(
        mensajeDeError(error, "No se pudieron cargar las cuadrillas."),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function elegirCuadrilla(cuadrillaId: string) {
    if (!reporte || guardando) return;

    setGuardando(true);
    setMensaje("");

    try {
      const actualizado = await asignarCuadrilla(
        reporte.id,
        cuadrillaId,
        comentario.trim() || undefined,
      );
      setReporte(actualizado);
      setCuadrillas(null);
      setComentario("");
      setMensaje("Cuadrilla asignada: el reporte pasó a asignado.");
    } catch (error) {
      setMensaje(mensajeDeError(error, "No se pudo asignar la cuadrilla."));
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarDuplicado() {
    if (!reporte || guardando || !codigoOriginal.trim()) return;

    setGuardando(true);
    setMensaje("");

    try {
      const original = await obtenerReportePorCodigo(codigoOriginal.trim());
      const actualizado = await marcarDuplicado(reporte.id, original.id);
      setReporte(actualizado);
      setCodigoOriginal("");
      setMensaje(
        `Marcado como duplicado de ${original.codigoSeguimiento}. El vecino quedó sumado al original.`,
      );
    } catch (error) {
      setMensaje(mensajeDeError(error, "No se pudo marcar como duplicado."));
    } finally {
      setGuardando(false);
    }
  }

  async function sacarFotoArreglo() {
    if (!reporte || subiendoFoto) return;

    const resultado = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (resultado.canceled || !resultado.assets[0]) return;

    setSubiendoFoto(true);
    setMensaje("");

    try {
      const actualizado = await agregarFotoArreglo(
        reporte.id,
        resultado.assets[0].uri,
      );
      setReporte(actualizado);
      setMensaje("Foto del arreglo subida.");
    } catch (error) {
      setMensaje(
        mensajeDeError(error, "No se pudo subir la foto del arreglo."),
      );
    } finally {
      setSubiendoFoto(false);
    }
  }

  if (cargando) {
    return (
      <ThemedView style={styles.contenedor}>
        <ActivityIndicator size="large" />
        <ThemedText>Cargando reporte...</ThemedText>
      </ThemedView>
    );
  }

  if (!reporte) {
    return (
      <ThemedView style={styles.contenedor}>
        <ThemedText type="title">Reporte no encontrado</ThemedText>
        <ThemedText>
          No encontramos un reporte guardado con ese identificador.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="title">Gestionar reporte</ThemedText>

        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">{reporte.tipo}</ThemedText>
          <ThemedText>
            Código de seguimiento: {reporte.codigoSeguimiento}
          </ThemedText>
          <ThemedText>ID del reporte: {reporte.id}</ThemedText>
          <ThemedText>
            Descripción: {reporte.descripcionTexto || "Sin descripción"}
          </ThemedText>
          <ThemedText>Dirección: {reporte.direccionDescripcion}</ThemedText>
          <ThemedText>
            Estado actual: {nombreEstado(reporte.estadoActual)}
          </ThemedText>
          <ThemedText>
            {reporte.vecinosSumados} vecinos se sumaron a este reclamo
          </ThemedText>
          {reporte.duplicadoDe ? (
            <ThemedText>
              Marcado como duplicado de {reporte.duplicadoDe}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText type="subtitle">Comentario del cambio</ThemedText>
        <ThemedText>Es obligatorio si vas a rechazar el reporte.</ThemedText>

        <TextInput
          value={comentario}
          onChangeText={setComentario}
          placeholder="Escribí un comentario para el historial"
          multiline
          editable={!guardando}
          style={styles.campoComentario}
        />

        {TRANSICIONES[reporte.estadoActual].length > 0 ? (
          <>
            <ThemedText type="subtitle">Cambiar estado</ThemedText>

            {TRANSICIONES[reporte.estadoActual].map((estado) => (
              <Pressable
                key={estado}
                accessibilityRole="button"
                disabled={guardando}
                onPress={() => cambiarEstado(estado)}
                style={[
                  styles.botonEstado,
                  guardando && styles.botonDeshabilitado,
                ]}
              >
                <ThemedText style={styles.textoEstado}>
                  Pasar a {nombreEstado(estado)}
                </ThemedText>
              </Pressable>
            ))}
          </>
        ) : (
          <ThemedText>
            Este reporte está cerrado: no admite más cambios de estado.
          </ThemedText>
        )}

        {(reporte.estadoActual === "EN_REVISION" ||
          reporte.estadoActual === "ASIGNADO_CUADRILLA") && (
          <>
            <ThemedText type="subtitle">
              {reporte.estadoActual === "ASIGNADO_CUADRILLA"
                ? "Reasignar cuadrilla"
                : "Asignar a una cuadrilla"}
            </ThemedText>

            {cuadrillas === null ? (
              <Pressable
                accessibilityRole="button"
                style={styles.botonEstado}
                disabled={guardando}
                onPress={cargarCuadrillas}
              >
                <ThemedText style={styles.textoEstado}>
                  Ver cuadrillas de la zona
                </ThemedText>
              </Pressable>
            ) : cuadrillas.length === 0 ? (
              <ThemedText>No hay cuadrillas activas en esta zona.</ThemedText>
            ) : (
              cuadrillas.map((cuadrilla) => (
                <Pressable
                  key={cuadrilla.id}
                  accessibilityRole="button"
                  style={styles.botonEstado}
                  disabled={guardando}
                  onPress={() => elegirCuadrilla(cuadrilla.id)}
                >
                  <ThemedText style={styles.textoEstado}>
                    {cuadrilla.nombre} — {cuadrilla.especialidad}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </>
        )}

        {!reporte.duplicadoDe &&
          reporte.estadoActual !== "RESUELTO" &&
          reporte.estadoActual !== "RECHAZADO" && (
            <>
              <ThemedText type="subtitle">Marcar como duplicado</ThemedText>
              <ThemedText>
                Ingresá el código de seguimiento del reporte original (ej.:
                GCHU-2026-00001).
              </ThemedText>

              <TextInput
                value={codigoOriginal}
                onChangeText={setCodigoOriginal}
                placeholder="Código del reporte original"
                autoCapitalize="characters"
                editable={!guardando}
                style={styles.campoCodigo}
              />

              <Pressable
                accessibilityRole="button"
                style={[
                  styles.botonEstado,
                  (guardando || !codigoOriginal.trim()) &&
                    styles.botonDeshabilitado,
                ]}
                disabled={guardando || !codigoOriginal.trim()}
                onPress={confirmarDuplicado}
              >
                <ThemedText style={styles.textoEstado}>
                  Confirmar duplicado
                </ThemedText>
              </Pressable>
            </>
          )}

        {(reporte.estadoActual === "ASIGNADO_CUADRILLA" ||
          reporte.estadoActual === "RESUELTO") && (
          <>
            <ThemedText type="subtitle">Foto del arreglo</ThemedText>

            {reporte.fotoArregloUrlRemota ? (
              <Image
                source={{ uri: reporte.fotoArregloUrlRemota }}
                style={styles.fotoArreglo}
                resizeMode="cover"
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              style={[
                styles.botonEstado,
                subiendoFoto && styles.botonDeshabilitado,
              ]}
              disabled={subiendoFoto}
              onPress={sacarFotoArreglo}
            >
              <ThemedText style={styles.textoEstado}>
                {subiendoFoto ? "Subiendo foto..." : "Sacar foto del arreglo"}
              </ThemedText>
            </Pressable>
          </>
        )}

        {guardando ? (
          <View style={styles.progreso}>
            <ActivityIndicator />
            <ThemedText>Guardando cambio...</ThemedText>
          </View>
        ) : null}

        {mensaje ? <ThemedText>{mensaje}</ThemedText> : null}

        <ThemedText type="subtitle">Historial de estados</ThemedText>

        {reporte.cambios.length > 0 ? (
          [...reporte.cambios].reverse().map((cambio) => (
            <View key={cambio.id} style={styles.evento}>
              <ThemedText type="subtitle">
                {nombreEstado(cambio.estado)}
              </ThemedText>
              <ThemedText>
                {new Date(cambio.fecha).toLocaleString("es-AR")}
              </ThemedText>
              {cambio.comentario ? (
                <ThemedText>{cambio.comentario}</ThemedText>
              ) : null}
            </View>
          ))
        ) : (
          <ThemedText>Todavía no hay cambios de estado registrados.</ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
  },
  contenido: {
    paddingBottom: 32,
    gap: 14,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  botonEstado: {
    borderWidth: 1,
    borderColor: "#246B45",
    borderRadius: 10,
    padding: 14,
  },
  campoCodigo: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 10,
    padding: 12,
    color: "#222222",
  },
  fotoArreglo: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  botonDeshabilitado: {
    opacity: 0.8,
  },
  textoEstado: {
    fontWeight: "600",
  },
  campoComentario: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
    color: "#222222",
  },
  progreso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  evento: {
    borderLeftWidth: 3,
    borderLeftColor: "#246B45",
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 5,
  },
});
