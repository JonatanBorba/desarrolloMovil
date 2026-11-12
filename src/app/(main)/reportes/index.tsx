import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { colorEstado, nombreEstado } from "@/constants/estados";
import {
  avisosHabilitados,
  guardarPreferenciaAvisos,
} from "@/services/notificaciones";
import { obtenerMisReportes, sincronizarPendientes } from "@/services/reportes";
import type { Reporte } from "@/tipos/reporte";

function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-AR");
}

export default function MisReportesScreen() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [avisos, setAvisos] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError(false);

    try {
      // Los reportes creados sin conexión se suben solos acá.
      await sincronizarPendientes();
      const [propios, avisosActivos] = await Promise.all([
        obtenerMisReportes(),
        avisosHabilitados(),
      ]);
      setReportes(propios);
      setAvisos(avisosActivos);
    } catch (e) {
      console.error("Error al cargar Mis reportes:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  const cambiarAvisos = useCallback(async (valor: boolean) => {
    setAvisos(valor);
    await guardarPreferenciaAvisos(valor);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarReportes();
    }, [cargarReportes]),
  );

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Mis reportes</ThemedText>

      <View style={styles.fila}>
        <ThemedText>Recibir avisos</ThemedText>
        <Switch
          value={avisos}
          onValueChange={(valor) => {
            void cambiarAvisos(valor);
          }}
        />
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" />
          <ThemedText> Cargando reportes...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <ThemedText>No se pudieron cargar los reportes guardados.</ThemedText>
        </View>
      ) : reportes.length === 0 ? (
        <View style={styles.centrado}>
          <ThemedText>
            Todavía no tenés reportes guardados en este dispositivo.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={styles.lista}
          data={reportes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contenidoLista}
          renderItem={({ item }) => (
            <Pressable
              style={styles.tarjeta}
              onPress={() =>
                router.push({
                  pathname: "/reportes/[id]",
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.fila}>
                <ThemedText type="subtitle">{item.tipo}</ThemedText>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colorEstado(item.estadoActual) },
                  ]}
                >
                  <ThemedText style={styles.chipTexto}>
                    {nombreEstado(item.estadoActual)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText>Código: {item.codigoSeguimiento}</ThemedText>

              <ThemedText>
                {item.descripcionTexto || "Sin descripción escrita"}
              </ThemedText>

              <ThemedText>Ubicación: {item.direccionDescripcion}</ThemedText>

              <View style={styles.fila}>
                <ThemedText>
                  {fechaCorta(item.cambios[0]?.fecha ?? "")}
                </ThemedText>

                {item.vecinosSumados > 0 && (
                  <ThemedText>
                    {item.vecinosSumados}{" "}
                    {item.vecinosSumados === 1
                      ? "vecino se sumó"
                      : "vecinos se sumaron"}
                  </ThemedText>
                )}
              </View>

              {!item.sincronizado && (
                <ThemedText style={styles.pendiente}>
                  Pendiente de sincronización
                </ThemedText>
              )}
            </Pressable>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
  },
  lista: {
    flex: 1,
    marginTop: 16,
  },
  contenidoLista: {
    paddingBottom: 24,
    gap: 12,
  },
  tarjeta: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#888888",
    gap: 8,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  pendiente: {
    color: "#C1440E",
    fontWeight: "bold",
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
